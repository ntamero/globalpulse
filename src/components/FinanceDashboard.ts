/**
 * GlobalScope — Finance Dashboard
 *
 * OpenStock-style professional trading dashboard — 100% finance-focused.
 * TradingView widgets for charts, markets, heatmaps, screeners.
 * Finance TV live streams. Real-time RSS news from global channels.
 *
 * Layout: 2-column grid with tall panels (extended vertically).
 *
 * TradingView widgets are embedded using the official approach:
 *   createElement('script') + script.innerHTML = JSON.stringify(config)
 */

import { getCurrentTheme } from '@/utils';
import { formatTime } from '@/utils';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { ArticleOverlay } from './ArticleOverlay';
import type { NewsItem } from '@/types';

// ─── Finance TV Channels ─────────────────────────────────────
interface FinanceTVChannel {
  id: string;
  name: string;
  videoId: string;
  category: 'us' | 'europe' | 'middle-east' | 'asia';
  icon: string;
}

const FINANCE_TV_CHANNELS: FinanceTVChannel[] = [
  { id: 'bloomberg', name: 'Bloomberg TV', videoId: 'iEpJwprxDdk', category: 'us', icon: '\u{1F1FA}\u{1F1F8}' },
  { id: 'cnbc', name: 'CNBC', videoId: '9NyxcX3rhQs', category: 'us', icon: '\u{1F1FA}\u{1F1F8}' },
  { id: 'yahoo-finance', name: 'Yahoo Finance', videoId: 'KQp-e_XQnDE', category: 'us', icon: '\u{1F1FA}\u{1F1F8}' },
  { id: 'sky-news', name: 'Sky News Business', videoId: 'YDvsBbKfLPA', category: 'europe', icon: '\u{1F1EC}\u{1F1E7}' },
  { id: 'euronews', name: 'Euronews Business', videoId: '6aWYMmFsEKA', category: 'europe', icon: '\u{1F1EA}\u{1F1FA}' },
  { id: 'dw-news', name: 'DW Business', videoId: 'LuKwFajn37U', category: 'europe', icon: '\u{1F1E9}\u{1F1EA}' },
  { id: 'france24-en', name: 'France 24 Business', videoId: 'Ap-UM1O9RBU', category: 'europe', icon: '\u{1F1EB}\u{1F1F7}' },
  { id: 'aljazeera', name: 'Al Jazeera Business', videoId: 'gCNeDWCI0vo', category: 'middle-east', icon: '\u{1F1F6}\u{1F1E6}' },
  { id: 'alarabiya', name: 'Al Arabiya Business', videoId: 'n7eQejkXbnM', category: 'middle-east', icon: '\u{1F1F8}\u{1F1E6}' },
  { id: 'trt-world', name: 'TRT World Business', videoId: 'ABfFhWzWs0s', category: 'middle-east', icon: '\u{1F1F9}\u{1F1F7}' },
  { id: 'cna', name: 'CNA Markets', videoId: 'XWq5kBlakcQ', category: 'asia', icon: '\u{1F1F8}\u{1F1EC}' },
  { id: 'nhk-world', name: 'NHK World Business', videoId: 'f0lYkdA-Gtw', category: 'asia', icon: '\u{1F1EF}\u{1F1F5}' },
];

type TVCategory = 'all' | 'us' | 'europe' | 'middle-east' | 'asia';

// ─── Finance feed category keywords ─────────────────────────
const FINANCE_KEYWORDS = /\b(market|stock|nasdaq|dow|s&p|economy|inflation|gdp|fed |ecb|interest rate|bank|invest|crypto|bitcoin|currency|trade|tariff|earnings|ipo|debt|bond|oil price|commodity|forex|finance|wall street|ftse|nikkei|hang seng|treasury|yield|profit|revenue|merger|acquisition|hedge fund|etf|index fund|dividend|SEC|FOMC|rate hike|recession|bull|bear market|venture capital|startup|funding|IPO|underwrite)/i;

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

function embedTVWidget(
  container: HTMLElement,
  widgetJs: string,
  config: Record<string, unknown>,
): void {
  container.innerHTML = '';
  const widgetContainer = document.createElement('div');
  widgetContainer.className = 'tradingview-widget-container';
  widgetContainer.style.width = '100%';
  widgetContainer.style.height = '100%';

  const widgetDiv = document.createElement('div');
  widgetDiv.className = 'tradingview-widget-container__widget';
  widgetDiv.style.width = '100%';
  widgetDiv.style.height = '100%';
  widgetContainer.appendChild(widgetDiv);

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = `https://s3.tradingview.com/external-embedding/${widgetJs}`;
  script.async = true;
  script.innerHTML = JSON.stringify(config);
  widgetContainer.appendChild(script);

  container.appendChild(widgetContainer);
}

