/**
 * GlobalScope — Global Chat System
 *
 * WebSocket-based real-time chat with:
 * - Topic-based channels (global, politics, finance, tech, crisis, sports)
 * - Email-verified login (magic code sent to email)
 * - AI bot (@pulse) that answers questions about world events
 * - Rate limiting and anti-spam
 * - In-memory message store (last 200 per channel)
 * - User presence tracking
 */

import { WebSocketServer } from 'ws';
import crypto from 'crypto';

// ============================================
// Configuration
// ============================================
const CHANNELS = [
  { id: 'global', name: 'Global', icon: '🌍', description: 'General world news discussion' },
  { id: 'politics', name: 'Politics', icon: '🏛️', description: 'Political events & analysis' },
  { id: 'finance', name: 'Finance', icon: '📈', description: 'Markets, economy & trading' },
  { id: 'tech', name: 'Tech', icon: '💻', description: 'Technology, AI & startups' },
  { id: 'crisis', name: 'Crisis', icon: '⚠️', description: 'Conflicts, disasters & emergencies' },
  { id: 'sports', name: 'Sports', icon: '⚽', description: 'Sports news & events' },
];

const MAX_MESSAGES_PER_CHANNEL = 200;
const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const RATE_LIMIT_MAX = 5; // max messages per window
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MAX_USERNAME_LENGTH = 20;
const PING_INTERVAL = 30000;

// AI Bot configuration
const AI_BOT = {
  username: 'Pulse AI',
  userId: 'ai-bot@globalpulse.system',
  color: '#3b82f6',
  icon: '🤖',
};
const AI_RATE_LIMIT_WINDOW = 30000; // 30 seconds per channel
const AI_RATE_LIMIT_MAX = 3; // max 3 AI responses per 30s per channel
const aiChannelRateLimits = new Map(); // { channelId: [timestamp, ...] }

// ============================================
// In-memory stores
// ============================================

// Channel messages: { channelId: [{ id, userId, username, content, timestamp, channel }] }
const channelMessages = new Map();
CHANNELS.forEach(ch => channelMessages.set(ch.id, []));

// Verified users: { sessionToken: { email, username, color, createdAt, lastSeen } }
const sessions = new Map();

// Pending verifications: { email: { code, expiresAt, username } }
const pendingVerifications = new Map();

// Connected clients: Set<{ ws, sessionToken, userId, username, channel }>
const connectedClients = new Set();

// Rate limiting: { sessionToken: [timestamp, timestamp, ...] }
const rateLimits = new Map();

// Recent news headlines cache (fed from frontend via WebSocket)
const recentHeadlines = new Map(); // { channelId: [headlines...] }
CHANNELS.forEach(ch => recentHeadlines.set(ch.id, []));

// Global news cache (populated from system)
let globalNewsCache = [];
let newsCacheTimestamp = 0;

// User colors palette
const USER_COLORS = [
  '#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ba68c8',
  '#4dd0e1', '#aed581', '#ff8a65', '#9575cd', '#e57373',
  '#26c6da', '#66bb6a', '#ffa726', '#ef5350', '#ab47bc',
  '#29b6f6', '#9ccc65', '#ff7043', '#7e57c2', '#ec407a',
];

// ============================================
// Utility functions
// ============================================

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

function assignColor(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function sanitizeText(text) {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9_\-\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF]{2,20}$/.test(username);
}

function checkRateLimit(sessionToken) {
  const now = Date.now();
  const timestamps = rateLimits.get(sessionToken) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  rateLimits.set(sessionToken, recent);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  return true;
}

function checkAiRateLimit(channelId) {
  const now = Date.now();
  const timestamps = aiChannelRateLimits.get(channelId) || [];
  const recent = timestamps.filter(t => now - t < AI_RATE_LIMIT_WINDOW);
  aiChannelRateLimits.set(channelId, recent);
  if (recent.length >= AI_RATE_LIMIT_MAX) return false;
  recent.push(now);
  return true;
}

function getOnlineUsers(channelId) {
  const users = [];
  const seen = new Set();
  for (const client of connectedClients) {
    if (client.channel === channelId && client.sessionToken && !seen.has(client.sessionToken)) {
      seen.add(client.sessionToken);
      const session = sessions.get(client.sessionToken);
      if (session) {
        users.push({
          username: session.username,
          color: session.color,
        });
      }
    }
  }
  // Always add AI bot to user list
  users.push({
    username: AI_BOT.username,
    color: AI_BOT.color,
    isBot: true,
  });
  return users;
}

