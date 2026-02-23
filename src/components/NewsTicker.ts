import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { formatTime } from '@/utils';
import { ArticleOverlay } from './ArticleOverlay';
import type { NewsItem } from '@/types';

export type TickerCategory = 'all' | 'politics' | 'finance' | 'tech' | 'sports' | 'crisis';

interface TickerConfig {
  categories: { id: TickerCategory; label: string; icon: string }[];
  speed: number; // pixels per second
  onItemClick?: (item: NewsItem) => void;
}

const DEFAULT_CONFIG: TickerConfig = {
  categories: [
    { id: 'all', label: 'Global', icon: '🌍' },
    { id: 'politics', label: 'Politics', icon: '🏛' },
    { id: 'finance', label: 'Finance', icon: '📈' },
    { id: 'tech', label: 'Tech', icon: '💻' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'crisis', label: 'Crisis', icon: '⚠' },
  ],
  speed: 40,
};

// Map feed categories to ticker categories
const FEED_TO_TICKER: Record<string, TickerCategory> = {
  politics: 'politics',
  gov: 'politics',
  thinktanks: 'politics',
  finance: 'finance',
  energy: 'finance',
  tech: 'tech',
  ai: 'tech',
  startups: 'tech',
  security: 'tech',
  hardware: 'tech',
  cloud: 'tech',
  dev: 'tech',
  crisis: 'crisis',
  middleeast: 'crisis',
  regional: 'crisis',
  africa: 'crisis',
};

export class NewsTicker {
  private container: HTMLElement;
  private activeCategory: TickerCategory = 'all';
  private allItems: Map<TickerCategory, NewsItem[]> = new Map();
  private config: TickerConfig;
  private animationId: number | null = null;
  private scrollPosition = 0;
  private isPaused = false;
  private tickerTrack: HTMLElement | null = null;
  private contentWidth = 0;
  private lastTimestamp = 0;
  private itemCounter = 0;

