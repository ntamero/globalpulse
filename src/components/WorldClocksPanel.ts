/**
 * WorldClocksPanel — Major stock exchange clocks with open/closed status
 * Client-side timezone calculations, no API needed
 */
import { Panel } from './Panel';

interface MarketClock {
  name: string;
  exchange: string;
  flag: string;
  timezone: string;
  openHour: number;
  closeHour: number;
  weekdays: boolean; // true = Mon-Fri only
}

const MARKETS: MarketClock[] = [
  { name: 'New York', exchange: 'NYSE', flag: '🇺🇸', timezone: 'America/New_York', openHour: 9.5, closeHour: 16, weekdays: true },
  { name: 'London', exchange: 'LSE', flag: '🇬🇧', timezone: 'Europe/London', openHour: 8, closeHour: 16.5, weekdays: true },
  { name: 'Tokyo', exchange: 'TSE', flag: '🇯🇵', timezone: 'Asia/Tokyo', openHour: 9, closeHour: 15, weekdays: true },
  { name: 'Shanghai', exchange: 'SSE', flag: '🇨🇳', timezone: 'Asia/Shanghai', openHour: 9.5, closeHour: 15, weekdays: true },
  { name: 'Frankfurt', exchange: 'XETRA', flag: '🇩🇪', timezone: 'Europe/Berlin', openHour: 9, closeHour: 17.5, weekdays: true },
  { name: 'Sydney', exchange: 'ASX', flag: '🇦🇺', timezone: 'Australia/Sydney', openHour: 10, closeHour: 16, weekdays: true },
  { name: 'Hong Kong', exchange: 'HKEX', flag: '🇭🇰', timezone: 'Asia/Hong_Kong', openHour: 9.5, closeHour: 16, weekdays: true },
  { name: 'Mumbai', exchange: 'BSE', flag: '🇮🇳', timezone: 'Asia/Kolkata', openHour: 9.25, closeHour: 15.5, weekdays: true },
  { name: 'São Paulo', exchange: 'B3', flag: '🇧🇷', timezone: 'America/Sao_Paulo', openHour: 10, closeHour: 17, weekdays: true },
  { name: 'Istanbul', exchange: 'BIST', flag: '🇹🇷', timezone: 'Europe/Istanbul', openHour: 10, closeHour: 18, weekdays: true },
  { name: 'Seoul', exchange: 'KRX', flag: '🇰🇷', timezone: 'Asia/Seoul', openHour: 9, closeHour: 15.5, weekdays: true },
  { name: 'Dubai', exchange: 'DFM', flag: '🇦🇪', timezone: 'Asia/Dubai', openHour: 10, closeHour: 14, weekdays: true },
];

export class WorldClocksPanel extends Panel {
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({ id: 'world-clocks', title: 'World Clocks', className: 'world-clocks-panel' });
    // className set in super
    this.render();
    this.clockTimer = setInterval(() => this.render(), 30_000);
  }

  private isMarketOpen(market: MarketClock): boolean {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: market.timezone,
      hour: 'numeric', minute: 'numeric', hour12: false,
      weekday: 'short',
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const weekday = parts.find(p => p.type === 'weekday')?.value || '';

    if (market.weekdays && (weekday === 'Sat' || weekday === 'Sun')) return false;

    const currentHour = hour + minute / 60;
    return currentHour >= market.openHour && currentHour < market.closeHour;
  }

  private getLocalTime(timezone: string): string {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  }

  private render(): void {
    const rows = MARKETS.map(m => {
      const isOpen = this.isMarketOpen(m);
      const time = this.getLocalTime(m.timezone);
      const statusClass = isOpen ? 'clock-open' : 'clock-closed';
      const statusText = isOpen ? 'OPEN' : 'CLOSED';

      return `<div class="clock-row">
        <span class="clock-flag">${m.flag}</span>
        <div class="clock-info">
          <span class="clock-name">${m.name}</span>
          <span class="clock-exchange">${m.exchange}</span>
        </div>
        <span class="clock-status ${statusClass}">${statusText}</span>
        <span class="clock-time">${time}</span>
      </div>`;
    }).join('');

    this.setContent(`
      <div class="clocks-header">
        <span class="clocks-badge">MARKETS</span>
      </div>
      <div class="clocks-list">${rows}</div>
    `);
  }

  destroy(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
    super.destroy();
  }
}