function broadcastToChannel(channelId, message, excludeWs = null) {
  const payload = JSON.stringify(message);
  for (const client of connectedClients) {
    if (client.channel === channelId && client.ws !== excludeWs && client.ws.readyState === 1) {
      try {
        client.ws.send(payload);
      } catch (e) {
        // ignore send errors
      }
    }
  }
}

function broadcastUserList(channelId) {
  const users = getOnlineUsers(channelId);
  broadcastToChannel(channelId, {
    type: 'users',
    users,
    count: users.length,
  });
}

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_EXPIRY) {
      sessions.delete(token);
    }
  }
  for (const [email, verification] of pendingVerifications) {
    if (now > verification.expiresAt) {
      pendingVerifications.delete(email);
    }
  }
}, 60000);

// ============================================
// AI Bot — Groq/OpenRouter Integration
// ============================================

async function callAI(prompt, channelId) {
  const groqKey = process.env.GROQ_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  // Get recent channel messages for context (last 10)
  const recentMsgs = (channelMessages.get(channelId) || [])
    .slice(-10)
    .filter(m => m.userId !== AI_BOT.userId)
    .map(m => `${m.username}: ${m.content}`)
    .join('\n');

  // Get recent news context
  const newsContext = globalNewsCache.length > 0
    ? '\n\nRecent headlines:\n' + globalNewsCache.slice(0, 15).map((h, i) => `${i + 1}. ${h}`).join('\n')
    : '';

  const channelInfo = CHANNELS.find(ch => ch.id === channelId);
  const channelName = channelInfo?.name || 'General';

  const systemPrompt = `You are Pulse AI, an intelligent assistant in the GlobalScope real-time news dashboard chat room.
Current date: ${new Date().toISOString().split('T')[0]}.
Current channel: ${channelName} (${channelInfo?.description || ''}).

Your role:
- Answer questions about current world events, geopolitics, markets, technology, sports
- Provide brief, insightful analysis (2-4 sentences max)
- Be conversational but professional
- If you don't know something, say so honestly
- Reference recent news when relevant
- Stay on-topic for the channel
- NEVER use markdown headers or bullet points — write in natural conversational style
- Keep responses under 300 characters when possible, max 450 characters
- You can use emojis sparingly for emphasis

Recent chat context:
${recentMsgs || '(no recent messages)'}
${newsContext}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  // Try Groq first
  if (groqKey) {
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages,
          temperature: 0.7,
          max_tokens: 200,
          top_p: 0.9,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (resp.ok) {
        const data = await resp.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) return reply;
      }
    } catch (err) {
      console.error('[AI Bot] Groq error:', err.message);
    }
  }

  // Fallback: OpenRouter
  if (openrouterKey) {
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://globalscope.live',
          'X-Title': 'GlobalScope Chat Bot',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages,
          temperature: 0.7,
          max_tokens: 200,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (resp.ok) {
        const data = await resp.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) return reply;
      }
    } catch (err) {
      console.error('[AI Bot] OpenRouter error:', err.message);
    }
  }

  // Final fallback: no API key
  return null;
}

async function handleAiBotMention(content, channelId) {
  // Check AI rate limit
  if (!checkAiRateLimit(channelId)) {
    return 'I\'m getting a lot of questions! Please wait a moment before asking me again. 😊';
  }

  // Extract the question (remove @pulse prefix)
  const question = content
    .replace(/@pulse/gi, '')
    .replace(/^[\s,.:]+/, '')
    .trim();

  if (!question) {
    return 'Hey! Ask me anything about world events, markets, tech, or geopolitics. Just type @pulse followed by your question. 🌍';
  }

  // Show typing indicator
  broadcastToChannel(channelId, {
    type: 'typing',
    username: AI_BOT.username,
  });

  const response = await callAI(question, channelId);
  if (!response) {
    return 'I\'m having trouble connecting to my brain right now. Try again in a moment! 🔧';
  }

  return sanitizeText(response);
}

function postAiMessage(channelId, content) {
  const chatMessage = {
    id: generateId(),
    userId: AI_BOT.userId,
    username: AI_BOT.username,
    color: AI_BOT.color,
    content,
    timestamp: Date.now(),
    channel: channelId,
    isBot: true,
  };

  // Store message
  const messages = channelMessages.get(channelId);
  messages.push(chatMessage);
  if (messages.length > MAX_MESSAGES_PER_CHANNEL) {
    messages.splice(0, messages.length - MAX_MESSAGES_PER_CHANNEL);
  }

  // Broadcast to channel
  broadcastToChannel(channelId, {
    type: 'message',
    message: chatMessage,
  });
}

// ============================================
// Email Sending (SMTP or console fallback)
// ============================================

async function sendVerificationEmail(email, code) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    // Use nodemailer if SMTP is configured
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: smtpPort === '465',
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"GlobalScope Chat" <${smtpUser}>`,
        to: email,
        subject: 'GlobalScope Chat — Verification Code',
        html: `
          <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #3b82f6; margin: 0 0 16px;">🌍 GlobalScope Chat</h2>
            <p style="color: #333; font-size: 14px;">Your verification code is:</p>
            <div style="background: #f0f4ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e40af;">${code}</span>
            </div>
            <p style="color: #666; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
      console.log(`[Chat] Verification email sent to ${email}`);
      return true;
    } catch (err) {
      console.error(`[Chat] Failed to send email to ${email}:`, err.message);
      return false;
    }
  } else {
    // Fallback: Log to console (development mode)
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  CHAT VERIFICATION CODE                   ║`);
    console.log(`║  Email: ${email.padEnd(32)}║`);
    console.log(`║  Code:  ${code}                            ║`);
    console.log(`╚══════════════════════════════════════════╝\n`);
    return true;
  }
}

