/**
 * GlobalPulse — Finance Dashboard
 *
 * OpenStock-style professional trading dashboard with TradingView widgets,
 * live market data, Finance TV streams, and economic calendar.
 * Replaces the standard panel grid when finance variant is active.
 *
 * TradingView widgets are embedded using srcdoc iframes — each widget gets
 * a self-contained HTML document with the standard TradingView embed code.
 * This is the only reliable way to load TV widgets dynamically because
 * their scripts read config from script.textContent which requires inline HTML.
 */

import { getCurrentTheme } from '@/utils';

// ─── Finance TV Channels ────────────────────────────────────
interface FinanceTVChannel {
  id: string;
  name: string;
  embedUrl: string;
  category: 'us' | 'europe' | 'middle-east' | 'asia';
  icon: string;
}

// Use YouTube channel IDs with live_stream parameter for permanent embeds
const FINANCE_TV_CHANNELS: FinanceTVChannel[] = [
  { id: 'bloomberg', name: 'Bloomberg TV', embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ68-rmLgsfw', category: 'us', icon: '🇺🇸' },
  { id: 'yahoo-finance', name: 'Yahoo Finance', embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCEAZeUIeJs0IjQiqTCdVSIg', category: 'us', icon: '🇺🇸' },
  { id: 'euronews', name: 'Euronews', embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCW2QcKZiU8aUGg4yxCIditg', category: 'europe', icon: '🇪🇺' },
  { id: 'dw-news', name: 'DW News', embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCknLrEdhRCp1aegoMqRaCZg', category: 'europe', icon: '🇩🇪' },
  { id: 'france24-en', name: 'France 24', embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCQfwfsi5VrQ8yKZ-UWmAEFg', category: 'europe', icon: '🇫🇷' },
  { id: 'sky-news', name: 'Sky News', embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCoMdktPbSTixAyNGwb-UYkQ', category: 'europe', icon: '🇬🇧' },
  { id: 'aljazeera', name: 'Al Jazeera English', embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg', category: 'middle-east', icon: '🇶🇦' },
  { id: 'trt-world', name: 'TRT World', embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC7fWeaHhqgM4Lba7ziMi1pA', category: 'middle-east', icon: '🇹🇷' },
  { id: 'cna', name: 'CNA 24/7', embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCo8bcnLyZH8tBIH9V1mLgqQ', category: 'asia', icon: '🇸🇬' },
  { id: 'nhk-world', name: 'NHK World', embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCi2KnMb3eVfzPoXAMPvEwTg', category: 'asia', icon: '🇯🇵' },
];

type TVCategory = 'all' | 'us' | 'europe' | 'middle-east' | 'asia';

// ─── Helpers ────────────────────────────────────────────────

function getColorTheme(): 'dark' | 'light' {
  return getCurrentTheme() === 'dark' ? 'dark' : 'light';
}

function getLocale(): string {
  const stored = localStorage.getItem('globalpulse-lang');
  if (stored === 'tr') return 'tr';
  if (stored === 'ar') return 'ar';
  return 'en';
}

/**
 * Create a srcdoc iframe that contains a self-contained TradingView widget.
 * This is the ONLY reliable way to dynamically load TV widgets because
 * their embed scripts read config from inline script.textContent.
 */
function tvWidgetIframe(widgetJs: string, config: Record<string, unknown>, height: string = '100%'): string {
  const theme = getColorTheme();
  const bgColor = theme === 'dark' ? '#131722' : '#ffffff';
  const configJson = JSON.stringify(config).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // srcdoc must be a complete HTML document — the script reads its own textContent
  return `<iframe srcdoc='<!DOCTYPE html><html><head><style>body{margin:0;padding:0;overflow:hidden;background:${bgColor}}</style></head><body><div class=&quot;tradingview-widget-container&quot;><div class=&quot;tradingview-widget-container__widget&quot;></div><script type=&quot;text/javascript&quot; src=&quot;https://s3.tradingview.com/external-embedding/${widgetJs}&quot; async>${configJson}</script></div></body></html>' style="width:100%;height:${height};border:none;display:block;" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox" allowtransparency="true"></iframe>`;
}

// ─── Main Dashboard Class ───────────────────────────────────

export class FinanceDashboard {
  private container: HTMLElement | null = null;
  private activeChannel: FinanceTVChannel = FINANCE_TV_CHANNELS[0] as FinanceTVChannel;
  private activeCategory: TVCategory = 'all';

  mount(target: HTMLElement): void {
    this.container = target;
    target.innerHTML = '';
    target.classList.add('finance-dashboard-host');
    this.render();
  }

  destroy(): void {
    if (this.container) {
      this.container.classList.remove('finance-dashboard-host');
      this.container.innerHTML = '';
    }
  }

  private render(): void {
    if (!this.container) return;
    const theme = getColorTheme();
    const locale = getLocale();

    // ── TradingView Widget Configs ──
    const tickerTapeConfig = {
      symbols: [
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
        { proName: 'FOREXCOM:NSXUSD', title: 'NASDAQ' },
        { proName: 'INDEX:DEU40', title: 'DAX' },
        { proName: 'INDEX:NKY', title: 'Nikkei' },
        { proName: 'FX_IDC:EURUSD', title: 'EUR/USD' },
        { proName: 'FX_IDC:GBPUSD', title: 'GBP/USD' },
        { proName: 'FX_IDC:USDJPY', title: 'USD/JPY' },
        { proName: 'BITSTAMP:BTCUSD', title: 'BTC/USD' },
        { proName: 'BITSTAMP:ETHUSD', title: 'ETH/USD' },
        { proName: 'TVC:GOLD', title: 'Gold' },
        { proName: 'TVC:USOIL', title: 'Oil WTI' },
        { proName: 'FX_IDC:USDTRY', title: 'USD/TRY' },
      ],
      showSymbolLogo: true, isTransparent: false, displayMode: 'adaptive',
      colorTheme: theme, locale,
    };

    const marketOverviewConfig = {
      colorTheme: theme, dateRange: '12M', showChart: true, locale,
      width: '100%', height: '100%', isTransparent: false,
      showSymbolLogo: true, showFloatingTooltip: true,
      tabs: [
        { title: 'Indices', symbols: [
          { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' }, { s: 'FOREXCOM:NSXUSD', d: 'NASDAQ 100' },
          { s: 'INDEX:DEU40', d: 'DAX 40' }, { s: 'FOREXCOM:UKXGBP', d: 'FTSE 100' },
          { s: 'INDEX:NKY', d: 'Nikkei 225' }, { s: 'INDEX:HSI', d: 'Hang Seng' },
        ]},
        { title: 'Forex', symbols: [
          { s: 'FX_IDC:EURUSD', d: 'EUR/USD' }, { s: 'FX_IDC:GBPUSD', d: 'GBP/USD' },
          { s: 'FX_IDC:USDJPY', d: 'USD/JPY' }, { s: 'FX_IDC:USDCHF', d: 'USD/CHF' },
          { s: 'FX_IDC:AUDUSD', d: 'AUD/USD' }, { s: 'FX_IDC:USDTRY', d: 'USD/TRY' },
        ]},
        { title: 'Crypto', symbols: [
          { s: 'BITSTAMP:BTCUSD', d: 'Bitcoin' }, { s: 'BITSTAMP:ETHUSD', d: 'Ethereum' },
          { s: 'BINANCE:SOLUSDT', d: 'Solana' }, { s: 'BINANCE:BNBUSDT', d: 'BNB' },
          { s: 'BINANCE:XRPUSDT', d: 'XRP' }, { s: 'BINANCE:ADAUSDT', d: 'Cardano' },
        ]},
        { title: 'Commodities', symbols: [
          { s: 'TVC:GOLD', d: 'Gold' }, { s: 'TVC:SILVER', d: 'Silver' },
          { s: 'TVC:USOIL', d: 'Crude Oil WTI' }, { s: 'TVC:UKOIL', d: 'Brent Oil' },
          { s: 'TVC:PLATINUM', d: 'Platinum' }, { s: 'NYMEX:NG1!', d: 'Natural Gas' },
        ]},
      ],
    };

    const technicalAnalysisConfig = {
      interval: '1D', width: '100%', height: '100%', isTransparent: false,
      symbol: 'FOREXCOM:SPXUSD', showIntervalTabs: true,
      displayMode: 'single', locale, colorTheme: theme,
    };

    const forexCrossRatesConfig = {
      width: '100%', height: '100%',
      currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'TRY'],
      isTransparent: false, colorTheme: theme, locale,
    };

    const cryptoMarketConfig = {
      width: '100%', height: '100%', defaultColumn: 'overview',
      screener_type: 'crypto_mkt', displayCurrency: 'USD',
      colorTheme: theme, locale, isTransparent: false,
    };

    const economicCalendarConfig = {
      colorTheme: theme, isTransparent: false,
      width: '100%', height: '100%', locale,
      importanceFilter: '-1,0,1',
      countryFilter: 'us,eu,gb,de,jp,cn,tr',
    };

    const stockHeatmapConfig = {
      exchanges: [] as string[], dataSource: 'SPX500', grouping: 'sector',
      blockSize: 'market_cap_basic', blockColor: 'change', locale,
      symbolUrl: '', colorTheme: theme, hasTopBar: true,
      isZoomEnabled: true, hasSymbolTooltip: true,
      isMonoSize: false, width: '100%', height: '100%',
    };

    const hotlistsConfig = {
      colorTheme: theme, dateRange: '12M', exchange: 'US',
      showChart: true, locale, width: '100%', height: '100%',
      isTransparent: false, showSymbolLogo: true,
    };

    const topStoriesConfig = {
      feedMode: 'all_symbols', isTransparent: false,
      displayMode: 'regular', width: '100%', height: '100%',
      colorTheme: theme, locale,
    };

    // Advanced chart via widgetembed URL (different from embed widgets)
    const advChartUrl = `https://s3.tradingview.com/widgetembed/?frameElementId=fd-adv&symbol=BITSTAMP%3ABTCUSD&interval=D&symboledit=1&saveimage=1&toolbarbg=${theme === 'dark' ? '1e1e1e' : 'f1f3f6'}&studies=MASimple%40tv-basicstudies%1FRSI%40tv-basicstudies&theme=${theme === 'dark' ? 'Dark' : 'Light'}&style=1&timezone=Etc%2FUTC&locale=${locale}&utm_source=globalpulse&utm_medium=widget&utm_campaign=chart`;

    this.container.innerHTML = `
      <div class="finance-dashboard">
        <!-- Ticker Tape -->
        <div class="fd-ticker-tape">
          ${tvWidgetIframe('embed-widget-ticker-tape.js', tickerTapeConfig, '46px')}
        </div>

        <!-- Row 1: Market Overview + Finance TV -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📊</span>
              <span class="fd-section-title">Market Overview</span>
            </div>
            <div class="fd-widget-container" style="height:460px;">
              ${tvWidgetIframe('embed-widget-market-overview.js', marketOverviewConfig)}
            </div>
          </div>
          <div class="fd-section fd-tv-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📺</span>
              <span class="fd-section-title">Finance TV</span>
              <div class="fd-tv-categories" id="fdTVCategories">
                <button class="fd-tv-cat active" data-cat="all">All</button>
                <button class="fd-tv-cat" data-cat="us">US</button>
                <button class="fd-tv-cat" data-cat="europe">EU</button>
                <button class="fd-tv-cat" data-cat="middle-east">ME</button>
                <button class="fd-tv-cat" data-cat="asia">Asia</button>
              </div>
            </div>
            <div class="fd-tv-player" id="fdTVPlayer">
              <iframe
                id="fdTVIframe"
                src="${this.activeChannel.embedUrl}&autoplay=0&mute=1&rel=0"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
            <div class="fd-channel-list" id="fdChannelList">
              ${this.renderChannelList()}
            </div>
          </div>
        </div>

        <!-- Row 2: Technical Analysis + Forex Cross Rates -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📈</span>
              <span class="fd-section-title">Technical Analysis</span>
            </div>
            <div class="fd-widget-container" style="height:420px;">
              ${tvWidgetIframe('embed-widget-technical-analysis.js', technicalAnalysisConfig)}
            </div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">💱</span>
              <span class="fd-section-title">Forex Cross Rates</span>
            </div>
            <div class="fd-widget-container" style="height:420px;">
              ${tvWidgetIframe('embed-widget-forex-cross-rates.js', forexCrossRatesConfig)}
            </div>
          </div>
        </div>

        <!-- Row 3: Advanced Chart (full width) -->
        <div class="fd-grid fd-grid-1">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🕯️</span>
              <span class="fd-section-title">Advanced Chart</span>
            </div>
            <div class="fd-widget-container" style="height:500px;">
              <iframe id="fd-adv" src="${advChartUrl}" style="width:100%;height:100%;border:none;display:block;" allowtransparency="true" loading="lazy"></iframe>
            </div>
          </div>
        </div>

        <!-- Row 4: Crypto Market + Economic Calendar -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">₿</span>
              <span class="fd-section-title">Cryptocurrency Market</span>
            </div>
            <div class="fd-widget-container" style="height:460px;">
              ${tvWidgetIframe('embed-widget-screener.js', cryptoMarketConfig)}
            </div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📅</span>
              <span class="fd-section-title">Economic Calendar</span>
            </div>
            <div class="fd-widget-container" style="height:460px;">
              ${tvWidgetIframe('embed-widget-events.js', economicCalendarConfig)}
            </div>
          </div>
        </div>

        <!-- Row 5: Stock Heatmap (full width) -->
        <div class="fd-grid fd-grid-1">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🗺️</span>
              <span class="fd-section-title">Stock Heatmap</span>
            </div>
            <div class="fd-widget-container" style="height:480px;">
              ${tvWidgetIframe('embed-widget-stock-heatmap.js', stockHeatmapConfig)}
            </div>
          </div>
        </div>

        <!-- Row 6: Hotlists + Top Stories -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🔥</span>
              <span class="fd-section-title">Hotlists</span>
            </div>
            <div class="fd-widget-container" style="height:460px;">
              ${tvWidgetIframe('embed-widget-hotlists.js', hotlistsConfig)}
            </div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📰</span>
              <span class="fd-section-title">Top Stories</span>
            </div>
            <div class="fd-widget-container" style="height:460px;">
              ${tvWidgetIframe('embed-widget-timeline.js', topStoriesConfig)}
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderChannelList(): string {
    const channels = this.activeCategory === 'all'
      ? FINANCE_TV_CHANNELS
      : FINANCE_TV_CHANNELS.filter(c => c.category === this.activeCategory);

    return channels.map(ch => `
      <button class="fd-channel ${ch.id === this.activeChannel.id ? 'active' : ''}"
              data-channel-id="${ch.id}">
        <span class="fd-channel-icon">${ch.icon}</span>
        <span class="fd-channel-name">${ch.name}</span>
        ${ch.id === this.activeChannel.id ? '<span class="fd-channel-live">LIVE</span>' : ''}
      </button>
    `).join('');
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    this.container.querySelectorAll<HTMLButtonElement>('.fd-tv-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.dataset.cat as TVCategory;
        this.container!.querySelectorAll('.fd-tv-cat').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const list = this.container!.querySelector('#fdChannelList');
        if (list) list.innerHTML = this.renderChannelList();
        this.attachChannelListeners();
      });
    });

    this.attachChannelListeners();
  }

  private attachChannelListeners(): void {
    if (!this.container) return;
    this.container.querySelectorAll<HTMLButtonElement>('.fd-channel').forEach(btn => {
      btn.addEventListener('click', () => {
        const channelId = btn.dataset.channelId;
        const channel = FINANCE_TV_CHANNELS.find(c => c.id === channelId);
        if (channel && channel.id !== this.activeChannel.id) {
          this.activeChannel = channel;
          const iframe = this.container!.querySelector('#fdTVIframe') as HTMLIFrameElement;
          if (iframe) {
            iframe.src = `${channel.embedUrl}&autoplay=1&mute=0&rel=0`;
          }
          const list = this.container!.querySelector('#fdChannelList');
          if (list) list.innerHTML = this.renderChannelList();
          this.attachChannelListeners();
        }
      });
    });
  }
}
