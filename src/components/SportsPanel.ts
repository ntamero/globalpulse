/**
 * GlobalPulse — Sports Panel
 *
 * Aggregates sports news from RSS feeds and shows
 * categorized by sport type. Integrates with the news ticker.
 */

import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';
import { formatTime } from '@/utils';
import type { NewsItem } from '@/types';

type SportCategory = 'all' | 'football' | 'basketball' | 'tennis' | 'cricket' | 'f1' | 'other';

const SPORT_CATEGORIES: { id: SportCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🏆' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'basketball', label: 'Basketball', icon: '🏀' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
  { id: 'cricket', label: 'Cricket', icon: '🏏' },
  { id: 'f1', label: 'F1 / Motor', icon: '🏎️' },
  { id: 'other', label: 'Other', icon: '🥇' },
];

// Keyword patterns for sport classification
const SPORT_PATTERNS: Record<SportCategory, RegExp> = {
  all: /.*/,
  football: /\b(football|soccer|premier league|la liga|bundesliga|serie a|ligue 1|champions league|europa league|world cup|euro \d{4}|mls|epl|uefa|fifa|goal|penalty|transfer|manager|coach|striker|defender|midfielder)\b/i,
  basketball: /\b(basketball|nba|euroleague|fiba|wnba|lakers|celtics|warriors|ncaa|march madness|slam dunk|three.?point|free throw)\b/i,
  tennis: /\b(tennis|wimbledon|australian open|french open|us open|roland garros|atp|wta|grand slam|nadal|djokovic|federer|sinner|alcaraz|sabalenka|swiatek)\b/i,
  cricket: /\b(cricket|ipl|t20|odi|test match|ashes|bcci|icc|wicket|over|innings|bowler|batsman|century)\b/i,
  f1: /\b(formula.?1|f1|grand prix|motorsport|nascar|indycar|motogp|le mans|rally|wrc|hamilton|verstappen|leclerc|pit stop|qualifying|pole position)\b/i,
  other: /\b(olympic|golf|rugby|baseball|mlb|nhl|hockey|boxing|mma|ufc|swimming|athletics|marathon|cycling|tour de france|skiing|snowboard|volleyball|handball|wrestling|esports)\b/i,
};

// RSS feed URLs for sports news
const SPORTS_FEEDS = [
  { name: 'BBC Sport', url: '/rss/bbc/sport/rss.xml' },
  { name: 'ESPN', url: '/rss/bbc/sport/football/rss.xml' },
];

export class SportsPanel extends Panel {
  private items: NewsItem[] = [];
  private activeCategory: SportCategory = 'all';
  private isLoading = false;

  constructor() {
    super({
      id: 'sports',
      title: '⚽ Sports',
      className: 'sports-panel',
      showCount: true,
      infoTooltip: 'Live sports news — football, basketball, tennis, cricket, motorsport, and more',
    });
    this.renderContent();
    this.fetchSportsNews();
  }

  /** Accept external sports news items (from main news pipeline) */
  public updateNews(allNews: NewsItem[]): void {
    // Filter news items that match sports keywords
    const sportsNews = allNews.filter(item => {
      const text = `${item.title} ${item.source}`.toLowerCase();
      return SPORT_PATTERNS.football.test(text) ||
        SPORT_PATTERNS.basketball.test(text) ||
        SPORT_PATTERNS.tennis.test(text) ||
        SPORT_PATTERNS.cricket.test(text) ||
        SPORT_PATTERNS.f1.test(text) ||
        SPORT_PATTERNS.other.test(text);
    });

    // Merge with existing, deduplicate by link
    const existingLinks = new Set(this.items.map(i => i.link));
    const newItems = sportsNews.filter(i => !existingLinks.has(i.link));
    if (newItems.length > 0) {
      this.items = [...newItems, ...this.items].slice(0, 200);
      this.renderContent();
    }
  }