// ============================================
// WebSocket Message Handlers
// ============================================

function handleMessage(clientInfo, data) {
  let msg;
  try {
    msg = JSON.parse(data);
  } catch {
    return send(clientInfo.ws, { type: 'error', message: 'Invalid JSON' });
  }

  switch (msg.type) {
    case 'request-code':
      return handleRequestCode(clientInfo, msg);
    case 'verify-code':
      return handleVerifyCode(clientInfo, msg);
    case 'resume-session':
      return handleResumeSession(clientInfo, msg);
    case 'join-channel':
      return handleJoinChannel(clientInfo, msg);
    case 'send-message':
      return handleSendMessage(clientInfo, msg);
    case 'typing':
      return handleTyping(clientInfo, msg);
    case 'update-news':
      return handleUpdateNews(clientInfo, msg);
    case 'pong':
      clientInfo.lastPong = Date.now();
      return;
    default:
      return send(clientInfo.ws, { type: 'error', message: 'Unknown message type' });
  }
}

function handleRequestCode(clientInfo, msg) {
  const email = (msg.email || '').trim().toLowerCase();
  const username = (msg.username || '').trim();

  if (!isValidEmail(email)) {
    return send(clientInfo.ws, { type: 'error', message: 'Invalid email address' });
  }
  if (!isValidUsername(username)) {
    return send(clientInfo.ws, {
      type: 'error',
      message: 'Username must be 2-20 characters (letters, numbers, _ or -)',
    });
  }

  // Check if username is already taken by another email
  for (const [, session] of sessions) {
    if (session.username.toLowerCase() === username.toLowerCase() && session.email !== email) {
      return send(clientInfo.ws, { type: 'error', message: 'Username already taken' });
    }
  }

  const code = generateVerificationCode();
  pendingVerifications.set(email, {
    code,
    username,
    expiresAt: Date.now() + VERIFICATION_CODE_EXPIRY,
  });

  sendVerificationEmail(email, code).then(sent => {
    if (sent) {
      send(clientInfo.ws, { type: 'code-sent', email });
    } else {
      send(clientInfo.ws, { type: 'error', message: 'Failed to send verification email. Try again.' });
    }
  });
}

