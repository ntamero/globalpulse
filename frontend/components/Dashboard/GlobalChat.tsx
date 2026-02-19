'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Users, Hash } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatUser {
  username: string;
  color: string;
}

interface ChatMessage {
  id: string;
  user: ChatUser;
  text: string;
  timestamp: Date;
}

interface Channel {
  id: string;
  label: string;
  emoji: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CHANNELS: Channel[] = [
  { id: 'protests', label: 'Protests', emoji: '🔴' },
  { id: 'technology', label: 'Technology', emoji: '💻' },
  { id: 'markets', label: 'Markets', emoji: '📈' },
  { id: 'ai-tech', label: 'AI & Tech', emoji: '🤖' },
  { id: 'politics', label: 'Politics', emoji: '🏛️' },
  { id: 'general', label: 'General', emoji: '🌍' },
];

const USER_COLORS = [
  '#60a5fa', // brand-400
  '#f97316', // orange
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fb7185', // rose
  '#facc15', // yellow
  '#38bdf8', // sky
  '#c084fc', // purple
  '#4ade80', // green
  '#f472b6', // pink
  '#22d3ee', // cyan
  '#fbbf24', // amber
];

const USERS: ChatUser[] = [
  { username: 'Ahmed_Cairo', color: USER_COLORS[0] },
  { username: 'YukiTokyo', color: USER_COLORS[1] },
  { username: 'MariaLisbon', color: USER_COLORS[2] },
  { username: 'OscarBerlin', color: USER_COLORS[3] },
  { username: 'PretiSaoPaulo', color: USER_COLORS[4] },
  { username: 'LiamDublin', color: USER_COLORS[5] },
  { username: 'FatimaDubai', color: USER_COLORS[6] },
  { username: 'JinSeoul', color: USER_COLORS[7] },
  { username: 'ElenaRome', color: USER_COLORS[8] },
  { username: 'RajMumbai', color: USER_COLORS[9] },
  { username: 'SofiaBA', color: USER_COLORS[10] },
  { username: 'KwameAccra', color: USER_COLORS[11] },
  { username: 'AnnaStockholm', color: USER_COLORS[0] },
  { username: 'CarlosMexico', color: USER_COLORS[1] },
  { username: 'MeiShanghai', color: USER_COLORS[2] },
  { username: 'OlgaMoscow', color: USER_COLORS[3] },
  { username: 'TomaszWarsaw', color: USER_COLORS[4] },
  { username: 'AishaLagos', color: USER_COLORS[5] },
  { username: 'DavidSydney', color: USER_COLORS[6] },
  { username: 'NoorJakarta', color: USER_COLORS[7] },
  { username: 'ChloeVancouver', color: USER_COLORS[8] },
  { username: 'HarukiOsaka', color: USER_COLORS[9] },
];

const CHANNEL_MESSAGES: Record<string, string[]> = {
  protests: [
    'Massive turnout in the city center today, streets are completely packed.',
    'Live stream link from the main square anyone?',
    'Reports say over 50k people so far. Insane.',
    'Police seem to be holding a perimeter near the parliament.',
    'Solidarity rally announced for tomorrow in Paris.',
    'Unions have officially joined. This is getting bigger.',
    'Tear gas used near the east boulevard according to witnesses.',
    'International media is finally covering this.',
    'Footage from drone shows the full extent of the crowd.',
    'Medical volunteers needed at the south gate.',
    'Another march planned for Saturday in Berlin.',
    'Government has not issued any official statement yet.',
    'Stay safe everyone. Keep recording.',
    'Social media partially restricted in the area.',
    'Human rights orgs are monitoring the situation.',
  ],
  technology: [
    'New quantum chip breakthrough from IBM just dropped.',
    'Anyone tried the new Rust 2.0 release yet?',
    'SpaceX Starship orbital test scheduled for next week.',
    'Linux kernel 7.0 is looking really solid so far.',
    'Apple just patented a foldable display mechanism.',
    'RISC-V adoption is accelerating in the server market.',
    'The new TSMC 2nm node yields are apparently very good.',
    'Open source LLM models are getting scary good.',
    'Neuralink just received approval for expanded trials.',
    'WiFi 7 routers are finally becoming affordable.',
    'Solid-state batteries hitting production lines this year.',
    'New vulnerability found in major cloud providers. Patch asap.',
    'The next gen GPUs are going to be insane.',
    'Has anyone benchmarked the new ARM server chips?',
    'WebAssembly is changing how we think about the browser.',
  ],
  markets: [
    'S&P 500 hitting new ATH. Bears in shambles.',
    'Gold surging past $2800. Inflation fears?',
    'Fed meeting minutes coming out in 2 hours.',
    'NVIDIA earnings beat expectations by 15%.',
    'Bond yields inverting again... recession signal?',
    'Crypto market cap back above $3T.',
    'Oil prices dropping on OPEC+ production increase.',
    'Japan intervening in forex markets again.',
    'Euro weakening against the dollar this week.',
    'Tech sector rotation into value stocks happening.',
    'IPO market is heating up again this quarter.',
    'Commodities super cycle thesis gaining traction.',
    'Retail trading volume spiking on meme stocks.',
    'Central banks globally are shifting to rate cuts.',
    'Emerging markets ETFs seeing massive inflows.',
  ],
  'ai-tech': [
    'GPT-5 rumors are getting more specific. Multimodal native.',
    'Anthropic just published a major safety research paper.',
    'Open source models closing the gap with proprietary ones.',
    'AI-generated code is now 40% of new GitHub commits.',
    'New diffusion model generates 4K video in real time.',
    'Regulation debate heating up in the EU parliament.',
    'AI agents are automating entire workflows now.',
    'DeepMind just solved another protein folding challenge.',
    'The energy cost of training models is becoming a real issue.',
    'AI chip startups raising record amounts of funding.',
    'New benchmark shows reasoning capabilities improving fast.',
    'Robotics + LLMs is the next frontier.',
    'AI hallucination rates dropping significantly with new techniques.',
    'Edge AI inference is getting really fast on mobile.',
    'The copyright question for AI training data is far from settled.',
  ],
  politics: [
    'Election polls tightening in the key swing states.',
    'New trade deal signed between ASEAN and EU.',
    'UN Security Council emergency session called for tomorrow.',
    'Sanctions package being expanded by Western allies.',
    'Coalition government talks collapse in the Netherlands.',
    'New immigration policy proposal sparking heated debate.',
    'NATO summit agenda leaked, cybersecurity top priority.',
    'Climate accord targets under review this quarter.',
    'Supreme Court to hear landmark tech regulation case.',
    'Diplomatic channels reopened after months of silence.',
    'Defense spending bills advancing through congress.',
    'International observers deployed for upcoming election.',
    'New whistleblower allegations shaking up the ministry.',
    'Bilateral talks producing cautious optimism.',
    'Opposition party announces new policy platform.',
  ],
  general: [
    'Good morning from Istanbul! Beautiful sunrise today.',
    'Anyone watching the Champions League tonight?',
    'Just had the best ramen in Shibuya. Life-changing.',
    'Internet went down for 2 hours here. What did I miss?',
    'Happy to be part of this community. Great discussions.',
    'Coffee or tea? The eternal debate.',
    'Earthquake felt in central Italy, no major damage reported.',
    'Global Pulse is the best news dashboard hands down.',
    'Sending positive vibes from Buenos Aires!',
    'Is anyone else having trouble sleeping with all this news?',
    'Just discovered this platform. The real-time data is amazing.',
    'Weekend plans: hiking in the Swiss Alps.',
    'The Aurora Borealis was visible in Scotland last night!',
    'Local festival happening this week in Bangkok. So colorful.',
    'Greetings from Nairobi. Great to connect globally.',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(username: string): string {
  const parts = username.replace(/_/g, ' ').split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let messageIdCounter = 0;
function nextId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GlobalChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [inputValue, setInputValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [onlineCount] = useState(() => randomBetween(847, 2134));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelTabsRef = useRef<HTMLDivElement>(null);

  // ---- Seed initial messages per channel ----
  useEffect(() => {
    const seeded: Record<string, ChatMessage[]> = {};
    const now = Date.now();

    for (const channel of CHANNELS) {
      const pool = CHANNEL_MESSAGES[channel.id] || CHANNEL_MESSAGES.general;
      const count = randomBetween(5, 8);
      const msgs: ChatMessage[] = [];
      for (let i = 0; i < count; i++) {
        msgs.push({
          id: nextId(),
          user: pickRandom(USERS),
          text: pickRandom(pool),
          timestamp: new Date(now - (count - i) * randomBetween(15000, 60000)),
        });
      }
      seeded[channel.id] = msgs;
    }

    setMessages(seeded);
  }, []);

  // ---- Auto-generate new messages ----
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = randomBetween(3000, 8000);
      timeout = setTimeout(() => {
        // Pick a random channel to receive a message
        const channel = pickRandom(CHANNELS);
        const pool = CHANNEL_MESSAGES[channel.id] || CHANNEL_MESSAGES.general;
        const user = pickRandom(USERS);

        // Show typing indicator briefly
        if (channel.id === activeChannel) {
          setTypingUser(user.username);
        }

        const typingDelay = randomBetween(800, 2000);
        setTimeout(() => {
          setTypingUser(null);

          const newMsg: ChatMessage = {
            id: nextId(),
            user,
            text: pickRandom(pool),
            timestamp: new Date(),
          };

          setMessages((prev) => ({
            ...prev,
            [channel.id]: [...(prev[channel.id] || []), newMsg],
          }));

          // Increment unread if panel is closed or different channel
          if (!isOpen || channel.id !== activeChannel) {
            setUnreadCount((c) => c + 1);
          }
        }, typingDelay);

        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeChannel]);

  // ---- Auto-scroll to bottom on new messages in active channel ----
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeChannel, isOpen]);

  // ---- Focus input when panel opens ----
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ---- Clear unread when opening ----
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleChannelChange = useCallback((channelId: string) => {
    setActiveChannel(channelId);
    setTypingUser(null);
  }, []);

  // ---- Send message ----
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: nextId(),
      user: { username: 'You', color: '#60a5fa' },
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMsg],
    }));

    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, activeChannel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const activeMessages = messages[activeChannel] || [];

  // ---- Render ----
  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {/* ============ Chat Panel ============ */}
      <div
        className="absolute bottom-16 right-0 origin-bottom-right transition-all duration-300 ease-out"
        style={{
          width: 380,
          height: 500,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <div className="w-full h-full flex flex-col rounded-2xl bg-dark-800/95 backdrop-blur-lg border border-dark-700/60 shadow-2xl overflow-hidden">
          {/* ---- Header ---- */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Hash size={16} className="text-brand-400" />
              <span className="text-sm font-bold text-dark-100">Global Chat</span>
              <span className="flex items-center gap-1 ml-1 text-2xs text-dark-400">
                <Users size={11} className="text-green-400" />
                {onlineCount.toLocaleString()} online
              </span>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700/60 transition-colors"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* ---- Channel Tabs ---- */}
          <div
            ref={channelTabsRef}
            className="flex items-center gap-1 px-3 py-2 border-b border-dark-700/30 overflow-x-auto flex-shrink-0 scrollbar-none"
          >
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => handleChannelChange(ch.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-medium whitespace-nowrap transition-all duration-200 ${
                  activeChannel === ch.id
                    ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/40'
                }`}
              >
                <span>{ch.emoji}</span>
                <span>{ch.label}</span>
              </button>
            ))}
          </div>

          {/* ---- Messages ---- */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-3 scrollbar-dark"
          >
            {activeMessages.map((msg) => {
              const isMe = msg.user.username === 'You';
              return (
                <div
                  key={msg.id}
                  className="flex gap-2 animate-fade-in"
                >
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: isMe ? '#3b82f6' : `${msg.user.color}22`,
                      border: `1.5px solid ${isMe ? '#3b82f6' : msg.user.color}`,
                    }}
                  >
                    <span
                      className="text-2xs font-bold"
                      style={{ color: isMe ? '#fff' : msg.user.color }}
                    >
                      {isMe ? 'U' : getInitials(msg.user.username)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: isMe ? '#60a5fa' : msg.user.color }}
                      >
                        {msg.user.username}
                      </span>
                      <span className="text-2xs text-dark-500">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-dark-300 leading-relaxed mt-0.5">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUser && (
              <div className="flex items-center gap-2 animate-fade-in">
                <div className="w-7 h-7" />
                <span className="text-2xs text-dark-500 italic">
                  {typingUser} is typing
                  <span className="inline-flex ml-0.5">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ---- Input ---- */}
          <div className="px-3 py-2.5 border-t border-dark-700/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message #${CHANNELS.find((c) => c.id === activeChannel)?.label ?? 'chat'}...`}
                className="flex-1 bg-dark-700/60 border border-dark-600/40 rounded-lg px-3 py-2 text-xs text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="p-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
                aria-label="Send message"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Chat Button ============ */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-dark-700 hover:bg-dark-600 text-dark-300'
            : 'bg-brand-500 hover:bg-brand-600 text-white hover:scale-105'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}

        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-2xs font-bold px-1 ring-2 ring-dark-900 animate-fade-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