  constructor(config: Partial<TickerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.container = document.createElement('div');
    this.container.className = 'news-ticker';
    this.container.id = 'newsTicker';
    this.render();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="ticker-bar">
        <div class="ticker-live-badge">
          <span class="ticker-live-dot"></span>
          LIVE
        </div>
        <div class="ticker-categories" id="tickerCategories">
          ${this.config.categories.map(cat => `
            <button class="ticker-cat-btn ${cat.id === this.activeCategory ? 'active' : ''}"
                    data-category="${cat.id}">
              <span class="ticker-cat-icon">${cat.icon}</span>
              <span class="ticker-cat-label">${cat.label}</span>
            </button>
          `).join('')}
        </div>
        <div class="ticker-viewport" id="tickerViewport">
          <div class="ticker-track" id="tickerTrack"></div>
        </div>
      </div>
    `;

    this.tickerTrack = this.container.querySelector('#tickerTrack');
    const viewport = this.container.querySelector('#tickerViewport') as HTMLElement;

    // Category buttons
    this.container.querySelectorAll('.ticker-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = (btn as HTMLElement).dataset.category as TickerCategory;
        this.setCategory(category);
      });
    });

    // Pause on hover
    viewport?.addEventListener('mouseenter', () => {
      this.isPaused = true;
    });
    viewport?.addEventListener('mouseleave', () => {
      this.isPaused = false;
    });

    this.startAnimation();
  }

  public setCategory(category: TickerCategory): void {
    this.activeCategory = category;
    this.container.querySelectorAll('.ticker-cat-btn').forEach(btn => {
      const el = btn as HTMLElement;
      el.classList.toggle('active', el.dataset.category === category);
    });
    this.scrollPosition = 0;
    this.renderTickerItems();
  }

  public updateNews(items: NewsItem[], feedCategory?: string): void {
    const tickerCategory = feedCategory ? (FEED_TO_TICKER[feedCategory] || 'all') : 'all';

    // Add to 'all' bucket
    const allItems = this.allItems.get('all') || [];
    const existingLinks = new Set(allItems.map(i => i.link));
    const newItems = items.filter(i => !existingLinks.has(i.link));

    if (newItems.length > 0) {
      allItems.unshift(...newItems);
      // Keep max 200 items per category
      if (allItems.length > 200) allItems.splice(200);
      this.allItems.set('all', allItems);
    }

    // Add to specific category bucket
    if (tickerCategory !== 'all') {
      const catItems = this.allItems.get(tickerCategory) || [];
      const catLinks = new Set(catItems.map(i => i.link));
      const newCatItems = items.filter(i => !catLinks.has(i.link));
      if (newCatItems.length > 0) {
        catItems.unshift(...newCatItems);
        if (catItems.length > 200) catItems.splice(200);
        this.allItems.set(tickerCategory, catItems);
      }
    }

    this.renderTickerItems();
  }

  public addNewsItems(items: NewsItem[]): void {
    // Bulk add — categorize by title keywords
    const allItems = this.allItems.get('all') || [];
    const existingLinks = new Set(allItems.map(i => i.link));
    const newItems = items.filter(i => !existingLinks.has(i.link));

    if (newItems.length === 0) return;

    allItems.unshift(...newItems);
    if (allItems.length > 300) allItems.splice(300);
    this.allItems.set('all', allItems);

    // Auto-categorize into buckets
    for (const item of newItems) {
      const cats = this.inferCategories(item);
      for (const cat of cats) {
        const bucket = this.allItems.get(cat) || [];
        bucket.unshift(item);
        if (bucket.length > 200) bucket.splice(200);
        this.allItems.set(cat, bucket);
      }
    }

    this.renderTickerItems();
  }

  private inferCategories(item: NewsItem): TickerCategory[] {
    const text = `${item.title} ${item.source}`.toLowerCase();
    const cats: TickerCategory[] = [];

    // Politics
    if (/\b(politi|president|congress|parliament|senate|election|vote|diplomat|sanction|treaty|nato|un |eu |g7|summit|minister|government|law|legislation|referendum|impeach)\b/i.test(text)) {
      cats.push('politics');
    }

    // Finance
    if (/\b(market|stock|nasdaq|dow|s&p|economy|inflation|gdp|fed |ecb|interest rate|bank|invest|crypto|bitcoin|currency|trade|tariff|earnings|ipo|debt|bond|oil price|commodity)\b/i.test(text)) {
      cats.push('finance');
    }

    // Tech
    if (/\b(tech|ai |artificial intelligence|openai|google|apple|microsoft|meta|amazon|nvidia|chip|semiconductor|startup|cyber|hack|software|cloud|robot|quantum|spacex|tesla|blockchain)\b/i.test(text)) {
      cats.push('tech');
    }

    // Sports
    if (/\b(sport|football|soccer|nba|nfl|tennis|cricket|olympic|world cup|champion|league|match|tournament|athlete|medal|goal|score|transfer|playoff|super bowl|uefa|fifa)\b/i.test(text)) {
      cats.push('sports');
    }

    // Crisis
    if (/\b(war|conflict|attack|bomb|missile|military|troops|earthquake|hurricane|flood|wildfire|disaster|emergency|evacuat|casualt|killed|crisis|protest|riot|terror|explosion|hostage|siege|famine)\b/i.test(text)) {
      cats.push('crisis');
    }

    return cats;
  }

  private renderTickerItems(): void {
    if (!this.tickerTrack) return;

    const items = this.allItems.get(this.activeCategory) || this.allItems.get('all') || [];

    if (items.length === 0) {
      this.tickerTrack.innerHTML = `
        <span class="ticker-item ticker-loading">
          Loading latest news...
        </span>
      `;
      return;
    }

    // Sort by date (newest first)
    const sorted = [...items].sort((a, b) => {
      const da = a.pubDate instanceof Date ? a.pubDate.getTime() : new Date(a.pubDate).getTime();
      const db = b.pubDate instanceof Date ? b.pubDate.getTime() : new Date(b.pubDate).getTime();
      return db - da;
    });

    // Take top 50 for ticker
    const top = sorted.slice(0, 50);

    this.tickerTrack.innerHTML = top.map((item, idx) => {
      this.itemCounter++;
      const timeStr = formatTime(item.pubDate);
      const isAlert = item.isAlert || (item.threat && ['critical', 'high'].includes(item.threat.level));
      return `
        <a class="ticker-item ${isAlert ? 'ticker-alert' : ''}"
           href="${sanitizeUrl(item.link)}"
           data-article-url="${sanitizeUrl(item.link)}"
           data-article-title="${escapeHtml(item.title)}"
           data-article-source="${escapeHtml(item.source)}"
           data-idx="${idx}"
           title="${escapeHtml(item.source)} - ${escapeHtml(item.title)}">
          <span class="ticker-num">#${this.itemCounter - top.length + idx + 1}</span>
          <span class="ticker-source">${escapeHtml(item.source)}</span>
          <span class="ticker-text">${escapeHtml(item.title)}</span>
          <span class="ticker-time">${timeStr}</span>
        </a>
        <span class="ticker-separator">|</span>
      `;
    }).join('');

    // Duplicate for seamless loop
    this.tickerTrack.innerHTML += this.tickerTrack.innerHTML;

    // Attach click handler for article overlay on ticker items
    this.tickerTrack.querySelectorAll<HTMLAnchorElement>('.ticker-item').forEach(el => {
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

    // Calculate widths for scroll loop
    requestAnimationFrame(() => {
      this.contentWidth = this.tickerTrack!.scrollWidth / 2;
    });
  }

  private startAnimation(): void {
    const animate = (timestamp: number) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const delta = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      if (!this.isPaused && this.contentWidth > 0) {
        this.scrollPosition += this.config.speed * delta;
        if (this.scrollPosition >= this.contentWidth) {
          this.scrollPosition -= this.contentWidth;
        }
        if (this.tickerTrack) {
          this.tickerTrack.style.transform = `translateX(-${this.scrollPosition}px)`;
        }
      }

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