function handleVerifyCode(clientInfo, msg) {
  const email = (msg.email || '').trim().toLowerCase();
  const code = (msg.code || '').trim();

  const pending = pendingVerifications.get(email);
  if (!pending) {
    return send(clientInfo.ws, { type: 'error', message: 'No pending verification. Request a new code.' });
  }
  if (Date.now() > pending.expiresAt) {
    pendingVerifications.delete(email);
    return send(clientInfo.ws, { type: 'error', message: 'Code expired. Request a new one.' });
  }
  if (pending.code !== code) {
    return send(clientInfo.ws, { type: 'error', message: 'Invalid code. Please check and try again.' });
  }

  // Code valid — create session
  pendingVerifications.delete(email);
  const sessionToken = generateSessionToken();
  const color = assignColor(email);

  sessions.set(sessionToken, {
    email,
    username: pending.username,
    color,
    createdAt: Date.now(),
    lastSeen: Date.now(),
  });

  clientInfo.sessionToken = sessionToken;
  clientInfo.username = pending.username;
  clientInfo.userId = email;

  send(clientInfo.ws, {
    type: 'verified',
    sessionToken,
    username: pending.username,
    color,
    channels: CHANNELS,
  });
}

function handleResumeSession(clientInfo, msg) {
  const token = msg.sessionToken;
  const session = sessions.get(token);
  if (!session || Date.now() - session.createdAt > SESSION_EXPIRY) {
    sessions.delete(token);
    return send(clientInfo.ws, { type: 'session-expired' });
  }

  session.lastSeen = Date.now();
  clientInfo.sessionToken = token;
  clientInfo.username = session.username;
  clientInfo.userId = session.email;

  send(clientInfo.ws, {
    type: 'session-resumed',
    username: session.username,
    color: session.color,
    channels: CHANNELS,
  });
}

function handleJoinChannel(clientInfo, msg) {
  const channelId = msg.channel;
  if (!CHANNELS.find(ch => ch.id === channelId)) {
    return send(clientInfo.ws, { type: 'error', message: 'Invalid channel' });
  }
  if (!clientInfo.sessionToken) {
    return send(clientInfo.ws, { type: 'error', message: 'Not authenticated' });
  }

  // Leave previous channel
  const prevChannel = clientInfo.channel;
  clientInfo.channel = channelId;

  // Broadcast user left previous channel
  if (prevChannel && prevChannel !== channelId) {
    broadcastUserList(prevChannel);
  }

  // Send recent messages
  const messages = channelMessages.get(channelId) || [];
  send(clientInfo.ws, {
    type: 'channel-joined',
    channel: channelId,
    messages: messages.slice(-50), // last 50
    users: getOnlineUsers(channelId),
  });

  // Broadcast updated user list
  broadcastUserList(channelId);
}

function handleSendMessage(clientInfo, msg) {
  if (!clientInfo.sessionToken) {
    return send(clientInfo.ws, { type: 'error', message: 'Not authenticated' });
  }
  if (!clientInfo.channel) {
    return send(clientInfo.ws, { type: 'error', message: 'Join a channel first' });
  }
  if (!checkRateLimit(clientInfo.sessionToken)) {
    return send(clientInfo.ws, { type: 'error', message: 'Slow down! Max 5 messages per 10 seconds.' });
  }

  let content = (msg.content || '').trim();
  if (!content || content.length > MAX_MESSAGE_LENGTH) {
    return send(clientInfo.ws, {
      type: 'error',
      message: content ? `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` : 'Empty message',
    });
  }

  content = sanitizeText(content);
  const session = sessions.get(clientInfo.sessionToken);
  if (!session) return;

  const chatMessage = {
    id: generateId(),
    userId: session.email,
    username: session.username,
    color: session.color,
    content,
    timestamp: Date.now(),
    channel: clientInfo.channel,
  };

  // Store message
  const messages = channelMessages.get(clientInfo.channel);
  messages.push(chatMessage);
  if (messages.length > MAX_MESSAGES_PER_CHANNEL) {
    messages.splice(0, messages.length - MAX_MESSAGES_PER_CHANNEL);
  }

  // Broadcast to channel (including sender for confirmation)
  broadcastToChannel(clientInfo.channel, {
    type: 'message',
    message: chatMessage,
  });

  // Check if message mentions @pulse — trigger AI bot
  if (/@pulse/i.test(content)) {
    const channelId = clientInfo.channel;
    // Async AI response (don't block)
    handleAiBotMention(content, channelId).then(reply => {
      if (reply) {
        postAiMessage(channelId, reply);
      }
    }).catch(err => {
      console.error('[AI Bot] Error:', err.message);
    });
  }
}

