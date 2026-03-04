/**
 * GlobalScope — Per-Sport Panel
 *
 * Generic sport panel instantiated per sport (Football, Basketball, Tennis, F1, Cricket).
 * Each panel independently loads scores, standings, and dispatches map markers.
 * Panels dynamically grow as content increases — no fixed height.
 *
 * Usage:
 *   new SportPanel({ sport: 'soccer', ... })
 *   new SportPanel({ sport: 'basketball', ... })
 */

import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';
import { resolveMatchCoords, resolveF1Coords, resolveCricketCoords } from '@/data/stadium-coords';
import type { SportsMatchMarker } from './MapContainer';

// ─── Sport Types ────────────────────────────────────────────────
export type SportId = 'soccer' | 'basketball' | 'tennis' | 'f1' | 'cricket';

export interface LeagueConfig {
  id: string;
  name: string;
  flag: string;
}

export interface SportConfig {
  id: SportId;
  label: string;
  icon: string;
  espnSport: string;
  defaultLeague: string;
  leagues: LeagueConfig[];
  color: string;
}

// ─── All Sports Configurations ──────────────────────────────────
export const SPORT_CONFIGS: SportConfig[] = [
  {
    id: 'soccer',
    label: 'Football',
    icon: '⚽',
    espnSport: 'soccer',
    defaultLeague: 'eng.1',
    color: '#10b981',
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
    color: '#f97316',
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
    color: '#eab308',
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
    color: '#ef4444',
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
    color: '#06b6d4',
    leagues: [
      { id: 'icc', name: 'ICC', flag: '🏏' },
    ],
  },
];

// ─── Match Data ─────────────────────────────────────────────────
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

// ─── Sport Panel Class ──────────────────────────────────────────

export class SportPanel extends Panel {
  private sportConfig: SportConfig;
  private activeLeague: string;
  private matches: MatchData[] = [];
  private standings: StandingEntry[] = [];
  private standingsLeagueName = '';
  private isLoadingScores = false;
  private isLoadingStandings = false;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private predictionCache = new Map<string, { text: string; ts: number }>();
  private predictionText = '';
  private isPredicting = false;

  constructor(config: SportConfig) {
    super({
      id: `sport-${config.id}`,
      title: `${config.icon} ${config.label}`,
      className: `sport-panel sport-panel-${config.id}`,
      showCount: true,
      infoTooltip: `Live scores, standings & schedule for ${config.label}`,
    });
    this.sportConfig = config;
    this.activeLeague = config.defaultLeague;
    this.renderFull();
    this.loadScores();
    this.loadStandings();
    // Auto-refresh every 60s
    this.refreshTimer = setInterval(() => this.loadScores(), 60000);
  }

  public getSportId(): SportId {
    return this.sportConfig.id;
  }

  public destroy(): void {
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
    super.destroy();
  }

