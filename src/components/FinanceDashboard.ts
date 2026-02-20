/**
 * GlobalPulse — Finance Dashboard
 *
 * OpenStock-style professional trading dashboard with TradingView widgets,
 * live market data, Finance TV streams, and economic calendar.
 * Replaces the standard panel grid when finance variant is active.
 */

import { getCurrentTheme } from '@/utils';

// ─── Finance TV Channels ────────────────────────────────────
interface FinanceTVChannel {
  id: string;
  name: string;
  youtubeId: string; // YouTube channel live stream ID or video ID
  category: 'us' | 'europe' | 'middle-east' | 'asia';
  icon: string;
}

const FINANCE_TV_CHANNELS: FinanceTVChannel[] = [
  // US
  { id: 'bloomberg', name: 'Bloomberg TV', youtubeId: 'dp8PhLsUcFE', category: 'us', icon: '🇺🇸' },
  { id: 'cnbc', name: 'CNBC', youtubeId: '9NyxcX3rhQs', category: 'us', icon: '🇺🇸' },
  { id: 'yahoo-finance', name: 'Yahoo Finance', youtubeId: 'FBpG1Kjoqz0', category: 'us', icon: '🇺🇸' },

  // Europe
  { id: 'euronews-biz', name: 'Euronews Business', youtubeId: 'pykpO5kQJ98', category: 'europe', icon: '🇪🇺' },
  { id: 'dw-news', name: 'DW News', youtubeId: 'GE_SfNVNyqk', category: 'europe', icon: '🇩🇪' },
  { id: 'france24-en', name: 'France 24', youtubeId: 'h3MuIUNCCzI', category: 'europe', icon: '🇫🇷' },

  // Middle East
  { id: 'aljazeera-biz', name: 'Al Jazeera English', youtubeId: 'F-POY4Q0QSI', category: 'middle-east', icon: '🇶🇦' },
  { id: 'trt-world', name: 'TRT World', youtubeId: 'CV5Fooi8c2I', category: 'middle-east', icon: '🇹🇷' },

  // Asia
  { id: 'cna', name: 'CNA 24/7', youtubeId: 'XWq5kBlakcQ', category: 'asia', icon: '🇸🇬' },
  { id: 'nhk-world', name: 'NHK World', youtubeId: 'f0lYkdA-Jto', category: 'asia', icon: '🇯🇵' },
];

type TVCategory = 'all' | 'us' | 'europe' | 'middle-east' | 'asia';

// ─── TradingView Widget Configs ─────────────────────────────

function getColorTheme(): 'dark' | 'light' {
  return getCurrentTheme() === 'dark' ? 'dark' : 'light';
}

function getLocale(): string {
  const stored = localStorage.getItem('globalpulse-lang');
  if (stored === 'tr') return 'tr';
  if (stored === 'ar') return 'ar';
  return 'en';
}

// ─── Main Dashboard Class ───────────────────────────────────

export class FinanceDashboard {
  private container: HTMLElement | null = null;
  private activeChannel: FinanceTVChannel = FINANCE_TV_CHANNELS[0] as FinanceTVChannel;
  private activeCategory: TVCategory = 'all';
  private widgetScripts: HTMLScriptElement[] = [];

  mount(target: HTMLElement): void {
    this.container = target;
    target.innerHTML = '';
    target.classList.add('finance-dashboard-host');
    this.render();
    // Delay widget loading to avoid blocking DOM paint
    requestAnimationFrame(() => {
      setTimeout(() => this.loadAllWidgets(), 100);
    });
  }