function handleTyping(clientInfo, msg) {
  if (!clientInfo.sessionToken || !clientInfo.channel) return;
  const session = sessions.get(clientInfo.sessionToken);
  if (!session) return;

  broadcastToChannel(clientInfo.channel, {
    type: 'typing',
    username: session.username,
  }, clientInfo.ws);
}

// Handle news update from frontend (for AI context)
function handleUpdateNews(clientInfo, msg) {
  if (msg.headlines && Array.isArray(msg.headlines)) {
    globalNewsCache = msg.headlines.slice(0, 30);
    newsCacheTimestamp = Date.now();
  }
}

function send(ws, data) {
  if (ws.readyState === 1) {
    try {
      ws.send(JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  }
}

// ============================================
// Main: Attach WebSocket to HTTP server
// ============================================

export function setupChat(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/chat' });

  console.log(`💬 Chat WebSocket ready at /ws/chat`);
  console.log(`   Channels: ${CHANNELS.map(c => c.name).join(', ')}`);
  console.log(`   AI Bot: ${AI_BOT.username} (mention @pulse to interact)`);

  wss.on('connection', (ws, req) => {
    const clientInfo = {
      ws,
      sessionToken: null,
      userId: null,
      username: null,
      channel: null,
      lastPong: Date.now(),
    };
    connectedClients.add(clientInfo);

    // Send channel list and online stats
    send(ws, {
      type: 'init',
      channels: CHANNELS,
      stats: CHANNELS.map(ch => ({
        id: ch.id,
        online: getOnlineUsers(ch.id).length,
        messageCount: (channelMessages.get(ch.id) || []).length,
      })),
      aiBot: {
        username: AI_BOT.username,
        color: AI_BOT.color,
        icon: AI_BOT.icon,
        hint: 'Type @pulse to ask AI about world events',
      },
    });

    ws.on('message', (data) => {
      try {
        handleMessage(clientInfo, data.toString());
      } catch (err) {
        console.error('[Chat] Message handler error:', err.message);
      }
    });

    ws.on('close', () => {
      const channel = clientInfo.channel;
      connectedClients.delete(clientInfo);
      if (channel) {
        broadcastUserList(channel);
      }
    });

    ws.on('error', () => {
      connectedClients.delete(clientInfo);
    });
  });

  // Ping/pong keep-alive
  setInterval(() => {
    const now = Date.now();
    for (const client of connectedClients) {
      if (now - client.lastPong > PING_INTERVAL * 2) {
        client.ws.terminate();
        connectedClients.delete(client);
        continue;
      }
      send(client.ws, { type: 'ping' });
    }
  }, PING_INTERVAL);

  return wss;
}

// REST API endpoints for chat
export function setupChatRoutes(app) {
  // Get channel list and stats
  app.get('/api/chat/channels', (req, res) => {
    res.json({
      channels: CHANNELS,
      stats: CHANNELS.map(ch => ({
        id: ch.id,
        online: getOnlineUsers(ch.id).length,
        messageCount: (channelMessages.get(ch.id) || []).length,
      })),
      aiBot: {
        username: AI_BOT.username,
        color: AI_BOT.color,
        icon: AI_BOT.icon,
        hint: 'Type @pulse to ask AI about world events',
      },
    });
  });

  // Get recent messages for a channel (public, no auth needed)
  app.get('/api/chat/messages/:channel', (req, res) => {
    const channel = req.params.channel;
    if (!CHANNELS.find(ch => ch.id === channel)) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    const messages = channelMessages.get(channel) || [];
    res.json({
      channel,
      messages: messages.slice(-50),
    });
  });

  // Update news headlines (called from system to give AI context)
  app.post('/api/chat/news', (req, res) => {
    // Accept from local or trusted sources only
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        if (body.headlines && Array.isArray(body.headlines)) {
          globalNewsCache = body.headlines.slice(0, 30);
          newsCacheTimestamp = Date.now();
          res.json({ ok: true, count: globalNewsCache.length });
        } else {
          res.status(400).json({ error: 'headlines array required' });
        }
      } catch {
        res.status(400).json({ error: 'Invalid JSON' });
      }
    });
  });
}
