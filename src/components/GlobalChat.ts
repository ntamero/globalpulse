/**
 * GlobalPulse — Global Chat Component
 *
 * Floating chat widget (bottom-right) with:
 * - Collapsed: pill button showing online count
 * - Expanded: full chat panel with channel tabs, messages, user list
 * - Login: email verification flow
 */

import { chatService, type ChatChannel, type ChatMessage, type ChatUser } from '@/services/chat';
import { escapeHtml } from '@/utils/sanitize';

const DISMISSED_KEY = 'globalpulse-chat-minimized';

interface ChatState {
  phase: 'closed' | 'login' | 'verify' | 'chat';
  channels: ChatChannel[];
  activeChannel: string;
  messages: ChatMessage[];
  users: ChatUser[];
  username: string;
  userColor: string;
  email: string;
  pendingEmail: string;
  error: string;
  typingUsers: Map<string, number>;
  totalOnline: number;
  isConnected: boolean;
}

export class GlobalChat {
  private container: HTMLElement;
  private state: ChatState;
  private cleanups: Array<() => void> = [];
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastTypingSent = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'global-chat';
    this.container.id = 'globalChat';

    this.state = {
      phase: 'closed',
      channels: [],
      activeChannel: 'global',
      messages: [],
      users: [],
      username: '',
      userColor: '',
      email: '',
      pendingEmail: '',
      error: '',
      typingUsers: new Map(),
      totalOnline: 0,
      isConnected: false,
    };

    this.setupListeners();
    this.render();

