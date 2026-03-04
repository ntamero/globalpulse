/**
 * MarketRadarPanel — XED-style real-time market indices with sparklines
 *
 * Shows: S&P 500, DOW, NASDAQ, Russell 2000, VIX, FTSE 100, DAX, CAC 40,
 *        Nikkei, Hang Seng, Shanghai, KOSPI, Sensex, Bovespa
 *        + Gold, Silver, Oil WTI, US 10Y, EUR/USD, GBP/USD, USD/JPY
 *
 * Data: Yahoo Finance via our Vercel/API proxy
 * Refresh: every 60s
 */
import { Panel } from './Panel';

interface IndexData {
  symbol: string;
  label: string;
  name: string;
  country: string;
  flag: string;
  price: number;
  change: number;
  changePercent: number;
  sparkline: number[];
  marketState: string;
}

const INDICES: { symbol: string; label: string; flag: string; country: string }[] = [
  // US
  { symbol: '^GSPC', label: 'S&P 500', flag: '🇺🇸', country: 'US' },
  { symbol: '^DJI', label: 'Dow Jones', flag: '🇺🇸', country: 'US' },
  { symbol: '^IXIC', label: 'NASDAQ', flag: '🇺🇸', country: 'US' },
  { symbol: '^RUT', label: 'Russell 2000', flag: '🇺🇸', country: 'US' },
  { symbol: '^VIX', label: 'VIX', flag: '🇺🇸', country: 'US' },
  // Europe
  { symbol: '^FTSE', label: 'FTSE 100', flag: '🇬🇧', country: 'GB' },
  { symbol: '^GDAXI', label: 'DAX 40', flag: '🇩🇪', country: 'DE' },
  { symbol: '^FCHI', label: 'CAC 40', flag: '🇫🇷', country: 'FR' },
  { symbol: '^STOXX50E', label: 'Euro Stoxx 50', flag: '🇪🇺', country: 'EU' },
  // Asia
  { symbol: '^N225', label: 'Nikkei 225', flag: '🇯🇵', country: 'JP' },
  { symbol: '^HSI', label: 'Hang Seng', flag: '🇭🇰', country: 'HK' },
  { symbol: '000001.SS', label: 'Shanghai', flag: '🇨🇳', country: 'CN' },
  { symbol: '^KS11', label: 'KOSPI', flag: '🇰🇷', country: 'KR' },
  { symbol: '^BSESN', label: 'Sensex', flag: '🇮🇳', country: 'IN' },
  // Americas
  { symbol: '^BVSP', label: 'Bovespa', flag: '🇧🇷', country: 'BR' },
  // Commodities & FX
  { symbol: 'GC=F', label: 'Gold', flag: 'Au', country: '' },
  { symbol: 'SI=F', label: 'Silver', flag: 'Ag', country: '' },
  { symbol: 'CL=F', label: 'Crude Oil WTI', flag: 'Oil', country: '' },
  { symbol: '^TNX', label: 'US 10Y Yield', flag: '10Y', country: '' },
  { symbol: 'EURUSD=X', label: 'EUR/USD', flag: '€/$', country: '' },
  { symbol: 'GBPUSD=X', label: 'GBP/USD', flag: '£/$', country: '' },
  { symbol: 'JPY=X', label: 'USD/JPY', flag: '¥/$', country: '' },
];

export class MarketRadarPanel extends Panel {
  private data: IndexData[] = [];
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private filter: 'all' | 'stocks' | 'commodities' = 'all';

  constructor() {
    super({ id: 'market-radar', title: 'Market Radar', className: 'market-radar-panel' });
    // className set in super
    this.fetchData();
    this.refreshTimer = setInterval(() => this.fetchData(), 60_000);
  }

