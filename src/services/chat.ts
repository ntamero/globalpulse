/**
 * GlobalScope — Chat WebSocket Client Service
 *
 * Manages connection to the chat WebSocket server,
 * handles reconnection, session persistence, and message dispatching.
 */

export interface ChatChannel {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  color: string;
  content: string;
  timestamp: number;
  channel: string;
}

export interface ChatUser {
  username: string;
  color: string;
}

export interface ChannelStats {
  id: string;
  online: number;
  messageCount: number;
}

type ChatEventType =
  | 'connected'
  | 'disconnected'
  | 'init'
  | 'verified'
  | 'session-resumed'
  | 'session-expired'
  | 'code-sent'
  | 'channel-joined'
  | 'message'
  | 'users'
  | 'typing'
  | 'error';

type ChatEventHandler = (data: unknown) => void;

const SESSION_KEY = 'globalpulse-chat-session';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000];

class ChatService {
  private ws: WebSocket | null = null;
  private listeners = new Map<ChatEventType, Set<ChatEventHandler>>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private _connected = false;

  get connected(): boolean {
    return this._connected;
  }

  /** Get saved session token from localStorage */
  getSessionToken(): string | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      // Check if session is still valid (24h)
      if (Date.now() - parsed.createdAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed.token;
    } catch {
      return null;
    }
  }

  /** Save session to localStorage */
  saveSession(token: string): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token,
      createdAt: Date.now(),
    }));
  }

  /** Clear saved session */
  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  /** Connect to chat WebSocket */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.intentionalClose = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('[Chat] WebSocket creation failed:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this._connected = true;
      this.reconnectAttempt = 0;
      this.emit('connected', null);

      // Try to resume session
      const token = this.getSessionToken();
      if (token) {
        this.send({ type: 'resume-session', sessionToken: token });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (err) {
        console.error('[Chat] Failed to parse message:', err);
      }
    };

    this.ws.onclose = () => {
      this._connected = false;
      this.ws = null;
      this.emit('disconnected', null);
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  /** Disconnect from chat */
  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
  }

  /** Send message to server */
  private send(data: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /** Handle server messages */
  private handleServerMessage(data: Record<string, unknown>): void {
    const type = data.type as string;

    switch (type) {
      case 'ping':
        this.send({ type: 'pong' });
        return;

      case 'init':
        this.emit('init', data);
        return;

      case 'verified':
        if (data.sessionToken) {
          this.saveSession(data.sessionToken as string);
        }
        this.emit('verified', data);
        return;

      case 'session-resumed':
        this.emit('session-resumed', data);
        return;

      case 'session-expired':
        this.clearSession();
        this.emit('session-expired', data);
        return;

      case 'code-sent':
        this.emit('code-sent', data);
        return;

      case 'channel-joined':
        this.emit('channel-joined', data);
        return;

      case 'message':
        this.emit('message', data);
        return;

      case 'users':
        this.emit('users', data);
        return;

      case 'typing':
        this.emit('typing', data);
        return;

      case 'error':
        this.emit('error', data);
        return;
    }
  }

  /** Schedule reconnection with exponential backoff */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  // ── Public API ──

  /** Request verification code */
  requestCode(email: string, username: string): void {
    this.send({ type: 'request-code', email, username });
  }

  /** Verify code */
  verifyCode(email: string, code: string): void {
    this.send({ type: 'verify-code', email, code });
  }

  /** Join a channel */
  joinChannel(channelId: string): void {
    this.send({ type: 'join-channel', channel: channelId });
  }

  /** Send a chat message */
  sendMessage(content: string): void {
    this.send({ type: 'send-message', content });
  }

  /** Send typing indicator */
  sendTyping(): void {
    this.send({ type: 'typing' });
  }

  /** Send news headlines to chat server for AI context */
  updateNews(headlines: string[]): void {
    this.send({ type: 'update-news', headlines });
  }

  /** Logout — clear session and disconnect */
  logout(): void {
    this.clearSession();
    this.disconnect();
  }

  // ── Event system ──

  on(event: ChatEventType, handler: ChatEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  private emit(event: ChatEventType, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[Chat] Event handler error (${event}):`, err);
        }
      }
    }
  }
}

export const chatService = new ChatService();