    // Connect to chat server
    chatService.connect();
  }

  private setupListeners(): void {
    this.cleanups.push(
      chatService.on('connected', () => {
        this.state.isConnected = true;
        this.render();
      }),
      chatService.on('disconnected', () => {
        this.state.isConnected = false;
        this.render();
      }),
      chatService.on('init', (data: unknown) => {
        const d = data as { channels: ChatChannel[]; stats: Array<{ id: string; online: number }> };
        this.state.channels = d.channels;
        this.state.totalOnline = d.stats.reduce((sum, s) => sum + s.online, 0);
        this.render();
      }),
      chatService.on('verified', (data: unknown) => {
        const d = data as { username: string; color: string; channels: ChatChannel[] };
        this.state.username = d.username;
        this.state.userColor = d.color;
        this.state.channels = d.channels;
        this.state.phase = 'chat';
        this.state.error = '';
        chatService.joinChannel(this.state.activeChannel);
        this.render();
      }),
      chatService.on('session-resumed', (data: unknown) => {
        const d = data as { username: string; color: string; channels: ChatChannel[] };
        this.state.username = d.username;
        this.state.userColor = d.color;
        this.state.channels = d.channels;
        // Don't auto-open, but be ready
        if (this.state.phase === 'chat') {
          chatService.joinChannel(this.state.activeChannel);
        }
        this.render();
      }),
      chatService.on('session-expired', () => {
        this.state.phase = 'login';
        this.state.username = '';
        this.state.error = 'Session expired. Please login again.';
        this.render();
      }),
      chatService.on('code-sent', (data: unknown) => {
        const d = data as { email: string };
        this.state.pendingEmail = d.email;
        this.state.phase = 'verify';
        this.state.error = '';
        this.render();
      }),
      chatService.on('channel-joined', (data: unknown) => {
        const d = data as { channel: string; messages: ChatMessage[]; users: ChatUser[] };
        this.state.activeChannel = d.channel;
        this.state.messages = d.messages;
        this.state.users = d.users;
        this.state.typingUsers.clear();
        this.render();
        this.scrollToBottom();
      }),
      chatService.on('message', (data: unknown) => {
        const d = data as { message: ChatMessage };
        if (d.message.channel === this.state.activeChannel) {
          this.state.messages.push(d.message);
          if (this.state.messages.length > 200) {
            this.state.messages.splice(0, this.state.messages.length - 200);
          }
          this.renderMessages();
          this.scrollToBottom();
        }
      }),
      chatService.on('users', (data: unknown) => {
        const d = data as { users: ChatUser[]; count: number };
        this.state.users = d.users;
        this.state.totalOnline = d.count;
        this.renderUserCount();
      }),
      chatService.on('typing', (data: unknown) => {
        const d = data as { username: string };
        this.state.typingUsers.set(d.username, Date.now());
        this.renderTypingIndicator();
        // Clear typing after 3 seconds
        setTimeout(() => {
          if (Date.now() - (this.state.typingUsers.get(d.username) || 0) >= 2800) {
            this.state.typingUsers.delete(d.username);
            this.renderTypingIndicator();
          }
        }, 3000);
      }),
      chatService.on('error', (data: unknown) => {
        const d = data as { message: string };
        this.state.error = d.message;
        this.renderError();
      }),
    );
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    this.cleanups.forEach(fn => fn());
    chatService.disconnect();
    this.container.remove();
  }

  // ============================================
  // Rendering
  // ============================================

  private render(): void {
    switch (this.state.phase) {
      case 'closed':
        this.renderClosed();
        break;
      case 'login':
        this.renderLogin();
        break;
      case 'verify':
        this.renderVerify();
        break;
      case 'chat':
        this.renderChat();
        break;
    }
  }

  private renderClosed(): void {
    const online = this.state.totalOnline;
    this.container.innerHTML = `
      <button class="gc-fab" id="gcFab" title="Global Chat">
        <span class="gc-fab-icon">💬</span>
        <span class="gc-fab-badge ${online > 0 ? 'gc-has-users' : ''}">${online || ''}</span>
      </button>
    `;
    this.container.querySelector('#gcFab')?.addEventListener('click', () => {
      this.openChat();
    });
  }

  private openChat(): void {
    const token = chatService.getSessionToken();
    if (token && this.state.username) {
      this.state.phase = 'chat';
      chatService.joinChannel(this.state.activeChannel);
    } else if (token) {
      // Session exists but not yet resumed — wait for it
      this.state.phase = 'chat';
      chatService.joinChannel(this.state.activeChannel);
    } else {
      this.state.phase = 'login';
    }
    this.render();
  }

  private renderLogin(): void {
    this.container.innerHTML = `
      <div class="gc-panel">
        <div class="gc-header">
          <div class="gc-header-left">
            <span class="gc-header-icon">💬</span>
            <span class="gc-header-title">Global Chat</span>
          </div>
          <button class="gc-close" id="gcClose">&times;</button>
        </div>
        <div class="gc-login-body">
          <div class="gc-login-hero">
            <div class="gc-login-emoji">🌍</div>
            <h3 class="gc-login-title">Join the Conversation</h3>
            <p class="gc-login-desc">Discuss world events in real-time with people around the globe. Verify your email to start chatting.</p>
          </div>
          <div class="gc-login-form">
            <input type="text" class="gc-input" id="gcUsername" placeholder="Username" maxlength="20" autocomplete="off" />
            <input type="email" class="gc-input" id="gcEmail" placeholder="Email address" autocomplete="email" />
            <div class="gc-error" id="gcError">${this.state.error ? escapeHtml(this.state.error) : ''}</div>
            <button class="gc-btn gc-btn-primary" id="gcRequestCode">
              <span>Send Verification Code</span>
            </button>
          </div>
          <p class="gc-login-note">We'll send a 6-digit code to your email. No password needed.</p>
        </div>
      </div>
    `;
    this.bindClose();
    this.container.querySelector('#gcRequestCode')?.addEventListener('click', () => {
      const username = (this.container.querySelector('#gcUsername') as HTMLInputElement)?.value.trim();
      const email = (this.container.querySelector('#gcEmail') as HTMLInputElement)?.value.trim();
      if (!username || !email) {
        this.state.error = 'Please enter both username and email.';
        this.renderError();
        return;
      }
      this.state.error = '';
      chatService.requestCode(email, username);
      const btn = this.container.querySelector('#gcRequestCode') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Sending...</span>';
      }
    });
    // Enter key support
    const inputs = this.container.querySelectorAll('.gc-input');
    inputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') {
          (this.container.querySelector('#gcRequestCode') as HTMLElement)?.click();
        }
      });
    });
  }

  private renderVerify(): void {
    this.container.innerHTML = `
      <div class="gc-panel">
        <div class="gc-header">
          <div class="gc-header-left">
            <span class="gc-header-icon">💬</span>
            <span class="gc-header-title">Verify Email</span>
          </div>
          <button class="gc-close" id="gcClose">&times;</button>
        </div>
        <div class="gc-login-body">
          <div class="gc-login-hero">
            <div class="gc-login-emoji">📧</div>
            <h3 class="gc-login-title">Check Your Email</h3>
            <p class="gc-login-desc">We sent a 6-digit code to <strong>${escapeHtml(this.state.pendingEmail)}</strong></p>
          </div>
          <div class="gc-login-form">
            <input type="text" class="gc-input gc-code-input" id="gcCode" placeholder="Enter 6-digit code" maxlength="6" autocomplete="one-time-code" inputmode="numeric" />
            <div class="gc-error" id="gcError">${this.state.error ? escapeHtml(this.state.error) : ''}</div>
            <button class="gc-btn gc-btn-primary" id="gcVerify">
              <span>Verify & Join</span>
            </button>
            <button class="gc-btn gc-btn-ghost" id="gcBackToLogin">
              <span>← Use different email</span>
            </button>
          </div>
        </div>
      </div>
    `;
    this.bindClose();
    this.container.querySelector('#gcVerify')?.addEventListener('click', () => {
      const code = (this.container.querySelector('#gcCode') as HTMLInputElement)?.value.trim();
      if (!code || code.length !== 6) {
        this.state.error = 'Please enter the 6-digit code.';
        this.renderError();
        return;
      }
      chatService.verifyCode(this.state.pendingEmail, code);
    });
    this.container.querySelector('#gcBackToLogin')?.addEventListener('click', () => {
      this.state.phase = 'login';
      this.state.error = '';
      this.render();
    });
    this.container.querySelector('#gcCode')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        (this.container.querySelector('#gcVerify') as HTMLElement)?.click();
      }
    });
    // Auto-focus code input
    setTimeout(() => {
      (this.container.querySelector('#gcCode') as HTMLInputElement)?.focus();
    }, 100);
  }

  private renderChat(): void {
    const channel = this.state.channels.find(c => c.id === this.state.activeChannel);
    this.container.innerHTML = `
      <div class="gc-panel gc-panel-chat">
        <div class="gc-header">
          <div class="gc-header-left">
            <span class="gc-header-icon">${channel?.icon || '💬'}</span>
            <span class="gc-header-title">${channel?.name || 'Chat'}</span>
            <span class="gc-online-badge" id="gcOnlineCount">${this.state.users.length} online</span>
          </div>
          <div class="gc-header-right">
            <button class="gc-header-btn" id="gcChannelToggle" title="Channels">☰</button>
            <button class="gc-header-btn" id="gcLogout" title="Logout">⏻</button>
            <button class="gc-close" id="gcClose">&times;</button>
          </div>
        </div>

        <div class="gc-channel-drawer" id="gcChannelDrawer" style="display:none;">
          <div class="gc-channel-list">
            ${this.state.channels.map(ch => `
              <button class="gc-channel-item ${ch.id === this.state.activeChannel ? 'gc-channel-active' : ''}"
                      data-channel="${ch.id}">
                <span class="gc-channel-icon">${ch.icon}</span>
                <div class="gc-channel-info">
                  <span class="gc-channel-name">${ch.name}</span>
                  <span class="gc-channel-desc">${ch.description}</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="gc-messages" id="gcMessages">
          ${this.renderMessageList()}
        </div>

        <div class="gc-typing" id="gcTyping"></div>

        <div class="gc-composer">
          <div class="gc-user-badge" style="background:${this.state.userColor}">${this.state.username.charAt(0).toUpperCase()}</div>
          <input type="text" class="gc-message-input" id="gcInput" placeholder="Type a message..." maxlength="500" autocomplete="off" />
          <button class="gc-send-btn" id="gcSend" title="Send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;

    this.bindClose();
    this.bindChatEvents();
    this.scrollToBottom();
  }

  private renderMessageList(): string {
    if (this.state.messages.length === 0) {
      const channel = this.state.channels.find(c => c.id === this.state.activeChannel);
      return `
        <div class="gc-empty">
          <span class="gc-empty-icon">${channel?.icon || '💬'}</span>
          <p>No messages yet in ${channel?.name || 'this channel'}.</p>
          <p class="gc-empty-sub">Be the first to start a conversation!</p>
        </div>
      `;
    }

    let html = '';
    let lastUsername = '';
    let lastTime = 0;

    for (const msg of this.state.messages) {
      const isOwn = msg.username === this.state.username;
      const showHeader = msg.username !== lastUsername || (msg.timestamp - lastTime > 60000);
      const time = new Date(msg.timestamp);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

      if (showHeader) {
        html += `
          <div class="gc-msg ${isOwn ? 'gc-msg-own' : ''}">
            <div class="gc-msg-header">
              <span class="gc-msg-avatar" style="background:${msg.color}">${msg.username.charAt(0).toUpperCase()}</span>
              <span class="gc-msg-name" style="color:${msg.color}">${escapeHtml(msg.username)}</span>
              <span class="gc-msg-time">${timeStr}</span>
            </div>
            <div class="gc-msg-text">${msg.content}</div>
          </div>
        `;
      } else {
        html += `
          <div class="gc-msg gc-msg-cont ${isOwn ? 'gc-msg-own' : ''}">
            <div class="gc-msg-text">${msg.content}</div>
          </div>
        `;
      }

      lastUsername = msg.username;
      lastTime = msg.timestamp;
    }
    return html;
  }

  // ============================================
  // Partial re-renders (avoid full DOM rebuilds)
  // ============================================

  private renderMessages(): void {
    const el = this.container.querySelector('#gcMessages');
    if (el) el.innerHTML = this.renderMessageList();
  }

  private renderUserCount(): void {
    const el = this.container.querySelector('#gcOnlineCount');
    if (el) el.textContent = `${this.state.users.length} online`;
  }

  private renderTypingIndicator(): void {
    const el = this.container.querySelector('#gcTyping');
    if (!el) return;
    const now = Date.now();
    const names: string[] = [];
    for (const [name, ts] of this.state.typingUsers) {
      if (now - ts < 3000 && name !== this.state.username) {
        names.push(name);
      }
    }
    if (names.length === 0) {
      el.textContent = '';
      el.style.display = 'none';
    } else if (names.length === 1) {
      el.textContent = `${names[0]} is typing...`;
      el.style.display = 'block';
    } else {
      el.textContent = `${names.slice(0, 2).join(', ')} are typing...`;
      el.style.display = 'block';
    }
  }

  private renderError(): void {
    const el = this.container.querySelector('#gcError');
    if (el) {
      el.textContent = this.state.error;
      el.classList.toggle('gc-error-show', !!this.state.error);
    }
  }

  // ============================================
  // Event binding
  // ============================================

  private bindClose(): void {
    this.container.querySelector('#gcClose')?.addEventListener('click', () => {
      this.state.phase = 'closed';
      this.render();
    });
  }

  private bindChatEvents(): void {
    // Channel drawer toggle
    this.container.querySelector('#gcChannelToggle')?.addEventListener('click', () => {
      const drawer = this.container.querySelector('#gcChannelDrawer') as HTMLElement;
      if (drawer) {
        drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Channel selection
    this.container.querySelectorAll('.gc-channel-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const channelId = (btn as HTMLElement).dataset.channel!;
        if (channelId !== this.state.activeChannel) {
          this.state.activeChannel = channelId;
          chatService.joinChannel(channelId);
          const drawer = this.container.querySelector('#gcChannelDrawer') as HTMLElement;
          if (drawer) drawer.style.display = 'none';
        }
      });
    });

    // Logout
    this.container.querySelector('#gcLogout')?.addEventListener('click', () => {
      chatService.logout();
      this.state.phase = 'login';
      this.state.username = '';
      this.state.userColor = '';
      this.state.messages = [];
      this.state.users = [];
      this.state.error = '';
      this.render();
      // Reconnect for anonymous browsing
      chatService.connect();
    });

    // Send message
    const sendMsg = () => {
      const input = this.container.querySelector('#gcInput') as HTMLInputElement;
      if (!input) return;
      const content = input.value.trim();
      if (!content) return;
      chatService.sendMessage(content);
      input.value = '';
      input.focus();
    };

    this.container.querySelector('#gcSend')?.addEventListener('click', sendMsg);
    this.container.querySelector('#gcInput')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
        e.preventDefault();
        sendMsg();
      }
    });

    // Typing indicator
    this.container.querySelector('#gcInput')?.addEventListener('input', () => {
      const now = Date.now();
      if (now - this.lastTypingSent > 2000) {
        this.lastTypingSent = now;
        chatService.sendTyping();
      }
    });
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const el = this.container.querySelector('#gcMessages');
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}

/**
 * Mount the Global Chat widget to the page.
 * Replaces the old CommunityWidget.
 */
export function mountGlobalChat(): GlobalChat {
  // Remove old community widget if present
  document.querySelector('.community-widget')?.remove();

  const chat = new GlobalChat();
  document.body.appendChild(chat.getElement());
  return chat;
}