  private async fetchSportsNews(): Promise<void> {
    this.isLoading = true;
    this.renderContent();

    try {
      // Try fetching BBC Sport RSS
      const resp = await fetch('/rss/bbc/sport/rss.xml', { signal: AbortSignal.timeout(10000) });
      if (resp.ok) {
        const text = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        const rssItems = doc.querySelectorAll('item');

        const parsed: NewsItem[] = [];
        rssItems.forEach(item => {
          const title = item.querySelector('title')?.textContent?.trim() || '';
          const link = item.querySelector('link')?.textContent?.trim() || '';
          const pubDate = item.querySelector('pubDate')?.textContent || '';

          if (title && link) {
            parsed.push({
              source: 'BBC Sport',
              title,
              link,
              pubDate: pubDate ? new Date(pubDate) : new Date(),
              isAlert: false,
            });
          }
        });

        if (parsed.length > 0) {
          const existingLinks = new Set(this.items.map(i => i.link));
          const newItems = parsed.filter(i => !existingLinks.has(i.link));
          this.items = [...newItems, ...this.items].slice(0, 200);
        }
      }
    } catch {
      // Silently fail — sports from main news pipeline will still show
    }

    this.isLoading = false;
    this.renderContent();
  }

  private classifySport(item: NewsItem): SportCategory {
    const text = `${item.title} ${item.source}`;
    if (SPORT_PATTERNS.football.test(text)) return 'football';
    if (SPORT_PATTERNS.basketball.test(text)) return 'basketball';
    if (SPORT_PATTERNS.tennis.test(text)) return 'tennis';
    if (SPORT_PATTERNS.cricket.test(text)) return 'cricket';
    if (SPORT_PATTERNS.f1.test(text)) return 'f1';
    if (SPORT_PATTERNS.other.test(text)) return 'other';
    return 'other';
  }

  private getFilteredItems(): NewsItem[] {
    if (this.activeCategory === 'all') return this.items;
    return this.items.filter(item => this.classifySport(item) === this.activeCategory);
  }

  private renderContent(): void {
    const filtered = this.getFilteredItems();

    if (this.isLoading && this.items.length === 0) {
      this.showLoading();
      return;
    }

    this.setContent(`
      <div class="sports-container">
        <div class="sports-categories" id="sportsCats">
          ${SPORT_CATEGORIES.map(cat => `
            <button class="sports-cat-btn ${cat.id === this.activeCategory ? 'active' : ''}"
                    data-category="${cat.id}">
              <span class="sports-cat-icon">${cat.icon}</span>
              <span class="sports-cat-label">${cat.label}</span>
            </button>
          `).join('')}
        </div>

        <div class="sports-feed" id="sportsFeed">
          ${filtered.length === 0 ? `
            <div class="sports-empty">
              <span>🏟️</span>
              <p>No sports news yet${this.activeCategory !== 'all' ? ' in this category' : ''}.</p>
              <p class="sports-empty-sub">Sports headlines will appear as they come in.</p>
            </div>
          ` : filtered.slice(0, 50).map(item => {
      const sport = this.classifySport(item);
      const catInfo = SPORT_CATEGORIES.find(c => c.id === sport);
      const timeStr = formatTime(item.pubDate);
      return `
              <a class="sports-item" href="${escapeHtml(item.link)}" target="_blank" rel="noopener"
                 title="${escapeHtml(item.source)} — ${escapeHtml(item.title)}">
                <span class="sports-item-icon">${catInfo?.icon || '🏆'}</span>
                <div class="sports-item-content">
                  <span class="sports-item-title">${escapeHtml(item.title)}</span>
                  <span class="sports-item-meta">
                    <span class="sports-item-source">${escapeHtml(item.source)}</span>
                    <span class="sports-item-time">${timeStr}</span>
                  </span>
                </div>
              </a>
            `;
    }).join('')}
        </div>
      </div>
    `);

    this.setCount(filtered.length);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.querySelectorAll('.sports-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = (btn as HTMLElement).dataset.category as SportCategory;
        this.renderContent();
      });
    });
  }
}
