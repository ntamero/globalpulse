/**
 * ForexPanel — Live forex rates + commodities
 * Data: Fawaz Currency API (free, no key) + Yahoo Finance proxy
 * Refresh: every 5 minutes
 */
import { Panel } from './Panel';

interface ForexRate {
  pair: string;
  flag: string;
  rate: number;
  change?: number;
}

const FOREX_PAIRS = [
  { from: 'usd', to: 'eur', label: 'EUR/USD', flag: '🇪🇺' },
  { from: 'usd', to: 'gbp', label: 'GBP/USD', flag: '🇬🇧' },
  { from: 'usd', to: 'jpy', label: 'USD/JPY', flag: '🇯🇵' },
  { from: 'usd', to: 'chf', label: 'USD/CHF', flag: '🇨🇭' },
  { from: 'usd', to: 'cad', label: 'USD/CAD', flag: '🇨🇦' },
  { from: 'usd', to: 'aud', label: 'AUD/USD', flag: '🇦🇺' },
  { from: 'usd', to: 'nzd', label: 'NZD/USD', flag: '🇳🇿' },
  { from: 'usd', to: 'try', label: 'USD/TRY', flag: '🇹🇷' },
  { from: 'usd', to: 'brl', label: 'USD/BRL', flag: '🇧🇷' },
  { from: 'usd', to: 'mxn', label: 'USD/MXN', flag: '🇲🇽' },
  { from: 'usd', to: 'cny', label: 'USD/CNY', flag: '🇨🇳' },
  { from: 'usd', to: 'krw', label: 'USD/KRW', flag: '🇰🇷' },
  { from: 'usd', to: 'inr', label: 'USD/INR', flag: '🇮🇳' },
  { from: 'usd', to: 'sar', label: 'USD/SAR', flag: '🇸🇦' },
  { from: 'usd', to: 'aed', label: 'USD/AED', flag: '🇦🇪' },
  { from: 'usd', to: 'rub', label: 'USD/RUB', flag: '🇷🇺' },
  { from: 'usd', to: 'ars', label: 'USD/ARS', flag: '🇦🇷' },
  { from: 'usd', to: 'clp', label: 'USD/CLP', flag: '🇨🇱' },
];

export class ForexPanel extends Panel {
  private rates: ForexRate[] = [];
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({ id: 'forex-rates', title: 'Forex Rates', className: 'forex-panel' });
    // className set in super
    this.fetchData();
    this.refreshTimer = setInterval(() => this.fetchData(), 300_000);
  }

  private async fetchData(): Promise<void> {
    try {
      this.showLoading();
      const resp = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const usdRates = json.usd || {};

      this.rates = FOREX_PAIRS.map(p => {
        const rate = usdRates[p.to];
        // For EUR/USD, GBP/USD, AUD/USD, NZD/USD we invert
        const isInverted = ['eur', 'gbp', 'aud', 'nzd'].includes(p.to);
        return {
          pair: p.label,
          flag: p.flag,
          rate: isInverted && rate ? 1 / rate : (rate || 0),
        };
      });

      this.render();
      this.setDataBadge('live', `${this.rates.length} pairs`);
    } catch (err) {
      console.warn('[Forex] fetch error:', err);
      this.setContent(`<div class="panel-error">Doviz kurlari yuklenemedi</div>`);
    }
  }

  private render(): void {
    const rows = this.rates.map(r => {
      const rateStr = r.rate >= 100 ? r.rate.toFixed(2) :
        r.rate >= 10 ? r.rate.toFixed(3) : r.rate.toFixed(4);
      return `<div class="forex-row">
        <span class="forex-flag">${r.flag}</span>
        <span class="forex-pair">${r.pair}</span>
        <span class="forex-rate">${rateStr}</span>
      </div>`;
    }).join('');

    this.setContent(`
      <div class="forex-header">
        <span class="forex-badge">LIVE</span>
      </div>
      <div class="forex-list">${rows}</div>
    `);
  }

  destroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    super.destroy();
  }
}
