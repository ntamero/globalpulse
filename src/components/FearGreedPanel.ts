/**
 * FearGreedPanel — Crypto Fear & Greed Index with gauge visualization
 * Data: Alternative.me API (free, no key needed)
 * Refresh: every 5 minutes
 */
import { Panel } from './Panel';

interface FGData {
  value: number;
  classification: string;
  timestamp: string;
  history: { value: number; classification: string; timestamp: string }[];
}

export class FearGreedPanel extends Panel {
  private data: FGData | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({ id: 'fear-greed', title: 'Fear & Greed', className: 'fear-greed-panel' });
    // className set in super
    this.fetchData();
    this.refreshTimer = setInterval(() => this.fetchData(), 300_000);
  }

  private async fetchData(): Promise<void> {
    try {
      this.showLoading();
      const resp = await fetch('https://api.alternative.me/fng/?limit=8');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const entries = json.data || [];
      if (entries.length === 0) throw new Error('No data');

      this.data = {
        value: parseInt(entries[0].value),
        classification: entries[0].value_classification,
        timestamp: entries[0].timestamp,
        history: entries.map((e: { value: string; value_classification: string; timestamp: string }) => ({
          value: parseInt(e.value),
          classification: e.value_classification,
          timestamp: e.timestamp,
        })),
      };

      this.render();
    } catch (err) {
      console.warn('[FearGreed] fetch error:', err);
      this.setContent(`<div class="panel-error">Fear & Greed verisi yuklenemedi</div>`);
    }
  }

  private getColor(value: number): string {
    if (value <= 20) return '#ff1744';
    if (value <= 40) return '#ff6d00';
    if (value <= 60) return '#ffd600';
    if (value <= 80) return '#76ff03';
    return '#00e676';
  }

  private renderGauge(value: number): string {
    const angle = -90 + (value / 100) * 180; // -90 to +90
    const color = this.getColor(value);
    return `
      <div class="fg-gauge">
        <svg viewBox="0 0 200 120" width="200" height="120">
          <!-- Background arc -->
          <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="#1a1a1a" stroke-width="16" stroke-linecap="round"/>
          <!-- Colored segments -->
          <path d="M 20 110 A 80 80 0 0 1 60 35" fill="none" stroke="#ff1744" stroke-width="14" stroke-linecap="round" opacity="0.3"/>
          <path d="M 60 35 A 80 80 0 0 1 100 20" fill="none" stroke="#ff6d00" stroke-width="14" stroke-linecap="round" opacity="0.3"/>
          <path d="M 100 20 A 80 80 0 0 1 140 35" fill="none" stroke="#ffd600" stroke-width="14" stroke-linecap="round" opacity="0.3"/>
          <path d="M 140 35 A 80 80 0 0 1 180 110" fill="none" stroke="#00e676" stroke-width="14" stroke-linecap="round" opacity="0.3"/>
          <!-- Needle -->
          <line x1="100" y1="110" x2="${100 + 65 * Math.cos((angle * Math.PI) / 180)}" y2="${110 + 65 * Math.sin((angle * Math.PI) / 180)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
          <circle cx="100" cy="110" r="6" fill="${color}"/>
          <!-- Value -->
          <text x="100" y="95" text-anchor="middle" fill="${color}" font-size="32" font-weight="bold">${value}</text>
        </svg>
        <div class="fg-label" style="color:${color}">${this.data?.classification?.toUpperCase() || ''}</div>
      </div>
    `;
  }

  private render(): void {
    if (!this.data) return;

    const historyBars = this.data.history.slice(0, 7).map((h, i) => {
      const color = this.getColor(h.value);
      const date = new Date(parseInt(h.timestamp) * 1000);
      const day = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
      return `<div class="fg-history-bar" title="${h.classification}: ${h.value}">
        <div class="fg-bar" style="background:${color};height:${h.value}%"></div>
        <span class="fg-day">${i === 0 ? 'Now' : day}</span>
      </div>`;
    }).join('');

    this.setContent(`
      <div class="fg-container">
        <div class="fg-badge">CRYPTO</div>
        ${this.renderGauge(this.data.value)}
        <div class="fg-subtitle">Crypto market sentiment</div>
        <div class="fg-history">
          <div class="fg-history-label">7-DAY HISTORY</div>
          <div class="fg-history-bars">${historyBars}</div>
        </div>
      </div>
    `);
  }

  destroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    super.destroy();
  }
}