  // ─── Data Loading ───────────────────────────────────────────
  private async loadScores(): Promise<void> {
    this.isLoadingScores = true;
    this.renderScoresSection();
    try {
      const res = await fetch(
        `/api/sports-scores?sport=${this.sportConfig.espnSport}&league=${this.activeLeague}`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (res.ok) {
        const data = await res.json();
        this.matches = data.matches || [];
      }
    } catch { /* silent */ }
    this.isLoadingScores = false;
    this.setCount(this.matches.filter(m => m.status.state === 'in').length);
    this.renderScoresSection();
    this.renderScheduleSection();
    this.dispatchMapMarkers();
  }

  private async loadStandings(): Promise<void> {
    this.isLoadingStandings = true;
    this.renderStandingsSection();
    try {
      const res = await fetch(
        `/api/sports-scores?sport=${this.sportConfig.espnSport}&league=${this.activeLeague}&view=standings`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (res.ok) {
        const data = await res.json();
        this.standings = data.entries || [];
        this.standingsLeagueName = data.leagueName || '';
      }
    } catch { /* silent */ }
    this.isLoadingStandings = false;
    this.renderStandingsSection();
  }

  private async loadPrediction(match: MatchData): Promise<void> {
    const cacheKey = match.id;
    const cached = this.predictionCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 3600000) {
      this.predictionText = cached.text;
      this.renderPredictionInline(match);
      return;
    }
    this.isPredicting = true;
    this.predictionText = '';
    this.renderPredictionInline(match);
    try {
      const prompt = `Analyze this upcoming sports match and provide a brief prediction (max 100 words):\n\nMatch: ${match.home.name} vs ${match.away.name}\nCompetition: ${match.league}\nDate: ${match.date}\n\nProvide:\n1. Predicted winner or draw\n2. Predicted score\n3. Key factors\n4. Confidence level (Low/Medium/High)\n\nBe concise.`;
      const res = await fetch('/api/groq-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 200 }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        this.predictionText = data.summary || data.text || 'Prediction unavailable.';
        this.predictionCache.set(cacheKey, { text: this.predictionText, ts: Date.now() });
      } else {
        this.predictionText = 'AI prediction service unavailable.';
      }
    } catch {
      this.predictionText = 'Failed to generate prediction.';
    }
    this.isPredicting = false;
    this.renderPredictionInline(match);
  }

  // ─── League Switching ──────────────────────────────────────
  private switchLeague(leagueId: string): void {
    this.activeLeague = leagueId;
    this.matches = [];
    this.standings = [];
    this.predictionText = '';
    this.renderFull();
    this.loadScores();
    this.loadStandings();
  }

  // ─── Map Integration ──────────────────────────────────────
  private dispatchMapMarkers(): void {
    if (this.matches.length === 0) return;
    const markers: SportsMatchMarker[] = this.matches.map(m => {
      let coords: [number, number];
      if (this.sportConfig.espnSport === 'racing') {
        coords = resolveF1Coords(m.venue || m.name);
      } else if (this.sportConfig.espnSport === 'cricket') {
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
        sport: this.sportConfig.espnSport,
      };
    });
    // Dispatch with sport ID so App.ts can aggregate from all sport panels
    window.dispatchEvent(new CustomEvent('sport-panel-markers', {
      detail: { sportId: this.sportConfig.id, markers },
    }));
  }

  private panToMatch(match: MatchData): void {
    let coords: [number, number];
    if (this.sportConfig.espnSport === 'racing') {
      coords = resolveF1Coords(match.venue || match.name);
    } else if (this.sportConfig.espnSport === 'cricket') {
      coords = resolveCricketCoords(match.venue || match.name);
    } else {
      coords = resolveMatchCoords(match.home.abbr, match.away.abbr, this.activeLeague, match.venue);
    }
    window.dispatchEvent(new CustomEvent('sports-match-focus', {
      detail: { lat: coords[0], lng: coords[1], zoom: 8 },
    }));
  }

  // ─── Main Render ──────────────────────────────────────────
  private renderFull(): void {
    const hasMultipleLeagues = this.sportConfig.leagues.length > 1;
    this.setContent(`
      <div class="sp-container" data-sport="${this.sportConfig.id}" style="--sport-color: ${this.sportConfig.color}">
        ${hasMultipleLeagues ? `
          <div class="sp-leagues">
            ${this.sportConfig.leagues.map(l => `
              <button class="sp-league-btn ${l.id === this.activeLeague ? 'active' : ''}" data-league="${l.id}">
                <span class="sp-league-flag">${l.flag}</span>
                <span class="sp-league-name">${escapeHtml(l.name)}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}

        <div class="sp-scores-section" id="sp-scores-${this.sportConfig.id}">
          ${this.renderScores()}
        </div>

        <div class="sp-schedule-section" id="sp-schedule-${this.sportConfig.id}">
          ${this.renderSchedule()}
        </div>

        <div class="sp-prediction-section" id="sp-prediction-${this.sportConfig.id}"></div>

        <div class="sp-standings-section" id="sp-standings-${this.sportConfig.id}">
          ${this.renderStandings()}
        </div>
      </div>
    `);
    this.bindEvents();
  }

  // ─── Section Updaters ─────────────────────────────────────
  private renderScoresSection(): void {
    const el = this.element.querySelector(`#sp-scores-${this.sportConfig.id}`);
    if (el) el.innerHTML = this.renderScores();
    this.bindScoreCardEvents();
  }

  private renderScheduleSection(): void {
    const el = this.element.querySelector(`#sp-schedule-${this.sportConfig.id}`);
    if (el) el.innerHTML = this.renderSchedule();
    this.bindPredictionEvents();
  }

  private renderStandingsSection(): void {
    const el = this.element.querySelector(`#sp-standings-${this.sportConfig.id}`);
    if (el) el.innerHTML = this.renderStandings();
  }

  private renderPredictionInline(match: MatchData): void {
    const el = this.element.querySelector(`#sp-prediction-${this.sportConfig.id}`);
    if (!el) return;
    if (this.isPredicting) {
      el.innerHTML = `
        <div class="sp-section-header"><span>🤖 AI Prediction</span></div>
        <div class="sp-prediction-card loading">
          <div class="sp-prediction-match">${escapeHtml(match.home.name)} vs ${escapeHtml(match.away.name)}</div>
          <div class="sp-loading-dots"><span></span><span></span><span></span></div>
        </div>`;
    } else if (this.predictionText) {
      el.innerHTML = `
        <div class="sp-section-header"><span>🤖 AI Prediction</span></div>
        <div class="sp-prediction-card">
          <div class="sp-prediction-match">${escapeHtml(match.home.name)} vs ${escapeHtml(match.away.name)}</div>
          <div class="sp-prediction-text">${escapeHtml(this.predictionText)}</div>
        </div>`;
    } else {
      el.innerHTML = '';
    }
  }

  // ─── Render Helpers ───────────────────────────────────────
  private renderScores(): string {
    if (this.isLoadingScores) {
      return `
        <div class="sp-section-header"><span>🔴 Live & Recent</span><span class="sp-live-badge">LIVE</span></div>
        <div class="sp-loading"><div class="sp-spinner"></div></div>`;
    }
    const live = this.matches.filter(m => m.status.state === 'in');
    const finished = this.matches.filter(m => m.status.state === 'post');
    const all = [...live, ...finished];
    if (all.length === 0) {
      return `
        <div class="sp-section-header"><span>🔴 Live & Recent</span></div>
        <div class="sp-empty">No live or recent matches</div>`;
    }
    return `
      <div class="sp-section-header">
        <span>🔴 Live & Recent</span>
        ${live.length > 0 ? `<span class="sp-live-badge">${live.length} LIVE</span>` : ''}
      </div>
      <div class="sp-scores-list">
        ${all.map(m => this.renderScoreCard(m)).join('')}
      </div>`;
  }

  private renderScoreCard(m: MatchData): string {
    const isLive = m.status.state === 'in';
    const isFinished = m.status.state === 'post';
    return `
      <div class="sp-score-card ${isLive ? 'live' : isFinished ? 'finished' : ''}" data-match-id="${m.id}" title="Click to show on map">
        <div class="sp-score-status">
          ${isLive ? '<span class="sp-live-dot"></span>' : ''}
          <span>${escapeHtml(m.status.shortDetail || m.status.detail)}</span>
        </div>
        <div class="sp-score-row">
          <div class="sp-team ${m.home.winner ? 'winner' : ''}">
            ${m.home.logo ? `<img src="${escapeHtml(m.home.logo)}" alt="" class="sp-team-logo" loading="lazy" />` : ''}
            <span class="sp-team-name">${escapeHtml(m.home.abbr || m.home.name)}</span>
          </div>
          <div class="sp-score-value">
            <span class="sp-score-num ${m.home.winner ? 'winner' : ''}">${escapeHtml(m.home.score || '-')}</span>
            <span class="sp-score-sep">-</span>
            <span class="sp-score-num ${m.away.winner ? 'winner' : ''}">${escapeHtml(m.away.score || '-')}</span>
          </div>
          <div class="sp-team away ${m.away.winner ? 'winner' : ''}">
            <span class="sp-team-name">${escapeHtml(m.away.abbr || m.away.name)}</span>
            ${m.away.logo ? `<img src="${escapeHtml(m.away.logo)}" alt="" class="sp-team-logo" loading="lazy" />` : ''}
          </div>
        </div>
        ${m.venue ? `<div class="sp-venue">📍 ${escapeHtml(m.venue)}</div>` : ''}
      </div>`;
  }

  private renderSchedule(): string {
    const upcoming = this.matches.filter(m => m.status.state === 'pre');
    if (upcoming.length === 0) {
      return `
        <div class="sp-section-header"><span>📅 Upcoming</span></div>
        <div class="sp-empty">No upcoming matches</div>`;
    }
    return `
      <div class="sp-section-header"><span>📅 Upcoming</span><span class="sp-count-badge">${upcoming.length}</span></div>
      <div class="sp-schedule-list">
        ${upcoming.map(m => {
          const d = new Date(m.date);
          const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
          return `
            <div class="sp-schedule-item" data-match-id="${m.id}">
              <div class="sp-schedule-time">
                <span class="sp-schedule-date">${date}</span>
                <span class="sp-schedule-hour">${time}</span>
              </div>
              <div class="sp-schedule-teams">
                ${m.home.logo ? `<img src="${escapeHtml(m.home.logo)}" alt="" class="sp-team-logo-sm" loading="lazy" />` : ''}
                <span>${escapeHtml(m.home.abbr || m.home.name)}</span>
                <span class="sp-vs">vs</span>
                <span>${escapeHtml(m.away.abbr || m.away.name)}</span>
                ${m.away.logo ? `<img src="${escapeHtml(m.away.logo)}" alt="" class="sp-team-logo-sm" loading="lazy" />` : ''}
              </div>
              <button class="sp-predict-btn" data-predict="${m.id}" title="AI Prediction">🤖</button>
            </div>`;
        }).join('')}
      </div>`;
  }

  private renderStandings(): string {
    if (this.isLoadingStandings) {
      return `
        <div class="sp-section-header"><span>📊 Standings</span></div>
        <div class="sp-loading"><div class="sp-spinner"></div></div>`;
    }
    if (this.standings.length === 0) {
      return `
        <div class="sp-section-header"><span>📊 Standings</span></div>
        <div class="sp-empty">Standings not available</div>`;
    }
    const isSoccer = this.sportConfig.id === 'soccer';
    const isBball = this.sportConfig.id === 'basketball';
    return `
      <div class="sp-section-header">
        <span>📊 Standings</span>
        ${this.standingsLeagueName ? `<span class="sp-league-label">${escapeHtml(this.standingsLeagueName)}</span>` : ''}
      </div>
      <div class="sp-standings-wrap">
        <table class="sp-standings-table">
          <thead><tr>
            <th>#</th><th>Team</th>
            ${isSoccer ? '<th>GP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>' : ''}
            ${isBball ? '<th>W</th><th>L</th><th>PCT</th><th>GB</th>' : ''}
            ${!isSoccer && !isBball ? '<th>W</th><th>L</th><th>Pts</th>' : ''}
          </tr></thead>
          <tbody>
            ${this.standings.slice(0, 20).map((e, i) => `
              <tr class="${i < 4 ? 'top-zone' : i >= this.standings.length - 3 ? 'bottom-zone' : ''}">
                <td class="sp-rank">${i + 1}</td>
                <td class="sp-standings-team">
                  ${e.logo ? `<img src="${escapeHtml(e.logo)}" alt="" class="sp-team-logo-sm" loading="lazy" />` : ''}
                  ${escapeHtml(e.abbr || e.team)}
                </td>
                ${isSoccer ? `
                  <td>${e.stats['GP'] || e.stats['gamesPlayed'] || '-'}</td>
                  <td>${e.stats['W'] || e.stats['wins'] || '-'}</td>
                  <td>${e.stats['D'] || e.stats['ties'] || '-'}</td>
                  <td>${e.stats['L'] || e.stats['losses'] || '-'}</td>
                  <td>${e.stats['GD'] || e.stats['pointDifferential'] || '-'}</td>
                  <td><b>${e.stats['P'] || e.stats['points'] || '-'}</b></td>
                ` : ''}
                ${isBball ? `
                  <td>${e.stats['W'] || e.stats['wins'] || '-'}</td>
                  <td>${e.stats['L'] || e.stats['losses'] || '-'}</td>
                  <td>${e.stats['PCT'] || e.stats['winPercent'] || '-'}</td>
                  <td>${e.stats['GB'] || e.stats['gamesBehind'] || '-'}</td>
                ` : ''}
                ${!isSoccer && !isBball ? `
                  <td>${e.stats['W'] || e.stats['wins'] || '-'}</td>
                  <td>${e.stats['L'] || e.stats['losses'] || '-'}</td>
                  <td><b>${e.stats['P'] || e.stats['points'] || e.stats['PCT'] || '-'}</b></td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ─── Events ───────────────────────────────────────────────
  private bindEvents(): void {
    // League switching
    this.element.querySelectorAll('.sp-league-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const leagueId = (btn as HTMLElement).dataset.league;
        if (leagueId && leagueId !== this.activeLeague) this.switchLeague(leagueId);
      });
    });
    this.bindScoreCardEvents();
    this.bindPredictionEvents();
  }

  private bindScoreCardEvents(): void {
    this.element.querySelectorAll('.sp-score-card[data-match-id]').forEach(card => {
      card.addEventListener('click', () => {
        const matchId = (card as HTMLElement).dataset.matchId;
        const match = this.matches.find(m => m.id === matchId);
        if (match) this.panToMatch(match);
      });
    });
    // Also bind schedule items for map pan
    this.element.querySelectorAll('.sp-schedule-item[data-match-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking the predict button
        if ((e.target as HTMLElement).closest('.sp-predict-btn')) return;
        const matchId = (item as HTMLElement).dataset.matchId;
        const match = this.matches.find(m => m.id === matchId);
        if (match) this.panToMatch(match);
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
}