  destroy(): void {
    // Clean up injected scripts
    this.widgetScripts.forEach(s => s.remove());
    this.widgetScripts = [];
    if (this.container) {
      this.container.classList.remove('finance-dashboard-host');
      this.container.innerHTML = '';
    }
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="finance-dashboard">
        <!-- Ticker Tape -->
        <div class="fd-ticker-tape" id="fdTickerTape"></div>

        <!-- Row 1: Market Overview + Finance TV -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📊</span>
              <span class="fd-section-title">Market Overview</span>
            </div>
            <div class="fd-widget-container" id="fdMarketOverview" style="height:460px;"></div>
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
                src="https://www.youtube.com/embed/${this.activeChannel.youtubeId}?autoplay=0&mute=1&rel=0"
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
            <div class="fd-widget-container" id="fdTechnicalAnalysis" style="height:420px;"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">💱</span>
              <span class="fd-section-title">Forex Cross Rates</span>
            </div>
            <div class="fd-widget-container" id="fdForexRates" style="height:420px;"></div>
          </div>
        </div>

        <!-- Row 3: Advanced Chart (full width) -->
        <div class="fd-grid fd-grid-1">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🕯️</span>
              <span class="fd-section-title">Advanced Chart</span>
            </div>
            <div class="fd-widget-container" id="fdAdvancedChart" style="height:500px;"></div>
          </div>
        </div>

        <!-- Row 4: Crypto Market + Economic Calendar -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">₿</span>
              <span class="fd-section-title">Cryptocurrency Market</span>
            </div>
            <div class="fd-widget-container" id="fdCryptoMarket" style="height:460px;"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📅</span>
              <span class="fd-section-title">Economic Calendar</span>
            </div>
            <div class="fd-widget-container" id="fdEconomicCalendar" style="height:460px;"></div>
          </div>
        </div>

        <!-- Row 5: Stock Heatmap (full width) -->
        <div class="fd-grid fd-grid-1">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🗺️</span>
              <span class="fd-section-title">Stock Heatmap</span>
            </div>
            <div class="fd-widget-container" id="fdStockHeatmap" style="height:480px;"></div>
          </div>
        </div>

        <!-- Row 6: Top Stories + Hotlists -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🔥</span>
              <span class="fd-section-title">Hotlists</span>
            </div>
            <div class="fd-widget-container" id="fdHotlists" style="height:460px;"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📰</span>
              <span class="fd-section-title">Top Stories</span>
            </div>
            <div class="fd-widget-container" id="fdTopStories" style="height:460px;"></div>
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

    // TV category filter
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
            iframe.src = `https://www.youtube.com/embed/${channel.youtubeId}?autoplay=1&mute=0&rel=0`;
          }
          const list = this.container!.querySelector('#fdChannelList');
          if (list) list.innerHTML = this.renderChannelList();
          this.attachChannelListeners();
        }
      });
    });
  }

  // ─── TradingView Widget Loaders ─────────────────────────

  private loadAllWidgets(): void {
    this.loadTickerTape();
    this.loadMarketOverview();
    this.loadTechnicalAnalysis();
    this.loadForexCrossRates();
    this.loadAdvancedChart();
    this.loadCryptoMarket();
    this.loadEconomicCalendar();
    this.loadStockHeatmap();
    this.loadHotlists();
    this.loadTopStories();
  }

  private injectWidget(containerId: string, scriptSrc: string, config: Record<string, unknown>): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = scriptSrc;
    script.async = true;
    script.textContent = JSON.stringify(config);
    container.appendChild(script);
    this.widgetScripts.push(script);
  }

  private loadTickerTape(): void {
    const container = document.getElementById('fdTickerTape');
    if (!container) return;

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.textContent = JSON.stringify({
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
        { proName: 'TVC:SILVER', title: 'Silver' },
        { proName: 'FX_IDC:USDTRY', title: 'USD/TRY' },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: getColorTheme(),
      locale: getLocale(),
    });
    container.appendChild(script);
    this.widgetScripts.push(script);
  }

  private loadMarketOverview(): void {
    this.injectWidget('fdMarketOverview',
      'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js',
      {
        colorTheme: getColorTheme(),
        dateRange: '12M',
        showChart: true,
        locale: getLocale(),
        width: '100%',
        height: '100%',
        isTransparent: true,
        showSymbolLogo: true,
        showFloatingTooltip: true,
        tabs: [
          {
            title: 'Indices',
            symbols: [
              { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
              { s: 'FOREXCOM:NSXUSD', d: 'NASDAQ 100' },
              { s: 'INDEX:DEU40', d: 'DAX 40' },
              { s: 'FOREXCOM:UKXGBP', d: 'FTSE 100' },
              { s: 'INDEX:NKY', d: 'Nikkei 225' },
              { s: 'INDEX:HSI', d: 'Hang Seng' },
            ],
          },
          {
            title: 'Forex',
            symbols: [
              { s: 'FX_IDC:EURUSD', d: 'EUR/USD' },
              { s: 'FX_IDC:GBPUSD', d: 'GBP/USD' },
              { s: 'FX_IDC:USDJPY', d: 'USD/JPY' },
              { s: 'FX_IDC:USDCHF', d: 'USD/CHF' },
              { s: 'FX_IDC:AUDUSD', d: 'AUD/USD' },
              { s: 'FX_IDC:USDTRY', d: 'USD/TRY' },
            ],
          },
          {
            title: 'Crypto',
            symbols: [
              { s: 'BITSTAMP:BTCUSD', d: 'Bitcoin' },
              { s: 'BITSTAMP:ETHUSD', d: 'Ethereum' },
              { s: 'BINANCE:SOLUSDT', d: 'Solana' },
              { s: 'BINANCE:BNBUSDT', d: 'BNB' },
              { s: 'BINANCE:XRPUSDT', d: 'XRP' },
              { s: 'BINANCE:ADAUSDT', d: 'Cardano' },
            ],
          },
          {
            title: 'Commodities',
            symbols: [
              { s: 'TVC:GOLD', d: 'Gold' },
              { s: 'TVC:SILVER', d: 'Silver' },
              { s: 'TVC:USOIL', d: 'Crude Oil WTI' },
              { s: 'TVC:UKOIL', d: 'Brent Oil' },
              { s: 'TVC:PLATINUM', d: 'Platinum' },
              { s: 'NYMEX:NG1!', d: 'Natural Gas' },
            ],
          },
        ],
      }
    );
  }

  private loadTechnicalAnalysis(): void {
    this.injectWidget('fdTechnicalAnalysis',
      'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js',
      {
        interval: '1D',
        width: '100%',
        height: '100%',
        isTransparent: true,
        symbol: 'FOREXCOM:SPXUSD',
        showIntervalTabs: true,
        displayMode: 'single',
        locale: getLocale(),
        colorTheme: getColorTheme(),
      }
    );
  }

  private loadForexCrossRates(): void {
    this.injectWidget('fdForexRates',
      'https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js',
      {
        width: '100%',
        height: '100%',
        currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'TRY'],
        isTransparent: true,
        colorTheme: getColorTheme(),
        locale: getLocale(),
      }
    );
  }

  private loadAdvancedChart(): void {
    const container = document.getElementById('fdAdvancedChart');
    if (!container) return;

    const chartId = 'fd-advanced-chart-' + Date.now();
    const div = document.createElement('div');
    div.id = chartId;
    div.style.height = '100%';
    container.appendChild(div);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).TradingView) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: 'BITSTAMP:BTCUSD',
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: getColorTheme(),
          style: '1',
          locale: getLocale(),
          toolbar_bg: getColorTheme() === 'dark' ? '#1e1e1e' : '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          container_id: chartId,
          withdateranges: true,
          hide_volume: false,
          studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
        });
      }
    };
    container.appendChild(script);
    this.widgetScripts.push(script);
  }

  private loadCryptoMarket(): void {
    this.injectWidget('fdCryptoMarket',
      'https://s3.tradingview.com/external-embedding/embed-widget-screener.js',
      {
        width: '100%',
        height: '100%',
        defaultColumn: 'overview',
        screener_type: 'crypto_mkt',
        displayCurrency: 'USD',
        colorTheme: getColorTheme(),
        locale: getLocale(),
        isTransparent: true,
      }
    );
  }

  private loadEconomicCalendar(): void {
    this.injectWidget('fdEconomicCalendar',
      'https://s3.tradingview.com/external-embedding/embed-widget-events.js',
      {
        colorTheme: getColorTheme(),
        isTransparent: true,
        width: '100%',
        height: '100%',
        locale: getLocale(),
        importanceFilter: '-1,0,1',
        countryFilter: 'us,eu,gb,de,jp,cn,tr',
      }
    );
  }

  private loadStockHeatmap(): void {
    this.injectWidget('fdStockHeatmap',
      'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js',
      {
        exchanges: [],
        dataSource: 'SPX500',
        grouping: 'sector',
        blockSize: 'market_cap_basic',
        blockColor: 'change',
        locale: getLocale(),
        symbolUrl: '',
        colorTheme: getColorTheme(),
        hasTopBar: true,
        isDataSet498Enabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: '100%',
        height: '100%',
      }
    );
  }

  private loadHotlists(): void {
    this.injectWidget('fdHotlists',
      'https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js',
      {
        colorTheme: getColorTheme(),
        dateRange: '12M',
        exchange: 'US',
        showChart: true,
        locale: getLocale(),
        width: '100%',
        height: '100%',
        isTransparent: true,
        showSymbolLogo: true,
        showFloatingTooltip: false,
        plotLineColorGrowing: 'rgba(41, 191, 115, 1)',
        plotLineColorFalling: 'rgba(239, 83, 80, 1)',
        gridLineColor: 'rgba(42, 46, 57, 0)',
        scaleFontColor: 'rgba(209, 212, 220, 1)',
        belowLineFillColorGrowing: 'rgba(41, 191, 115, 0.12)',
        belowLineFillColorFalling: 'rgba(239, 83, 80, 0.12)',
        belowLineFillColorGrowingBottom: 'rgba(41, 191, 115, 0)',
        belowLineFillColorFallingBottom: 'rgba(239, 83, 80, 0)',
      }
    );
  }

  private loadTopStories(): void {
    this.injectWidget('fdTopStories',
      'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js',
      {
        feedMode: 'all_symbols',
        isTransparent: true,
        displayMode: 'regular',
        width: '100%',
        height: '100%',
        colorTheme: getColorTheme(),
        locale: getLocale(),
      }
    );
  }
}