  private async fetchData(): Promise<void> {
    try {
      this.showLoading();
      // Yahoo Finance spark API: max 20 symbols per request, batch if needed
      const allSymbols = INDICES.map(i => i.symbol);
      const batchSize = 18;
      const batches: string[][] = [];
      for (let i = 0; i < allSymbols.length; i += batchSize) {
        batches.push(allSymbols.slice(i, i + batchSize));
      }
      const results = await Promise.all(batches.map(async (batch) => {
        const symbols = batch.join(',');
        const resp = await fetch(`/api/yahoo-spark?symbols=${encodeURIComponent(symbols)}&range=5d&interval=1d`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      }));
      // Merge all batch results into one object
      const json: Record<string, any> = {};
      for (const result of results) {
        if (result.spark?.result) {
          // v8 spark format
          for (const item of result.spark.result) {
            if (item.symbol && item.response?.[0]?.indicators?.quote?.[0]) {
              const q = item.response[0];
              json[item.symbol] = {
                close: q.indicators.quote[0].close,
                timestamp: q.timestamp,
                chartPreviousClose: q.meta?.chartPreviousClose || q.meta?.previousClose,
              };
            }
          }
        } else {
          // Direct key format (older API response)
          Object.assign(json, result);
        }
      }

      this.data = INDICES.map(idx => {
        const spark = json?.[idx.symbol];
        if (!spark || !spark.close || spark.close.length === 0) {
          return {
            ...idx, name: idx.label, price: 0, change: 0,
            changePercent: 0, sparkline: [], marketState: 'UNKNOWN',
          };
        }
        const closes = spark.close;
        const currentPrice = closes[closes.length - 1];
        const prevClose = spark.chartPreviousClose || closes[0];
        const change = currentPrice - prevClose;
        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
        // Determine market state from timestamps
        const lastTimestamp = spark.timestamp?.[spark.timestamp.length - 1] || 0;
        const now = Date.now() / 1000;
        const isRecent = (now - lastTimestamp) < 86400; // within 24h
        return {
          symbol: idx.symbol,
          label: idx.label,
          name: idx.label,
          country: idx.country,
          flag: idx.flag,
          price: currentPrice,
          change,
          changePercent,
          sparkline: closes,
          marketState: isRecent ? 'REGULAR' : 'CLOSED',
        };
      });

      this.render();
      this.setDataBadge('live', `${this.data.length} indices`);
    } catch (err) {
      console.warn('[MarketRadar] fetch error:', err);
      this.setContent(`<div class="panel-error">Piyasa verileri yuklenemedi</div>`);
    }
  }

  private renderSparkline(data: number[], isPositive: boolean): string {
    if (!data || data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 80;
    const h = 24;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const color = isPositive ? '#00c853' : '#ff1744';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="market-sparkline">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" />
    </svg>`;
  }

  private render(): void {
    const filtered = this.filter === 'all' ? this.data :
      this.filter === 'stocks' ? this.data.filter(d => d.country !== '') :
        this.data.filter(d => d.country === '');

    const rows = filtered.map(d => {
      const isPositive = d.change >= 0;
      const changeColor = isPositive ? '#00c853' : '#ff1744';
      const arrow = isPositive ? '▲' : '▼';
      const stateClass = d.marketState === 'REGULAR' || d.marketState === 'OPEN' ? 'market-open' : 'market-closed';
      const priceStr = d.price >= 1000 ? d.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : d.price < 10 ? d.price.toFixed(4) : d.price.toFixed(2);
      const changeStr = Math.abs(d.change).toFixed(2);
      const pctStr = Math.abs(d.changePercent).toFixed(2);

      return `<div class="market-row">
        <div class="market-flag">${d.flag}</div>
        <div class="market-info">
          <span class="market-label">${d.label}</span>
          <span class="market-state ${stateClass}">${d.marketState === 'REGULAR' || d.marketState === 'OPEN' ? 'OPEN' : 'CLOSED'}</span>
        </div>
        <div class="market-price">${priceStr}</div>
        <div class="market-change" style="color:${changeColor}">
          <span>${arrow}${changeStr}</span>
          <span class="market-pct">${arrow}${pctStr}%</span>
        </div>
        <div class="market-chart">${this.renderSparkline(d.sparkline, isPositive)}</div>
      </div>`;
    }).join('');

    this.setContent(`
      <div class="market-radar-header">
        <div class="market-radar-filters">
          <button class="mr-filter-btn ${this.filter === 'all' ? 'active' : ''}" data-filter="all">ALL</button>
          <button class="mr-filter-btn ${this.filter === 'stocks' ? 'active' : ''}" data-filter="stocks">INDICES</button>
          <button class="mr-filter-btn ${this.filter === 'commodities' ? 'active' : ''}" data-filter="commodities">FX & COMMODITIES</button>
        </div>
        <span class="market-radar-badge">GLOBAL</span>
      </div>
      <div class="market-radar-list">${rows}</div>
    `);

    // Filter button handlers
    this.content.querySelectorAll('.mr-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter = (btn as HTMLElement).dataset.filter as typeof this.filter;
        this.render();
      });
    });
  }

  destroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    super.destroy();
  }
}