function fullscreenBtn(sectionId: string): string {
  return `<button class="fd-expand-btn" data-expand="${sectionId}" title="Tam Ekran">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
    </svg>
  </button>`;
}

// ─── Main Dashboard Class ───────────────────────────────────

export class FinanceDashboard {
  private container: HTMLElement | null = null;
  private activeChannel: FinanceTVChannel = FINANCE_TV_CHANNELS[0] as FinanceTVChannel;
  private activeCategory: TVCategory = 'all';
  private globalNewsItems: NewsItem[] = [];
  private financeNewsItems: NewsItem[] = [];

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
    document.querySelector('.fd-fullscreen-overlay')?.remove();
  }

  /**
   * Receive RSS news items from App.ts loadNews pipeline.
   * Split into global news and finance-specific news for Social Hub tabs.
   */
  public updateNews(items: NewsItem[]): void {
    // Split items into finance-specific and global
    const finance: NewsItem[] = [];
    const global: NewsItem[] = [];

    for (const item of items) {
      const text = `${item.title} ${item.source}`;
      if (FINANCE_KEYWORDS.test(text)) {
        finance.push(item);
      }
      global.push(item);
    }

    // Sort by date, newest first
    global.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    finance.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    this.globalNewsItems = global.slice(0, 100);
    this.financeNewsItems = finance.slice(0, 100);

    // Re-render the active news tab
    this.renderActiveNewsTab();
  }

  private render(): void {
    if (!this.container) return;
    const theme = getColorTheme();
    const locale = getLocale();

    const advChartUrl = `https://s.tradingview.com/widgetembed/?frameElementId=fd-adv&symbol=BITSTAMP%3ABTCUSD&interval=D&symboledit=1&saveimage=1&toolbarbg=${theme === 'dark' ? '1e1e1e' : 'f1f3f6'}&studies=MASimple%40tv-basicstudies%1FRSI%40tv-basicstudies&theme=${theme === 'dark' ? 'Dark' : 'Light'}&style=1&timezone=Etc%2FUTC&locale=${locale}&utm_source=globalpulse&utm_medium=widget&utm_campaign=chart`;

    // ============================================================
    // LAYOUT: 2-column grid, panels extended vertically (tall)
    // ============================================================
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
            <div class="fd-widget-container" style="height:700px;" id="fdMarketOverview"></div>
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

        <!-- Row 2: Stock Heatmap + Social Hub (side by side) -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section" id="fdStockHeatmapSection">
            <div class="fd-section-header">
              <span class="fd-section-icon">📊</span>
              <span class="fd-section-title">Stock Heatmap</span>
              ${fullscreenBtn('stockHeatmap')}
            </div>
            <div class="fd-widget-container" style="height:1200px;" id="fdStockHeatmap"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📰</span>
              <span class="fd-section-title">News & Social Hub</span>
              <div class="fd-social-tabs" id="fdSocialTabs">
                <button class="fd-social-tab active" data-stab="global">🌍 Global</button>
                <button class="fd-social-tab" data-stab="finance">💰 Finance</button>
                <button class="fd-social-tab" data-stab="tv">📺 TV</button>
              </div>
            </div>
            <div class="fd-social-panels">
              <div class="fd-social-panel active" id="fdSocialGlobal" style="height:1160px;overflow:hidden;">
                <div class="fd-news-list" id="fdGlobalNewsList">
                  <div class="fd-news-loading">Loading global news...</div>
                </div>
              </div>
              <div class="fd-social-panel" id="fdSocialFinance" style="height:1160px;overflow:hidden;">
                <div class="fd-news-list" id="fdFinanceNewsList">
                  <div class="fd-news-loading">Loading finance news...</div>
                </div>
              </div>
              <div class="fd-social-panel" id="fdSocialTV" style="height:1160px;overflow:hidden;">
              </div>
            </div>
          </div>
        </div>

        <!-- Row 3: Forex Cross Rates + Advanced Chart (side by side) — 2x height -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section" id="fdForexSection">
            <div class="fd-section-header">
              <span class="fd-section-icon">💱</span>
              <span class="fd-section-title">Forex Cross Rates</span>
              ${fullscreenBtn('forex')}
            </div>
            <div class="fd-widget-container" style="height:1200px;" id="fdForexCrossRates"></div>
          </div>
          <div class="fd-section" id="fdAdvChartSection">
            <div class="fd-section-header">
              <span class="fd-section-icon">🕯️</span>
              <span class="fd-section-title">Advanced Chart</span>
              ${fullscreenBtn('advChart')}
            </div>
            <div class="fd-widget-container" style="height:1200px;">
              <iframe id="fd-adv" src="${advChartUrl}" style="width:100%;height:100%;border:none;display:block;" allowtransparency="true"></iframe>
            </div>
          </div>
        </div>

        <!-- Row 4: Crypto Market + Economic Calendar (side by side) — 2x height -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">₿</span>
              <span class="fd-section-title">Cryptocurrency Market</span>
            </div>
            <div class="fd-widget-container" style="height:1200px;" id="fdCryptoMarket"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📅</span>
              <span class="fd-section-title">Economic Calendar</span>
            </div>
            <div class="fd-widget-container" style="height:1200px;" id="fdEconomicCalendar"></div>
          </div>
        </div>

        <!-- Row 5: Precious Metals + Energy Commodities (NEW — replaces old Crypto Heatmap + Finance News) -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🥇</span>
              <span class="fd-section-title">Precious Metals</span>
            </div>
            <div class="fd-widget-container" style="height:800px;" id="fdPreciousMetals"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🛢️</span>
              <span class="fd-section-title">Energy</span>
            </div>
            <div class="fd-widget-container" style="height:800px;" id="fdEnergy"></div>
          </div>
        </div>

        <!-- Row 6: Hotlists + Company Profile (side by side) — 2x height -->
        <div class="fd-grid fd-grid-2">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🔥</span>
              <span class="fd-section-title">Hotlists</span>
            </div>
            <div class="fd-widget-container" style="height:1200px;" id="fdHotlists"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📋</span>
              <span class="fd-section-title">Financials</span>
            </div>
            <div class="fd-widget-container" style="height:1200px;" id="fdFundamentalData"></div>
          </div>
        </div>

        <!-- Row 7: Mini Charts (3-column: Gold, Oil, S&P) — taller -->
        <div class="fd-grid fd-grid-3">
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🥇</span>
              <span class="fd-section-title">Gold</span>
            </div>
            <div class="fd-widget-container" style="height:500px;" id="fdMiniGold"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">🛢️</span>
              <span class="fd-section-title">Oil WTI</span>
            </div>
            <div class="fd-widget-container" style="height:500px;" id="fdMiniOil"></div>
          </div>
          <div class="fd-section">
            <div class="fd-section-header">
              <span class="fd-section-icon">📈</span>
              <span class="fd-section-title">S&P 500</span>
            </div>
            <div class="fd-widget-container" style="height:500px;" id="fdMiniSP"></div>
          </div>
        </div>
      </div>
    `;

    this.initWidgets();
    this.attachEventListeners();
    this.attachFullscreenListeners();
  }

  private initWidgets(): void {
    const theme = getColorTheme();
    const locale = getLocale();

    // 1. Ticker Tape
    const tickerTape = document.getElementById('fdTickerTape');
    if (tickerTape) {
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
          { proName: 'FX_IDC:USDTRY', title: 'USD/TRY' },
          { proName: 'BITSTAMP:BTCUSD', title: 'BTC/USD' },
          { proName: 'BITSTAMP:ETHUSD', title: 'ETH/USD' },
          { proName: 'TVC:GOLD', title: 'Gold' },
          { proName: 'TVC:USOIL', title: 'Oil WTI' },
          { proName: 'TVC:SILVER', title: 'Silver' },
          { proName: 'BINANCE:SOLUSDT', title: 'SOL/USDT' },
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
            { s: 'BIST:XU100', d: 'BIST 100' },
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
          { title: 'Bonds', symbols: [
            { s: 'TVC:US10Y', d: 'US 10Y' }, { s: 'TVC:US02Y', d: 'US 2Y' },
            { s: 'TVC:DE10Y', d: 'Germany 10Y' }, { s: 'TVC:GB10Y', d: 'UK 10Y' },
            { s: 'TVC:JP10Y', d: 'Japan 10Y' },
          ]},
        ],
      });
    }

    // 3. Stock Heatmap
    const stockHeatmap = document.getElementById('fdStockHeatmap');
    if (stockHeatmap) {
      embedTVWidget(stockHeatmap, 'embed-widget-stock-heatmap.js', {
        exchanges: [],
        dataSource: 'SPX500',
        grouping: 'sector',
        blockSize: 'market_cap_basic',
        blockColor: 'change',
        locale,
        symbolUrl: '',
        colorTheme: theme,
        hasTopBar: true,
        isDataSetEnabled: true,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        width: '100%',
        height: '100%',
      });
    }

    // 4. Social Hub — Tab 3 (Finance TV): TradingView timelines as fallback content
    this.initSocialHub(theme, locale);

    // 5. Forex Cross Rates
    const forexRates = document.getElementById('fdForexCrossRates');
    if (forexRates) {
      embedTVWidget(forexRates, 'embed-widget-forex-cross-rates.js', {
        width: '100%', height: '100%',
        currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'TRY'],
        isTransparent: false, colorTheme: theme, locale,
      });
    }

    // 6. Crypto Market Screener
    const cryptoMarket = document.getElementById('fdCryptoMarket');
    if (cryptoMarket) {
      embedTVWidget(cryptoMarket, 'embed-widget-screener.js', {
        width: '100%', height: '100%', defaultColumn: 'overview',
        screener_type: 'crypto_mkt', displayCurrency: 'USD',
        colorTheme: theme, locale, isTransparent: false,
      });
    }

    // 7. Economic Calendar
    const econCalendar = document.getElementById('fdEconomicCalendar');
    if (econCalendar) {
      embedTVWidget(econCalendar, 'embed-widget-events.js', {
        colorTheme: theme, isTransparent: false,
        width: '100%', height: '100%', locale,
        importanceFilter: '-1,0,1',
        countryFilter: 'us,eu,gb,de,jp,cn,tr',
      });
    }

    // 8. Precious Metals — Symbol Overview with Gold, Silver, Platinum
    const preciousMetals = document.getElementById('fdPreciousMetals');
    if (preciousMetals) {
      embedTVWidget(preciousMetals, 'embed-widget-symbol-overview.js', {
        symbols: [
          ['Gold', 'TVC:GOLD|12M'],
          ['Silver', 'TVC:SILVER|12M'],
          ['Platinum', 'TVC:PLATINUM|12M'],
        ],
        chartOnly: false,
        width: '100%',
        height: '100%',
        locale,
        colorTheme: theme,
        autosize: true,
        showVolume: false,
        showMA: false,
        hideDateRanges: false,
        hideMarketStatus: false,
        hideSymbolLogo: false,
        scalePosition: 'right',
        scaleMode: 'Normal',
        fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
        fontSize: '10',
        noTimeScale: false,
        valuesTracking: '1',
        changeMode: 'price-and-percent',
        chartType: 'area',
        lineWidth: 2,
        lineType: 0,
        dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
      });
    }

    // 9. Energy — Symbol Overview with Oil WTI, Brent, Natural Gas
    const energy = document.getElementById('fdEnergy');
    if (energy) {
      embedTVWidget(energy, 'embed-widget-symbol-overview.js', {
        symbols: [
          ['Oil WTI', 'TVC:USOIL|12M'],
          ['Brent', 'TVC:UKOIL|12M'],
          ['Natural Gas', 'TVC:NATURALGAS|12M'],
        ],
        chartOnly: false,
        width: '100%',
        height: '100%',
        locale,
        colorTheme: theme,
        autosize: true,
        showVolume: false,
        showMA: false,
        hideDateRanges: false,
        hideMarketStatus: false,
        hideSymbolLogo: false,
        scalePosition: 'right',
        scaleMode: 'Normal',
        fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
        fontSize: '10',
        noTimeScale: false,
        valuesTracking: '1',
        changeMode: 'price-and-percent',
        chartType: 'area',
        lineWidth: 2,
        lineType: 0,
        dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
      });
    }

    // 10. Hotlists
    const hotlists = document.getElementById('fdHotlists');
    if (hotlists) {
      embedTVWidget(hotlists, 'embed-widget-hotlists.js', {
        colorTheme: theme, dateRange: '12M', exchange: 'US',
        showChart: true, locale, width: '100%', height: '100%',
        isTransparent: false, showSymbolLogo: true,
      });
    }

    // 11. Fundamental Data
    const fundamentalData = document.getElementById('fdFundamentalData');
    if (fundamentalData) {
      embedTVWidget(fundamentalData, 'embed-widget-financials.js', {
        colorTheme: theme, isTransparent: false,
        largeChartUrl: '', displayMode: 'regular',
        width: '100%', height: '100%', symbol: 'NASDAQ:AAPL', locale,
      });
    }

    // 12. Mini Charts
    const miniGold = document.getElementById('fdMiniGold');
    if (miniGold) {
      embedTVWidget(miniGold, 'embed-widget-mini-symbol-overview.js', {
        symbol: 'TVC:GOLD', width: '100%', height: '100%',
        locale, dateRange: '1M', colorTheme: theme,
        isTransparent: false, autosize: true, largeChartUrl: '',
      });
    }

    const miniOil = document.getElementById('fdMiniOil');
    if (miniOil) {
      embedTVWidget(miniOil, 'embed-widget-mini-symbol-overview.js', {
        symbol: 'TVC:USOIL', width: '100%', height: '100%',
        locale, dateRange: '1M', colorTheme: theme,
        isTransparent: false, autosize: true, largeChartUrl: '',
      });
    }

    const miniSP = document.getElementById('fdMiniSP');
    if (miniSP) {
      embedTVWidget(miniSP, 'embed-widget-mini-symbol-overview.js', {
        symbol: 'FOREXCOM:SPXUSD', width: '100%', height: '100%',
        locale, dateRange: '1M', colorTheme: theme,
        isTransparent: false, autosize: true, largeChartUrl: '',
      });
    }
  }

  /**
   * Initialize the Social Hub with 3 tabs:
   * 1. Global News (RSS items from all feeds)
   * 2. Finance News (RSS items filtered for finance keywords)
   * 3. Finance TV (TradingView timelines — kept for live community content)
   */
  private initSocialHub(theme: string, locale: string): void {
    // Tab 3 (TV): Use TradingView timelines for live social/community content
    const tvPanel = document.getElementById('fdSocialTV');
    if (tvPanel) {
      tvPanel.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;height:100%;padding:4px;">
          <div id="fdTVTimeline1" style="height:100%;overflow:hidden;"></div>
          <div id="fdTVTimeline2" style="height:100%;overflow:hidden;"></div>
        </div>
      `;
      const tvTimeline1 = document.getElementById('fdTVTimeline1');
      const tvTimeline2 = document.getElementById('fdTVTimeline2');
      if (tvTimeline1) {
        embedTVWidget(tvTimeline1, 'embed-widget-timeline.js', {
          feedMode: 'market', market: 'stock',
          isTransparent: false, displayMode: 'regular',
          width: '100%', height: '100%', colorTheme: theme, locale,
        });
      }
      if (tvTimeline2) {
        embedTVWidget(tvTimeline2, 'embed-widget-timeline.js', {
          feedMode: 'market', market: 'crypto',
          isTransparent: false, displayMode: 'regular',
          width: '100%', height: '100%', colorTheme: theme, locale,
        });
      }
    }
  }

  /**
   * Render the active news tab (Global or Finance) with RSS items
   */
  private renderActiveNewsTab(): void {
    // Always render both tabs — the active one is visible via CSS
    this.renderNewsTab('fdGlobalNewsList', this.globalNewsItems);
    this.renderNewsTab('fdFinanceNewsList', this.financeNewsItems);
  }

  private renderNewsTab(containerId: string, items: NewsItem[]): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = '<div class="fd-news-loading">Loading news...</div>';
      return;
    }

    container.innerHTML = items.slice(0, 60).map(item => {
      const timeStr = formatTime(item.pubDate);
      const isAlert = item.isAlert || (item.threat && ['critical', 'high'].includes(item.threat.level));
      return `
        <div class="fd-news-item ${isAlert ? 'fd-news-alert' : ''}" data-article-url="${sanitizeUrl(item.link)}" data-article-title="${escapeHtml(item.title)}" data-article-source="${escapeHtml(item.source)}">
          <div class="fd-news-item-source">${escapeHtml(item.source)}</div>
          <div class="fd-news-item-title">${escapeHtml(item.title)}</div>
          <div class="fd-news-item-time">${timeStr}</div>
        </div>
      `;
    }).join('');

    // Attach click handlers for article overlay
    container.querySelectorAll<HTMLElement>('.fd-news-item').forEach(el => {
      el.addEventListener('click', (e) => {
        // Allow middle-click / ctrl+click to open in new tab
        if (e.ctrlKey || e.metaKey || (e as MouseEvent).button === 1) return;
        e.preventDefault();
        const url = el.dataset.articleUrl;
        const title = el.dataset.articleTitle;
        const source = el.dataset.articleSource;
        if (url) ArticleOverlay.show(url, title, source);
      });
    });
  }

  private attachSocialTabListeners(): void {
    if (!this.container) return;
    this.container.querySelectorAll<HTMLButtonElement>('.fd-social-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.stab;
        if (!tab) return;
        // Toggle active tab
        this.container!.querySelectorAll('.fd-social-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Toggle active panel
        this.container!.querySelectorAll('.fd-social-panel').forEach(p => p.classList.remove('active'));
        const panelMap: Record<string, string> = {
          global: 'fdSocialGlobal',
          finance: 'fdSocialFinance',
          tv: 'fdSocialTV',
        };
        const targetPanel = document.getElementById(panelMap[tab] || '');
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
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

    // TV category tabs
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

    // Social hub tabs
    this.attachSocialTabListeners();
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

  private attachFullscreenListeners(): void {
    if (!this.container) return;
    const theme = getColorTheme();
    const locale = getLocale();

    this.container.querySelectorAll<HTMLButtonElement>('.fd-expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.expand;
        if (!target) return;

        const overlay = document.createElement('div');
        overlay.className = 'fd-fullscreen-overlay';
        overlay.innerHTML = `
          <div class="fd-fullscreen-header">
            <span class="fd-fullscreen-title">${this.getFullscreenTitle(target)}</span>
            <button class="fd-fullscreen-close" title="Kapat (ESC)">&times;</button>
          </div>
          <div class="fd-fullscreen-body" id="fdFullscreenBody"></div>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        const body = document.getElementById('fdFullscreenBody')!;

        if (target === 'stockHeatmap') {
          embedTVWidget(body, 'embed-widget-stock-heatmap.js', {
            exchanges: [],
            dataSource: 'SPX500',
            grouping: 'sector',
            blockSize: 'market_cap_basic',
            blockColor: 'change',
            locale,
            symbolUrl: '',
            colorTheme: theme,
            hasTopBar: true,
            isDataSetEnabled: true,
            isZoomEnabled: true,
            hasSymbolTooltip: true,
            width: '100%', height: '100%',
          });
        } else if (target === 'forex') {
          embedTVWidget(body, 'embed-widget-forex-cross-rates.js', {
            width: '100%', height: '100%',
            currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'TRY', 'CNY', 'INR', 'BRL', 'MXN'],
            isTransparent: false, colorTheme: theme, locale,
          });
        } else if (target === 'advChart') {
          const fsChartUrl = `https://s.tradingview.com/widgetembed/?frameElementId=fd-adv-fs&symbol=BITSTAMP%3ABTCUSD&interval=D&symboledit=1&saveimage=1&toolbarbg=${theme === 'dark' ? '1e1e1e' : 'f1f3f6'}&studies=MASimple%40tv-basicstudies%1FRSI%40tv-basicstudies&theme=${theme === 'dark' ? 'Dark' : 'Light'}&style=1&timezone=Etc%2FUTC&locale=${locale}&utm_source=globalpulse&utm_medium=widget&utm_campaign=chart`;
          body.innerHTML = `<iframe id="fd-adv-fs" src="${fsChartUrl}" style="width:100%;height:100%;border:none;display:block;" allowtransparency="true"></iframe>`;
        }

        const closeOverlay = () => {
          overlay.remove();
          document.body.style.overflow = '';
        };

        overlay.querySelector('.fd-fullscreen-close')!.addEventListener('click', closeOverlay);
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) closeOverlay();
        });

        const escHandler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            closeOverlay();
            document.removeEventListener('keydown', escHandler);
          }
        };
        document.addEventListener('keydown', escHandler);
      });
    });
  }

  private getFullscreenTitle(target: string): string {
    switch (target) {
      case 'stockHeatmap': return '📊 Stock Heatmap';
      case 'forex': return '💱 Forex Cross Rates';
      case 'advChart': return '🕯️ Advanced Chart';
      default: return '';
    }
  }
}
