/**
 * GlobalScope — Sports Hub
 *
 * Comprehensive sports dashboard with:
 * - Live scores (ESPN API)
 * - Breaking sports news (RSS)
 * - Sports TV channels (YouTube)
 * - Upcoming matches / schedule
 * - AI match predictions (Groq)
 * - League standings
 *
 * Architecture follows FinanceDashboard pattern:
 * multi-section 2-column grid with independent scrollable sections.
 */

import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';
import { formatTime } from '@/utils';
import type { NewsItem } from '@/types';
import { resolveMatchCoords, resolveF1Coords, resolveCricketCoords } from '@/data/stadium-coords';
import type { SportsMatchMarker } from './MapContainer';

// ─── Sport Types ────────────────────────────────────────────────
type SportId = 'soccer' | 'basketball' | 'tennis' | 'f1' | 'cricket' | 'all';

interface SportConfig {
  id: SportId;
  label: string;
  icon: string;
  espnSport: string;
  defaultLeague: string;
  leagues: { id: string; name: string; flag: string }[];
}

const SPORTS: SportConfig[] = [
  {
    id: 'soccer',
    label: 'Football',
    icon: '⚽',
    espnSport: 'soccer',
    defaultLeague: 'eng.1',
    leagues: [
      { id: 'eng.1', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { id: 'esp.1', name: 'La Liga', flag: '🇪🇸' },
      { id: 'ger.1', name: 'Bundesliga', flag: '🇩🇪' },
      { id: 'ita.1', name: 'Serie A', flag: '🇮🇹' },
      { id: 'fra.1', name: 'Ligue 1', flag: '🇫🇷' },
      { id: 'tur.1', name: 'Süper Lig', flag: '🇹🇷' },
      { id: 'uefa.champions', name: 'Champions League', flag: '🏆' },
      { id: 'uefa.europa', name: 'Europa League', flag: '🏆' },
      { id: 'usa.1', name: 'MLS', flag: '🇺🇸' },
    ],
  },
  {
    id: 'basketball',
    label: 'Basketball',
    icon: '🏀',
    espnSport: 'basketball',
    defaultLeague: 'nba',
    leagues: [
      { id: 'nba', name: 'NBA', flag: '🇺🇸' },
      { id: 'wnba', name: 'WNBA', flag: '🇺🇸' },
    ],
  },
  {
    id: 'tennis',
    label: 'Tennis',
    icon: '🎾',
    espnSport: 'tennis',
    defaultLeague: 'atp',
    leagues: [
      { id: 'atp', name: 'ATP Tour', flag: '🎾' },
      { id: 'wta', name: 'WTA Tour', flag: '🎾' },
    ],
  },
  {
    id: 'f1',
    label: 'F1 / Motor',
    icon: '🏎️',
    espnSport: 'racing',
    defaultLeague: 'f1',
    leagues: [
      { id: 'f1', name: 'Formula 1', flag: '🏎️' },
    ],
  },
  {
    id: 'cricket',
    label: 'Cricket',
    icon: '🏏',
    espnSport: 'cricket',
    defaultLeague: 'icc',
    leagues: [
      { id: 'icc', name: 'ICC', flag: '🏏' },
    ],
  },
];

// News keyword patterns per sport
const SPORT_NEWS_PATTERNS: Record<string, RegExp> = {
  soccer: /\b(football|soccer|premier league|la liga|bundesliga|serie a|ligue 1|champions league|europa league|world cup|euro \d{4}|mls|epl|uefa|fifa|goal|penalty|transfer|manager|coach|striker|defender|midfielder)\b/i,
  basketball: /\b(basketball|nba|euroleague|fiba|wnba|lakers|celtics|warriors|ncaa|march madness|slam dunk|three.?point|free throw|playoffs|draft)\b/i,
  tennis: /\b(tennis|wimbledon|australian open|french open|us open|roland garros|atp|wta|grand slam|nadal|djokovic|federer|sinner|alcaraz|sabalenka|swiatek)\b/i,
  f1: /\b(formula.?1|f1|grand prix|motorsport|nascar|indycar|motogp|le mans|rally|wrc|hamilton|verstappen|leclerc|pit stop|qualifying|pole position)\b/i,
  cricket: /\b(cricket|ipl|t20|odi|test match|ashes|bcci|icc|wicket|over|innings|bowler|batsman|century)\b/i,
  all: /\b(football|soccer|basketball|nba|tennis|wimbledon|formula.?1|f1|grand prix|cricket|ipl|golf|rugby|baseball|mlb|nhl|hockey|boxing|mma|ufc|olympic|swimming|cycling|marathon|esports|premier league|la liga|champions league|world cup|transfer|playoff|championship|tournament|medal|victory|defeat)\b/i,
};

// ─── Sports TV Channels ────────────────────────────────────────
interface SportsTVChannel {
  id: string;
  name: string;
  videoId: string;
  category: 'general' | 'football' | 'us' | 'motorsport';
  icon: string;
}

const SPORTS_TV_CHANNELS: SportsTVChannel[] = [
  { id: 'sky-sports', name: 'Sky Sports News', videoId: 'w9Ti1BXGU6g', category: 'general', icon: '📺' },
  { id: 'bein-en', name: 'beIN Sports Xtra', videoId: 'NAv1o6Jl5Cg', category: 'general', icon: '📺' },
  { id: 'eurosport', name: 'Eurosport', videoId: 'Gp9MIaBJfAs', category: 'general', icon: '📺' },
  { id: 'dazn', name: 'DAZN', videoId: 'hm2K8TLx0PM', category: 'general', icon: '📺' },
  { id: 'bein-tr', name: 'beIN Sports TR', videoId: 'XZHIM_5kxqc', category: 'football', icon: '⚽' },
  { id: 'bt-sport', name: 'TNT Sports', videoId: '85dBNToWWqU', category: 'football', icon: '⚽' },
  { id: 'futbol-tv', name: 'Football Daily', videoId: 'eQriE0G_6fo', category: 'football', icon: '⚽' },
  { id: 'espn', name: 'ESPN', videoId: 'dSgHhN6OuQE', category: 'us', icon: '🇺🇸' },
  { id: 'fox-sports', name: 'Fox Sports', videoId: '_s3OtMMGe4M', category: 'us', icon: '🇺🇸' },
  { id: 'nba-tv', name: 'NBA TV', videoId: 'rL73oVdgrRA', category: 'us', icon: '🏀' },
  { id: 'nfl-net', name: 'NFL Network', videoId: 'v4FGPFK8b8Y', category: 'us', icon: '🏈' },
  { id: 'f1-tv', name: 'F1 TV', videoId: 'BvRb7p0XrZU', category: 'motorsport', icon: '🏎️' },
  { id: 'motogp', name: 'MotoGP', videoId: 'nBnN5YH_X64', category: 'motorsport', icon: '🏍️' },
];

type TVCategory = 'all' | 'general' | 'football' | 'us' | 'motorsport';

// ─── Interfaces ─────────────────────────────────────────────────
interface MatchData {
  id: string;
  name: string;
  shortName: string;
  date: string;
  league: string;
  leagueAbbr: string;
  status: {
    state: 'pre' | 'in' | 'post';
    detail: string;
    shortDetail: string;
    completed: boolean;
    period: number;
    clock: string;
  };
  home: { name: string; abbr: string; logo: string; score: string; winner: boolean };
  away: { name: string; abbr: string; logo: string; score: string; winner: boolean };
  venue: string;
  broadcast: string;
}

interface StandingEntry {
  team: string;
  abbr: string;
  logo: string;
  group: string;
  stats: Record<string, string>;
}

// ─── Main Class ─────────────────────────────────────────────────

export class SportsPanel extends Panel {
  private newsItems: NewsItem[] = [];
  private activeSport: SportId = 'soccer';
  private activeLeague = 'eng.1';
  private activeTVCategory: TVCategory = 'all';
  private activeTVChannel: SportsTVChannel = SPORTS_TV_CHANNELS[0]!;
  private matches: MatchData[] = [];
  private standings: StandingEntry[] = [];
  private standingsLeagueName = '';
  private isLoadingScores = false;
  private isLoadingStandings = false;
  private predictionCache = new Map<string, { text: string; ts: number }>();
  private activePredictionId: string | null = null;
  private predictionText = '';
  private isPredicting = false;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({
      id: 'sports',
      title: '⚽ Sports Hub',
      className: 'sports-panel',
      showCount: true,
      infoTooltip: 'Live scores, news, TV, predictions — football, basketball, tennis, F1, cricket',
    });
    this.renderFull();
    this.loadScores();
    this.loadStandings();
    this.refreshTimer = setInterval(() => this.loadScores(), 60000);
  }

  public updateNews(allNews: NewsItem[]): void {
    const pattern = SPORT_NEWS_PATTERNS.all!;
    const sportsNews = allNews.filter(item => pattern.test(`${item.title} ${item.source}`));
    const existingLinks = new Set(this.newsItems.map(i => i.link));
    const newItems = sportsNews.filter(i => !existingLinks.has(i.link));
    if (newItems.length > 0) {
      this.newsItems = [...newItems, ...this.newsItems].slice(0, 200);
      this.renderNewsSection();
    }
    this.setCount(this.newsItems.length);
  }

  public destroy(): void {
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
  }

  // ─── Data Loading ───────────────────────────────────────────
  private async loadScores(): Promise<void> {
    if (this.activeSport === 'all') return;
    const sport = SPORTS.find(s => s.id === this.activeSport);
    if (!sport) return;
    this.isLoadingScores = true;
    this.renderScoresSection();
    try {
      const res = await fetch(`/api/sports-scores?sport=${sport.espnSport}&league=${this.activeLeague}`, { signal: AbortSignal.timeout(12000) });
      if (res.ok) { const data = await res.json(); this.matches = data.matches || []; }
    } catch { /* silent */ }
    this.isLoadingScores = false;
    this.renderScoresSection();
    this.renderScheduleSection();
    this.dispatchMapMarkers();
  }

  private async loadStandings(): Promise<void> {
    if (this.activeSport === 'all') return;
    const sport = SPORTS.find(s => s.id === this.activeSport);
    if (!sport) return;
    this.isLoadingStandings = true;
    this.renderStandingsSection();
    try {
      const res = await fetch(`/api/sports-scores?sport=${sport.espnSport}&league=${this.activeLeague}&view=standings`, { signal: AbortSignal.timeout(12000) });
      if (res.ok) { const data = await res.json(); this.standings = data.entries || []; this.standingsLeagueName = data.leagueName || ''; }
    } catch { /* silent */ }
    this.isLoadingStandings = false;
    this.renderStandingsSection();
  }

  private async loadPrediction(match: MatchData): Promise<void> {
    const cacheKey = match.id;
    const cached = this.predictionCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 3600000) {
      this.activePredictionId = cacheKey;
      this.predictionText = cached.text;
      this.renderPredictionsSection();
      return;
    }
    this.isPredicting = true;
    this.activePredictionId = cacheKey;
    this.predictionText = '';
    this.renderPredictionsSection();
    try {
      const prompt = `Analyze this upcoming sports match and provide a brief prediction (max 150 words):\n\nMatch: ${match.home.name} vs ${match.away.name}\nCompetition: ${match.league}\nDate: ${match.date}\n\nProvide:\n1. Predicted winner or draw\n2. Predicted score\n3. Key factors (form, injuries, head-to-head)\n4. Confidence level (Low/Medium/High)\n\nBe concise and direct.`;
      const res = await fetch('/api/groq-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 300 }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        this.predictionText = data.summary || data.text || 'Prediction unavailable.';
        this.predictionCache.set(cacheKey, { text: this.predictionText, ts: Date.now() });
      } else { this.predictionText = 'AI prediction service unavailable.'; }
    } catch { this.predictionText = 'Failed to generate prediction.'; }
    this.isPredicting = false;
    this.renderPredictionsSection();
  }

  // ─── Sport / League Switching ─────────────────────────────────
  private switchSport(sportId: SportId): void {
    this.activeSport = sportId;
    const sport = SPORTS.find(s => s.id === sportId);
    if (sport) this.activeLeague = sport.defaultLeague;
    this.matches = [];
    this.standings = [];
    this.activePredictionId = null;
    this.predictionText = '';
    this.renderFull();
    if (sportId !== 'all') { this.loadScores(); this.loadStandings(); }
  }

  private switchLeague(leagueId: string): void {
    this.activeLeague = leagueId;
    this.matches = [];
    this.standings = [];
    this.renderFull();
    this.loadScores();
    this.loadStandings();
  }

  // ─── Map Integration ─────────────────────────────────────────
  private dispatchMapMarkers(): void {
    const sport = SPORTS.find(s => s.id === this.activeSport);
    if (!sport || this.matches.length === 0) return;

    const markers: SportsMatchMarker[] = this.matches.map(m => {
      let coords: [number, number];
      if (sport.espnSport === 'racing') {
        coords = resolveF1Coords(m.venue || m.name);
      } else if (sport.espnSport === 'cricket') {
        coords = resolveCricketCoords(m.venue || m.name);
      } else {
        coords = resolveMatchCoords(m.home.abbr, m.away.abbr, this.activeLeague, m.venue);
      }

      return {
        id: m.id,
        homeTeam: m.home.name,
        awayTeam: m.away.name,
        homeAbbr: m.home.abbr,
        awayAbbr: m.away.abbr,
        homeLogo: m.home.logo,
        awayLogo: m.away.logo,
        score: m.status.state === 'pre' ? 'vs' : `${m.home.score}-${m.away.score}`,
        status: m.status.state === 'in' ? 'live' as const : m.status.state === 'post' ? 'finished' as const : 'upcoming' as const,
        statusDetail: m.status.shortDetail || m.status.detail || '',
        league: m.league,
        leagueAbbr: m.leagueAbbr,
        venue: m.venue,
        lat: coords[0],
        lng: coords[1],
        sport: sport.espnSport,
      };
    });

    window.dispatchEvent(new CustomEvent('sports-matches-update', { detail: markers }));
  }

  private panToMatch(match: MatchData): void {
    const sport = SPORTS.find(s => s.id === this.activeSport);
    if (!sport) return;
    let coords: [number, number];
    if (sport.espnSport === 'racing') {
      coords = resolveF1Coords(match.venue || match.name);
    } else if (sport.espnSport === 'cricket') {
      coords = resolveCricketCoords(match.venue || match.name);
    } else {
      coords = resolveMatchCoords(match.home.abbr, match.away.abbr, this.activeLeague, match.venue);
    }
    window.dispatchEvent(new CustomEvent('sports-match-focus', {
      detail: { lat: coords[0], lng: coords[1], zoom: 6 },
    }));
  }

  // ─── Main Render ──────────────────────────────────────────────
  private renderFull(): void {
    const sportConfig = SPORTS.find(s => s.id === this.activeSport);

    this.setContent(`
      <div class="sports-hub">
        <div class="sports-hub-sports">
          ${SPORTS.map(s => `
            <button class="shub-sport ${s.id === this.activeSport ? 'active' : ''}" data-sport="${s.id}">
              <span>${s.icon}</span><span>${s.label}</span>
            </button>
          `).join('')}
          <button class="shub-sport ${this.activeSport === 'all' ? 'active' : ''}" data-sport="all">
            <span>🏆</span><span>All</span>
          </button>
        </div>

        ${this.activeSport !== 'all' && sportConfig && sportConfig.leagues.length > 1 ? `
          <div class="sports-hub-leagues">
            ${sportConfig.leagues.map(l => `
              <button class="shub-league ${l.id === this.activeLeague ? 'active' : ''}" data-league="${l.id}">
                ${l.flag} ${l.name}
              </button>
            `).join('')}
          </div>
        ` : ''}

        <div class="shub-grid">
          <div class="shub-col">
            <div class="shub-section">
              <div class="shub-section-hdr">
                <span>📺 Sports TV</span>
                <div class="shub-tv-cats">
                  ${(['all', 'general', 'football', 'us', 'motorsport'] as TVCategory[]).map(cat => `
                    <button class="shub-tv-cat ${cat === this.activeTVCategory ? 'active' : ''}" data-tvcat="${cat}">
                      ${cat === 'all' ? 'All' : cat === 'general' ? '📺' : cat === 'football' ? '⚽' : cat === 'us' ? '🇺🇸' : '🏎️'}
                    </button>
                  `).join('')}
                </div>
              </div>
              <div class="shub-tv-player">
                <iframe id="sportsTVIframe"
                  src="https://www.youtube.com/embed/${this.activeTVChannel.videoId}?autoplay=0&mute=1&rel=0&modestbranding=1"
                  frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
              </div>
              <div class="shub-tv-channels" id="sportsTVChannels">${this.renderTVChannels()}</div>
            </div>

            <div class="shub-section">
              <div class="shub-section-hdr">
                <span>📰 Breaking News</span>
                <span class="shub-count" id="sportsNewsCount">${this.getFilteredNews().length}</span>
              </div>
              <div class="shub-section-body shub-news" id="sportsNewsList">${this.renderNewsList()}</div>
            </div>

            <div class="shub-section">
              <div class="shub-section-hdr"><span>🤖 AI Predictions</span></div>
              <div class="shub-section-body" id="sportsPredictions">${this.renderPredictions()}</div>
            </div>
          </div>

          <div class="shub-col">
            <div class="shub-section">
              <div class="shub-section-hdr">
                <span>🔴 Live Scores</span>
                <span class="shub-live-badge">LIVE</span>
              </div>
              <div class="shub-section-body" id="sportsScoresList">${this.renderScores()}</div>
            </div>

            <div class="shub-section">
              <div class="shub-section-hdr"><span>📅 Schedule</span></div>
              <div class="shub-section-body" id="sportsScheduleList">${this.renderSchedule()}</div>
            </div>

            <div class="shub-section">
              <div class="shub-section-hdr">
                <span>📊 Standings</span>
                ${this.standingsLeagueName ? `<span class="shub-league-name">${escapeHtml(this.standingsLeagueName)}</span>` : ''}
              </div>
              <div class="shub-section-body" id="sportsStandingsList">${this.renderStandingsTable()}</div>
            </div>
          </div>
        </div>
      </div>
    `);
    this.bindEvents();
  }

  // ─── Partial Section Updaters ─────────────────────────────────
  private renderScoresSection(): void {
    const el = this.element.querySelector('#sportsScoresList');
    if (el) el.innerHTML = this.renderScores();
  }
  private renderScheduleSection(): void {
    const el = this.element.querySelector('#sportsScheduleList');
    if (el) el.innerHTML = this.renderSchedule();
    this.bindPredictionEvents();
  }
  private renderStandingsSection(): void {
    const el = this.element.querySelector('#sportsStandingsList');
    if (el) el.innerHTML = this.renderStandingsTable();
  }
  private renderNewsSection(): void {
    const el = this.element.querySelector('#sportsNewsList');
    if (el) el.innerHTML = this.renderNewsList();
    const c = this.element.querySelector('#sportsNewsCount');
    if (c) c.textContent = String(this.getFilteredNews().length);
  }
  private renderPredictionsSection(): void {
    const el = this.element.querySelector('#sportsPredictions');
    if (el) el.innerHTML = this.renderPredictions();
    this.bindPredictionEvents();
  }

  // ─── Render Helpers ───────────────────────────────────────────
  private renderTVChannels(): string {
    const filtered = this.activeTVCategory === 'all'
      ? SPORTS_TV_CHANNELS
      : SPORTS_TV_CHANNELS.filter(c => c.category === this.activeTVCategory);
    return filtered.map(ch => `
      <button class="shub-tv-ch ${ch.id === this.activeTVChannel.id ? 'active' : ''}" data-channel-id="${ch.id}">
        <span>${ch.icon}</span><span>${escapeHtml(ch.name)}</span>
      </button>
    `).join('');
  }

  private renderScores(): string {
    if (this.activeSport === 'all') return '<div class="shub-empty">Select a sport to see live scores</div>';
    if (this.isLoadingScores) return '<div class="shub-loading"><div class="shub-spinner"></div>Loading scores...</div>';
    const live = this.matches.filter(m => m.status.state === 'in');
    const finished = this.matches.filter(m => m.status.state === 'post');
    const all = [...live, ...finished];
    if (all.length === 0) return '<div class="shub-empty">No live or recent matches</div>';
    return all.map(m => {
      const isLive = m.status.state === 'in';
      return `
        <div class="shub-score-card ${isLive ? 'live' : ''}" data-match-id="${m.id}" style="cursor:pointer" title="Click to show on map">
          <div class="shub-score-status">${isLive ? '<span class="shub-live-dot"></span>' : ''}<span>${escapeHtml(m.status.shortDetail || m.status.detail)}</span></div>
          <div class="shub-score-teams">
            <div class="shub-score-team ${m.home.winner ? 'winner' : ''}">
              ${m.home.logo ? `<img src="${escapeHtml(m.home.logo)}" alt="" class="shub-team-logo" loading="lazy" />` : ''}
              <span class="shub-team-name">${escapeHtml(m.home.abbr || m.home.name)}</span>
              <span class="shub-team-score">${escapeHtml(m.home.score)}</span>
            </div>
            <div class="shub-score-team ${m.away.winner ? 'winner' : ''}">
              ${m.away.logo ? `<img src="${escapeHtml(m.away.logo)}" alt="" class="shub-team-logo" loading="lazy" />` : ''}
              <span class="shub-team-name">${escapeHtml(m.away.abbr || m.away.name)}</span>
              <span class="shub-team-score">${escapeHtml(m.away.score)}</span>
            </div>
          </div>
          ${m.venue ? `<div class="shub-score-venue">${escapeHtml(m.venue)}</div>` : ''}
        </div>`;
    }).join('');
  }

  private renderSchedule(): string {
    if (this.activeSport === 'all') return '<div class="shub-empty">Select a sport to see schedule</div>';
    const upcoming = this.matches.filter(m => m.status.state === 'pre');
    if (upcoming.length === 0) return '<div class="shub-empty">No upcoming matches today</div>';
    return upcoming.map(m => {
      const d = new Date(m.date);
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `
        <div class="shub-schedule-item">
          <div class="shub-schedule-time"><span>${date}</span><span>${time}</span></div>
          <div class="shub-schedule-teams">
            <span>${escapeHtml(m.home.name)}</span><span class="shub-vs">vs</span><span>${escapeHtml(m.away.name)}</span>
          </div>
          <button class="shub-predict-btn" data-predict="${m.id}" title="AI Prediction">🤖</button>
        </div>`;
    }).join('');
  }

  private getFilteredNews(): NewsItem[] {
    if (this.activeSport === 'all') return this.newsItems;
    const pattern = SPORT_NEWS_PATTERNS[this.activeSport];
    return pattern ? this.newsItems.filter(item => pattern.test(`${item.title} ${item.source}`)) : this.newsItems;
  }

  private renderNewsList(): string {
    const filtered = this.getFilteredNews().slice(0, 50);
    if (filtered.length === 0) return '<div class="shub-empty">No sports news yet. Headlines will appear as they arrive.</div>';
    return filtered.map(item => `
      <a class="shub-news-item" href="${escapeHtml(item.link)}" target="_blank" rel="noopener" title="${escapeHtml(item.title)}">
        <span class="shub-news-title">${escapeHtml(item.title)}</span>
        <span class="shub-news-meta"><span>${escapeHtml(item.source)}</span><span>${formatTime(item.pubDate)}</span></span>
      </a>
    `).join('');
  }

  private renderPredictions(): string {
    if (this.activeSport === 'all') return '<div class="shub-empty">Select a sport, then click 🤖 on an upcoming match</div>';
    if (this.isPredicting) return '<div class="shub-loading"><div class="shub-spinner"></div>Generating AI prediction...</div>';
    if (!this.activePredictionId || !this.predictionText) {
      const upcoming = this.matches.filter(m => m.status.state === 'pre');
      if (upcoming.length === 0) return '<div class="shub-empty">No upcoming matches for predictions</div>';
      return `<div class="shub-predict-prompt">
        <p>Click 🤖 on a match for AI prediction</p>
        <div class="shub-predict-quick">${upcoming.slice(0, 3).map(m => `
          <button class="shub-predict-quick-btn" data-predict="${m.id}">🤖 ${escapeHtml(m.home.abbr || m.home.name)} vs ${escapeHtml(m.away.abbr || m.away.name)}</button>
        `).join('')}</div>
      </div>`;
    }
    const match = this.matches.find(m => m.id === this.activePredictionId);
    return `<div class="shub-prediction-card">
      ${match ? `<div class="shub-prediction-hdr"><strong>${escapeHtml(match.home.name)} vs ${escapeHtml(match.away.name)}</strong><span>${escapeHtml(match.league)}</span></div>` : ''}
      <div class="shub-prediction-text">${escapeHtml(this.predictionText)}</div>
    </div>`;
  }

  private renderStandingsTable(): string {
    if (this.activeSport === 'all') return '<div class="shub-empty">Select a sport to see standings</div>';
    if (this.isLoadingStandings) return '<div class="shub-loading"><div class="shub-spinner"></div>Loading standings...</div>';
    if (this.standings.length === 0) return '<div class="shub-empty">Standings not available</div>';
    const isSoccer = this.activeSport === 'soccer';
    const isBball = this.activeSport === 'basketball';
    return `<table class="shub-standings">
      <thead><tr>
        <th>#</th><th>Team</th>
        ${isSoccer ? '<th>GP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>' : ''}
        ${isBball ? '<th>W</th><th>L</th><th>PCT</th><th>GB</th>' : ''}
        ${!isSoccer && !isBball ? '<th>W</th><th>L</th><th>Pts</th>' : ''}
      </tr></thead>
      <tbody>${this.standings.map((e, i) => `<tr>
        <td>${i + 1}</td>
        <td class="shub-standings-team">${e.logo ? `<img src="${escapeHtml(e.logo)}" alt="" class="shub-team-sm" loading="lazy" />` : ''}${escapeHtml(e.abbr || e.team)}</td>
        ${isSoccer ? `<td>${e.stats['GP'] || e.stats['gamesPlayed'] || '-'}</td><td>${e.stats['W'] || e.stats['wins'] || '-'}</td><td>${e.stats['D'] || e.stats['ties'] || '-'}</td><td>${e.stats['L'] || e.stats['losses'] || '-'}</td><td>${e.stats['GD'] || e.stats['pointDifferential'] || '-'}</td><td><b>${e.stats['P'] || e.stats['points'] || '-'}</b></td>` : ''}
        ${isBball ? `<td>${e.stats['W'] || e.stats['wins'] || '-'}</td><td>${e.stats['L'] || e.stats['losses'] || '-'}</td><td>${e.stats['PCT'] || e.stats['winPercent'] || '-'}</td><td>${e.stats['GB'] || e.stats['gamesBehind'] || '-'}</td>` : ''}
        ${!isSoccer && !isBball ? `<td>${e.stats['W'] || e.stats['wins'] || '-'}</td><td>${e.stats['L'] || e.stats['losses'] || '-'}</td><td><b>${e.stats['P'] || e.stats['points'] || e.stats['PCT'] || '-'}</b></td>` : ''}
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // ─── Events ───────────────────────────────────────────────────
  private bindEvents(): void {
    this.element.querySelectorAll('.shub-sport').forEach(btn => {
      btn.addEventListener('click', () => this.switchSport((btn as HTMLElement).dataset.sport as SportId));
    });
    this.element.querySelectorAll('.shub-league').forEach(btn => {
      btn.addEventListener('click', () => this.switchLeague((btn as HTMLElement).dataset.league!));
    });
    this.element.querySelectorAll('.shub-tv-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTVCategory = (btn as HTMLElement).dataset.tvcat as TVCategory;
        this.element.querySelectorAll('.shub-tv-cat').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cl = this.element.querySelector('#sportsTVChannels');
        if (cl) cl.innerHTML = this.renderTVChannels();
        this.bindTVEvents();
      });
    });
    this.bindTVEvents();
    this.bindPredictionEvents();
    this.bindScoreCardEvents();
  }

  private bindTVEvents(): void {
    this.element.querySelectorAll('.shub-tv-ch').forEach(btn => {
      btn.addEventListener('click', () => {
        const ch = SPORTS_TV_CHANNELS.find(c => c.id === (btn as HTMLElement).dataset.channelId);
        if (!ch) return;
        this.activeTVChannel = ch;
        const iframe = this.element.querySelector('#sportsTVIframe') as HTMLIFrameElement;
        if (iframe) iframe.src = `https://www.youtube.com/embed/${ch.videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`;
        this.element.querySelectorAll('.shub-tv-ch').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  private bindPredictionEvents(): void {
    this.element.querySelectorAll('[data-predict]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const match = this.matches.find(m => m.id === (btn as HTMLElement).dataset.predict);
        if (match) this.loadPrediction(match);
      });
    });
  }

  private bindScoreCardEvents(): void {
    this.element.querySelectorAll('.shub-score-card[data-match-id]').forEach(card => {
      card.addEventListener('click', () => {
        const matchId = (card as HTMLElement).dataset.matchId;
        const match = this.matches.find(m => m.id === matchId);
        if (match) this.panToMatch(match);
      });
    });
  }
}
