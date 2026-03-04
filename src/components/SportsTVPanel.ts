/**
 * GlobalScope — Sports TV Panel
 *
 * Dedicated panel for live sports TV channels.
 * YouTube embed player with channel switcher by category.
 */

import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';

interface SportsTVChannel {
  id: string;
  name: string;
  videoId: string;
  category: 'general' | 'football' | 'us' | 'motorsport';
  icon: string;
}

const SPORTS_TV_CHANNELS: SportsTVChannel[] = [
  { id: 'sky-sports', name: 'Sky Sports News', videoId: 'w9Ti1BXGU6g', category: 'general', icon: '📺' },
  { id: 'bein-en', name: 'beIN Sports Xtra', videoId: 'NAv1o6Jl5Cg', category: 'general', icon: '📺' },
  { id: 'eurosport', name: 'Eurosport', videoId: 'Gp9MIaBJfAs', category: 'general', icon: '📺' },
  { id: 'dazn', name: 'DAZN', videoId: 'hm2K8TLx0PM', category: 'general', icon: '📺' },
  { id: 'bein-tr', name: 'beIN Sports TR', videoId: 'XZHIM_5kxqc', category: 'football', icon: '⚽' },
  { id: 'bt-sport', name: 'TNT Sports', videoId: '85dBNToWWqU', category: 'football', icon: '⚽' },
  { id: 'futbol-tv', name: 'Football Daily', videoId: 'eQriE0G_6fo', category: 'football', icon: '⚽' },
  { id: 'espn', name: 'ESPN', videoId: 'dSgHhN6OuQE', category: 'us', icon: '🇺🇸' },
  { id: 'fox-sports', name: 'Fox Sports', videoId: '_s3OtMMGe4M', category: 'us', icon: '🇺🇸' },
  { id: 'nba-tv', name: 'NBA TV', videoId: 'rL73oVdgrRA', category: 'us', icon: '🏀' },
  { id: 'nfl-net', name: 'NFL Network', videoId: 'v4FGPFK8b8Y', category: 'us', icon: '🏈' },
  { id: 'f1-tv', name: 'F1 TV', videoId: 'BvRb7p0XrZU', category: 'motorsport', icon: '🏎️' },
  { id: 'motogp', name: 'MotoGP', videoId: 'nBnN5YH_X64', category: 'motorsport', icon: '🏍️' },
];

type TVCategory = 'all' | 'general' | 'football' | 'us' | 'motorsport';

export class SportsTVPanel extends Panel {
  private activeCategory: TVCategory = 'all';
  private activeChannel: SportsTVChannel = SPORTS_TV_CHANNELS[0]!;

  constructor() {
    super({
      id: 'sports-tv',
      title: '📺 Sports TV',
      className: 'sports-tv-panel',
      infoTooltip: 'Live sports TV channels — Sky Sports, ESPN, beIN Sports, F1 TV & more',
    });
    this.renderFull();
  }

  private renderFull(): void {
    this.setContent(`
      <div class="stv-container">
        <div class="stv-categories">
          ${(['all', 'general', 'football', 'us', 'motorsport'] as TVCategory[]).map(cat => `
            <button class="stv-cat ${cat === this.activeCategory ? 'active' : ''}" data-tvcat="${cat}">
              ${cat === 'all' ? '📡 All' : cat === 'general' ? '📺 General' : cat === 'football' ? '⚽ Football' : cat === 'us' ? '🇺🇸 US Sports' : '🏎️ Motor'}
            </button>
          `).join('')}
        </div>
        <div class="stv-player">
          <iframe id="sportsTVIframe"
            src="https://www.youtube.com/embed/${this.activeChannel.videoId}?autoplay=0&mute=1&rel=0&modestbranding=1"
            frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>
        <div class="stv-channels" id="stvChannels">${this.renderChannels()}</div>
      </div>
    `);
    this.bindEvents();
  }

  private renderChannels(): string {
    const filtered = this.activeCategory === 'all'
      ? SPORTS_TV_CHANNELS
      : SPORTS_TV_CHANNELS.filter(c => c.category === this.activeCategory);
    return filtered.map(ch => `
      <button class="stv-ch ${ch.id === this.activeChannel.id ? 'active' : ''}" data-channel-id="${ch.id}">
        <span class="stv-ch-icon">${ch.icon}</span>
        <span class="stv-ch-name">${escapeHtml(ch.name)}</span>
      </button>
    `).join('');
  }

  private bindEvents(): void {
    // Category switching
    this.element.querySelectorAll('.stv-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = (btn as HTMLElement).dataset.tvcat as TVCategory;
        this.element.querySelectorAll('.stv-cat').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cl = this.element.querySelector('#stvChannels');
        if (cl) cl.innerHTML = this.renderChannels();
        this.bindChannelEvents();
      });
    });
    this.bindChannelEvents();
  }

  private bindChannelEvents(): void {
    this.element.querySelectorAll('.stv-ch').forEach(btn => {
      btn.addEventListener('click', () => {
        const ch = SPORTS_TV_CHANNELS.find(c => c.id === (btn as HTMLElement).dataset.channelId);
        if (!ch) return;
        this.activeChannel = ch;
        const iframe = this.element.querySelector('#sportsTVIframe') as HTMLIFrameElement;
        if (iframe) iframe.src = `https://www.youtube.com/embed/${ch.videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`;
        this.element.querySelectorAll('.stv-ch').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }
}
