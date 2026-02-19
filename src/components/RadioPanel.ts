/**
 * GlobalPulse — Radio Panel
 *
 * Live radio streams from global news, talk, and music stations.
 * Uses native HTML5 <audio> element for HLS/direct streams.
 * Mini-player style with station switching, category filtering.
 */

import { Panel } from './Panel';

interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  category: 'news' | 'world' | 'business' | 'talk';
  country: string;
  language: string;
  icon?: string;
}

type RadioCategory = 'all' | 'news' | 'world' | 'business' | 'talk';

// Global radio stations with direct stream URLs
const RADIO_STATIONS: RadioStation[] = [
  // News
  { id: 'bbc-ws', name: 'BBC World Service', streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service', category: 'news', country: 'UK', language: 'en' },
  { id: 'npr', name: 'NPR News', streamUrl: 'https://npr-ice.streamguys1.com/live.mp3', category: 'news', country: 'US', language: 'en' },
  { id: 'rfi-en', name: 'RFI English', streamUrl: 'https://live02.rfi.fr/rfienglish-96k.mp3', category: 'news', country: 'FR', language: 'en' },
  { id: 'dw-en', name: 'DW English', streamUrl: 'https://dw-ais-liveav-http.akamaized.net/dw/1027/dwstream_mp3.mp3', category: 'news', country: 'DE', language: 'en' },

  // World / International
  { id: 'bbc-r4', name: 'BBC Radio 4', streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm', category: 'world', country: 'UK', language: 'en' },
  { id: 'rfi-fr', name: 'RFI Français', streamUrl: 'https://live02.rfi.fr/rfimonde-96k.mp3', category: 'world', country: 'FR', language: 'fr' },
  { id: 'dw-de', name: 'DW Deutsch', streamUrl: 'https://dw-ais-liveav-http.akamaized.net/dw/1025/dwstream_mp3.mp3', category: 'world', country: 'DE', language: 'de' },
  { id: 'rai-r1', name: 'RAI Radio 1', streamUrl: 'https://icestreaming.rai.it/1.mp3', category: 'world', country: 'IT', language: 'it' },

  // Business / Finance
  { id: 'bloomberg', name: 'Bloomberg Radio', streamUrl: 'https://stream.revma.ihrhls.com/zc1413', category: 'business', country: 'US', language: 'en' },
  { id: 'bbc-r5', name: 'BBC Radio 5 Live', streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_five_live_online_nonuk', category: 'business', country: 'UK', language: 'en' },

  // Talk / Analysis
  { id: 'lbc', name: 'LBC News', streamUrl: 'https://media-ssl.musicradio.com/LBCNews', category: 'talk', country: 'UK', language: 'en' },
  { id: 'trt-world', name: 'TRT World Radio', streamUrl: 'https://trtradyo3.mediatriple.net/trtradyo3.mp3', category: 'talk', country: 'TR', language: 'en' },
];

const CATEGORIES: { id: RadioCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '📻' },
  { id: 'news', label: 'News', icon: '📰' },
  { id: 'world', label: 'World', icon: '🌍' },
  { id: 'business', label: 'Business', icon: '📈' },
  { id: 'talk', label: 'Talk', icon: '🎙️' },
];

export class RadioPanel extends Panel {
  private audio: HTMLAudioElement | null = null;
  private activeStation: RadioStation | null = null;
  private isPlaying = false;
  private activeCategory: RadioCategory = 'all';
  private volume = 0.7;
  private loadError = false;

  constructor() {
    super({
      id: 'radio',
      title: '📻 Live Radio',
      className: 'radio-panel',
      infoTooltip: 'Live global radio streams — news, world service, business, and talk stations',
    });
    this.render();
  }

  private render(): void {
    const stations = this.getFilteredStations();

    this.setContent(`
      <div class="radio-container">
        <div class="radio-player" id="radioPlayer">
          ${this.activeStation ? this.renderNowPlaying() : this.renderIdle()}
        </div>

        <div class="radio-categories" id="radioCategories">
          ${CATEGORIES.map(cat => `
            <button class="radio-cat-btn ${cat.id === this.activeCategory ? 'active' : ''}"
                    data-category="${cat.id}">
              <span>${cat.icon}</span>
              <span>${cat.label}</span>
            </button>
          `).join('')}
        </div>

        <div class="radio-station-list" id="radioStations">
          ${stations.map(station => `
            <button class="radio-station ${this.activeStation?.id === station.id ? 'radio-station-active' : ''}"
                    data-station="${station.id}"
                    title="${station.name} — ${station.country} (${station.language.toUpperCase()})">
              <div class="radio-station-info">
                <span class="radio-station-name">${station.name}</span>
                <span class="radio-station-meta">${station.country} · ${station.category}</span>
              </div>
              <div class="radio-station-status">
                ${this.activeStation?.id === station.id && this.isPlaying
      ? '<span class="radio-live-dot"></span>'
      : '<span class="radio-play-icon">▶</span>'}
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `);

    this.setCount(stations.length);
    this.bindEvents();
  }

  private renderNowPlaying(): string {
    return `
      <div class="radio-now-playing">
        <div class="radio-np-info">
          <div class="radio-np-wave ${this.isPlaying ? 'radio-np-active' : ''}">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="radio-np-details">
            <span class="radio-np-name">${this.activeStation!.name}</span>
            <span class="radio-np-status">${this.isPlaying ? 'LIVE' : 'Paused'} · ${this.activeStation!.country}</span>
          </div>
        </div>
        <div class="radio-np-controls">
          <button class="radio-ctrl-btn" id="radioPlayPause" title="${this.isPlaying ? 'Pause' : 'Play'}">
            ${this.isPlaying ? '⏸' : '▶️'}
          </button>
          <input type="range" class="radio-volume" id="radioVolume"
                 min="0" max="100" value="${Math.round(this.volume * 100)}"
                 title="Volume" />
          <button class="radio-ctrl-btn radio-ctrl-stop" id="radioStop" title="Stop">⏹</button>
        </div>
      </div>
      ${this.loadError ? '<div class="radio-error">Stream unavailable. Try another station.</div>' : ''}
    `;
  }

  private renderIdle(): string {
    return `
      <div class="radio-idle">
        <span class="radio-idle-icon">📻</span>
        <span class="radio-idle-text">Select a station to listen</span>
      </div>
    `;
  }

  private getFilteredStations(): RadioStation[] {
    if (this.activeCategory === 'all') return RADIO_STATIONS;
    return RADIO_STATIONS.filter(s => s.category === this.activeCategory);
  }

  private bindEvents(): void {
    // Category buttons
    this.element.querySelectorAll('.radio-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = (btn as HTMLElement).dataset.category as RadioCategory;
        this.render();
      });
    });

    // Station buttons
    this.element.querySelectorAll('.radio-station').forEach(btn => {
      btn.addEventListener('click', () => {
        const stationId = (btn as HTMLElement).dataset.station!;
        const station = RADIO_STATIONS.find(s => s.id === stationId);
        if (station) this.playStation(station);
      });
    });

    // Play/Pause
    this.element.querySelector('#radioPlayPause')?.addEventListener('click', () => {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.resume();
      }
    });

    // Stop
    this.element.querySelector('#radioStop')?.addEventListener('click', () => {
      this.stop();
    });

    // Volume
    this.element.querySelector('#radioVolume')?.addEventListener('input', (e) => {
      this.volume = parseInt((e.target as HTMLInputElement).value) / 100;
      if (this.audio) this.audio.volume = this.volume;
    });
  }

  private playStation(station: RadioStation): void {
    // Stop current
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
    }

    this.activeStation = station;
    this.loadError = false;

    // Create audio element
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = this.volume;
    this.audio.preload = 'none';

    this.audio.addEventListener('playing', () => {
      this.isPlaying = true;
      this.render();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.render();
    });

    this.audio.addEventListener('error', () => {
      this.loadError = true;
      this.isPlaying = false;
      this.render();
    });

    this.audio.src = station.streamUrl;
    this.audio.play().catch(() => {
      this.loadError = true;
      this.render();
    });

    this.render();
  }

  private pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  private resume(): void {
    if (this.audio && this.activeStation) {
      this.audio.play().catch(() => { });
    }
  }

  private stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
    }
    this.activeStation = null;
    this.isPlaying = false;
    this.loadError = false;
    this.render();
  }

  public destroy(): void {
    this.stop();
  }
}
