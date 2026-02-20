/**
 * GlobalPulse — Finance Dashboard
 *
 * OpenStock-style professional trading dashboard with TradingView widgets,
 * live market data, Finance TV streams, and economic calendar.
 * Replaces the standard panel grid when finance variant is active.
 *
 * TradingView widgets are embedded using the official approach:
 *   createElement('script') + script.innerHTML = JSON.stringify(config)
 * This is the method used by all major framework wrapper libraries (React, SolidJS, etc.)
 * because TradingView embed scripts read their config from script element's textContent.
 */

import { getCurrentTheme } from '@/utils';

// ─── Finance TV Channels ────────────────────────────────────
interface FinanceTVChannel {
  id: string;
  name: string;
  videoId: string; // YouTube video ID (semi-permanent for 24/7 streams)
  category: 'us' | 'europe' | 'middle-east' | 'asia';
  icon: string;
}

// Verified YouTube live stream video IDs as of Feb 2026
// These are semi-permanent — 24/7 channels keep the same ID for months/years
const FINANCE_TV_CHANNELS: FinanceTVChannel[] = [
  { id: 'bloomberg', name: 'Bloomberg TV', videoId: 'iEpJwprxDdk', category: 'us', icon: '🇺🇸' },
  { id: 'cnbc', name: 'CNBC', videoId: '9NyxcX3rhQs', category: 'us', icon: '🇺🇸' },
  { id: 'yahoo-finance', name: 'Yahoo Finance', videoId: 'KQp-e_XQnDE', category: 'us', icon: '🇺🇸' },
  { id: 'sky-news', name: 'Sky News', videoId: 'YDvsBbKfLPA', category: 'europe', icon: '🇬🇧' },
  { id: 'euronews', name: 'Euronews', videoId: '6aWYMmFsEKA', category: 'europe', icon: '🇪🇺' },
  { id: 'dw-news', name: 'DW News', videoId: 'LuKwFajn37U', category: 'europe', icon: '🇩🇪' },
  { id: 'france24-en', name: 'France 24', videoId: 'Ap-UM1O9RBU', category: 'europe', icon: '🇫🇷' },
  { id: 'aljazeera', name: 'Al Jazeera English', videoId: 'gCNeDWCI0vo', category: 'middle-east', icon: '🇶🇦' },
  { id: 'alarabiya', name: 'Al Arabiya', videoId: 'n7eQejkXbnM', category: 'middle-east', icon: '🇸🇦' },
  { id: 'trt-world', name: 'TRT World', videoId: 'ABfFhWzWs0s', category: 'middle-east', icon: '🇹🇷' },
  { id: 'cna', name: 'CNA 24/7', videoId: 'XWq5kBlakcQ', category: 'asia', icon: '🇸🇬' },
  { id: 'nhk-world', name: 'NHK World', videoId: 'f0lYkdA-Gtw', category: 'asia', icon: '🇯🇵' },
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
 * Embed a TradingView widget into a container element.
 * Uses createElement('script') + innerHTML approach — the battle-tested
 * method used by react-tradingview-embed and solid-tradingview-widgets.
 */
function embedTVWidget(
  container: HTMLElement,
  widgetJs: string,
  config: Record<string, unknown>,
): void {
  // Clear any previous content
  container.innerHTML = '';

  // Create widget container structure
  const widgetContainer = document.createElement('div');
  widgetContainer.className = 'tradingview-widget-container';
  widgetContainer.style.width = '100%';
  widgetContainer.style.height = '100%';

  const widgetDiv = document.createElement('div');
  widgetDiv.className = 'tradingview-widget-container__widget';
  widgetDiv.style.width = '100%';
  widgetDiv.style.height = '100%';
  widgetContainer.appendChild(widgetDiv);

  // Create script element — TV embed reads config from script.innerHTML
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = `https://s3.tradingview.com/external-embedding/${widgetJs}`;
  script.async = true;
  script.innerHTML = JSON.stringify(config);
  widgetContainer.appendChild(script);

  container.appendChild(widgetContainer);
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

    // Build the HTML skeleton (without TradingView widgets — those are injected via JS)
    const advChartUrl = `https://s.tradingview.com/widgetembed/?frameElementId=fd-adv&symbol=BITSTAMP%3ABTCUSD&interval=D&symboledit=1&saveimage=1&toolbarbg=${theme === 'dark' ? '1e1e1e' : 'f1f3f6'}&studies=MASimple%40tv-basicstudies%1FRSI%40tv-basicstudies&theme=${theme === 'dark' ? 'Dark' : 'Light'}&style=1&timezone=Etc%2FUTC&locale=${getLocale()}&utm_source=globalpulse&utm_medium=widget&utm_campaign=chart`;

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
            <div class="fd-widget-container" style="height:460px;" id="fdMarketOverview"></div>
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
                src="https://www.youtube.com/embed/${this.activeChannel.videoId}?autoplay=0&mute=1&rel=0&modestbranding=1"
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
            <div class="fd-widget-container" style="height:420px;" id="fdTechnicalAnalysis"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">💱</span>
              <span class="fd-section-title">Forex Cross Rates</span>
            </div>
            <div class="fd-widget-container" style="height:420px;" id="fdForexCrossRates"></div>
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
              <iframe id="fd-adv" src="${advChartUrl}" style="width:100%;height:100%;border:none;display:block;" allowtransparency="true"></iframe>
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
            <div class="fd-widget-container" style="height:460px;" id="fdCryptoMarket"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📅</span>
              <span class="fd-section-title">Economic Calendar</span>
            </div>
            <div class="fd-widget-container" style="height:460px;" id="fdEconomicCalendar"></div>
          </div>
        </div>

        <!-- Row 5: Stock Heatmap (full width) -->
        <div class="fd-grid fd-grid-1">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🗺️</span>
              <span class="fd-section-title">Stock Heatmap</span>
            </div>
            <div class="fd-widget-container" style="height:480px;" id="fdStockHeatmap"></div>
          </div>
        </div>

        <!-- Row 6: Hotlists + Top Stories -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🔥</span>
              <span class="fd-section-title">Hotlists</span>
            </div>
            <div class="fd-widget-container" style="height:460px;" id="fdHotlists"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📰</span>
              <span class="fd-section-title">Top Stories</span>
            </div>
            <div class="fd-widget-container" style="height:460px;" id="fdTopStories"></div>
          </div>
        </div>
      </div>
    `;

    // Now inject TradingView widgets programmatically
    this.initWidgets();
    this.attachEventListeners();
  }

  /**
   * Inject all TradingView widgets using the createElement + innerHTML approach.
   * This runs AFTER the skeleton HTML is inserted, so all container elements exist.
   */
  private initWidgets(): void {
    const theme = getColorTheme();
    const locale = getLocale();

    // 1. Ticker Tape
    const tickerTape = document.getElementById('fdTickerTape');
    if (tickerTape) {
      // Ticker tape needs special handling — fixed height container
      tickerTape.style.height = '46px';
      tickerTape.style.overflow = 'hidden';
      embedTVWidget(tickerTape, 'embed-widget-ticker-tape.js', {
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
      });
    }

    // 2. Market Overview
    const marketOverview = document.getElementById('fdMarketOverview');
    if (marketOverview) {
      embedTVWidget(marketOverview, 'embed-widget-market-overview.js', {
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
      });
    }

    // 3. Technical Analysis
    const techAnalysis = document.getElementById('fdTechnicalAnalysis');
    if (techAnalysis) {
      embedTVWidget(techAnalysis, 'embed-widget-technical-analysis.js', {
        interval: '1D', width: '100%', height: '100%', isTransparent: false,
        symbol: 'FOREXCOM:SPXUSD', showIntervalTabs: true,
        displayMode: 'single', locale, colorTheme: theme,
      });
    }

    // 4. Forex Cross Rates
    const forexRates = document.getElementById('fdForexCrossRates');
    if (forexRates) {
      embedTVWidget(forexRates, 'embed-widget-forex-cross-rates.js', {
        width: '100%', height: '100%',
        currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'TRY'],
        isTransparent: false, colorTheme: theme, locale,
      });
    }

    // 5. Crypto Market Screener
    const cryptoMarket = document.getElementById('fdCryptoMarket');
    if (cryptoMarket) {
      embedTVWidget(cryptoMarket, 'embed-widget-screener.js', {
        width: '100%', height: '100%', defaultColumn: 'overview',
        screener_type: 'crypto_mkt', displayCurrency: 'USD',
        colorTheme: theme, locale, isTransparent: false,
      });
    }

    // 6. Economic Calendar
    const econCalendar = document.getElementById('fdEconomicCalendar');
    if (econCalendar) {
      embedTVWidget(econCalendar, 'embed-widget-events.js', {
        colorTheme: theme, isTransparent: false,
        width: '100%', height: '100%', locale,
        importanceFilter: '-1,0,1',
        countryFilter: 'us,eu,gb,de,jp,cn,tr',
      });
    }

    // 7. Stock Heatmap
    const stockHeatmap = document.getElementById('fdStockHeatmap');
    if (stockHeatmap) {
      embedTVWidget(stockHeatmap, 'embed-widget-stock-heatmap.js', {
        exchanges: [] as string[], dataSource: 'SPX500', grouping: 'sector',
        blockSize: 'market_cap_basic', blockColor: 'change', locale,
        symbolUrl: '', colorTheme: theme, hasTopBar: true,
        isZoomEnabled: true, hasSymbolTooltip: true,
        isMonoSize: false, width: '100%', height: '100%',
      });
    }

    // 8. Hotlists
    const hotlists = document.getElementById('fdHotlists');
    if (hotlists) {
      embedTVWidget(hotlists, 'embed-widget-hotlists.js', {
        colorTheme: theme, dateRange: '12M', exchange: 'US',
        showChart: true, locale, width: '100%', height: '100%',
        isTransparent: false, showSymbolLogo: true,
      });
    }

    // 9. Top Stories
    const topStories = document.getElementById('fdTopStories');
    if (topStories) {
      embedTVWidget(topStories, 'embed-widget-timeline.js', {
        feedMode: 'all_symbols', isTransparent: false,
        displayMode: 'regular', width: '100%', height: '100%',
        colorTheme: theme, locale,
      });
    }
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
            iframe.src = `https://www.youtube.com/embed/${channel.videoId}?autoplay=1&mute=0&rel=0&modestbranding=1`;
          }
          const list = this.container!.querySelector('#fdChannelList');
          if (list) list.innerHTML = this.renderChannelList();
          this.attachChannelListeners();
        }
      });
    });
  }
}
