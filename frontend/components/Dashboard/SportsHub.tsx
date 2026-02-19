'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Trophy,
  Timer,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Activity,
  Flag,
  Star,
  Circle,
  RefreshCw,
  Clock,
  Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SportType = 'football' | 'basketball' | 'tennis' | 'f1' | 'cricket' | 'mma';
type MatchStatus = 'live' | 'finished' | 'upcoming';
type SportFilter = 'all' | SportType;

interface TeamInfo {
  name: string;
  abbr: string;
  color: string; // tailwind bg color for badge
}

interface BaseMatch {
  id: string;
  sport: SportType;
  league: string;
  status: MatchStatus;
  startTime: number; // timestamp
}

interface FootballMatch extends BaseMatch {
  sport: 'football';
  home: TeamInfo;
  away: TeamInfo;
  homeScore: number;
  awayScore: number;
  minute: number; // 0-90+
  half: 1 | 2 | 'HT' | 'FT';
}

interface BasketballMatch extends BaseMatch {
  sport: 'basketball';
  home: TeamInfo;
  away: TeamInfo;
  homeScore: number;
  awayScore: number;
  quarter: 1 | 2 | 3 | 4 | 'OT' | 'FT';
  clock: string; // "8:42"
}

interface TennisMatch extends BaseMatch {
  sport: 'tennis';
  player1: TeamInfo;
  player2: TeamInfo;
  sets: [number, number][]; // [[6,4],[3,6],[2,1]]
  serving: 1 | 2;
  currentGame: [number, number]; // [40, 30]
  currentSet: number;
}

interface F1Match extends BaseMatch {
  sport: 'f1';
  raceName: string;
  lap: number;
  totalLaps: number;
  positions: { driver: string; team: string; gap: string }[];
}

interface CricketMatch extends BaseMatch {
  sport: 'cricket';
  home: TeamInfo;
  away: TeamInfo;
  battingScore: string; // "245/6"
  overs: string; // "34.2"
  bowlingScore: string;
  innings: number;
}

interface MMAMatch extends BaseMatch {
  sport: 'mma';
  fighter1: TeamInfo;
  fighter2: TeamInfo;
  round: number;
  totalRounds: number;
  clock: string;
  event: string;
}

type Match = FootballMatch | BasketballMatch | TennisMatch | F1Match | CricketMatch | MMAMatch;

// ---------------------------------------------------------------------------
// Constants - Real team data
// ---------------------------------------------------------------------------

const FOOTBALL_TEAMS: Record<string, TeamInfo[]> = {
  'Premier League': [
    { name: 'Arsenal', abbr: 'ARS', color: 'bg-red-600' },
    { name: 'Man City', abbr: 'MCI', color: 'bg-sky-500' },
    { name: 'Liverpool', abbr: 'LIV', color: 'bg-red-700' },
    { name: 'Chelsea', abbr: 'CHE', color: 'bg-blue-700' },
    { name: 'Man Utd', abbr: 'MUN', color: 'bg-red-800' },
    { name: 'Tottenham', abbr: 'TOT', color: 'bg-slate-200' },
    { name: 'Newcastle', abbr: 'NEW', color: 'bg-gray-800' },
    { name: 'Aston Villa', abbr: 'AVL', color: 'bg-purple-800' },
    { name: 'Brighton', abbr: 'BHA', color: 'bg-blue-500' },
    { name: 'West Ham', abbr: 'WHU', color: 'bg-red-900' },
  ],
  'La Liga': [
    { name: 'Real Madrid', abbr: 'RMA', color: 'bg-white' },
    { name: 'Barcelona', abbr: 'BAR', color: 'bg-blue-800' },
    { name: 'Atletico Madrid', abbr: 'ATM', color: 'bg-red-600' },
    { name: 'Real Sociedad', abbr: 'RSO', color: 'bg-blue-400' },
    { name: 'Villarreal', abbr: 'VIL', color: 'bg-yellow-400' },
    { name: 'Sevilla', abbr: 'SEV', color: 'bg-red-500' },
  ],
  'Serie A': [
    { name: 'Inter Milan', abbr: 'INT', color: 'bg-blue-900' },
    { name: 'AC Milan', abbr: 'ACM', color: 'bg-red-700' },
    { name: 'Juventus', abbr: 'JUV', color: 'bg-gray-900' },
    { name: 'Napoli', abbr: 'NAP', color: 'bg-sky-600' },
    { name: 'Roma', abbr: 'ROM', color: 'bg-yellow-700' },
    { name: 'Lazio', abbr: 'LAZ', color: 'bg-sky-300' },
  ],
  'Bundesliga': [
    { name: 'Bayern Munich', abbr: 'BAY', color: 'bg-red-700' },
    { name: 'Dortmund', abbr: 'BVB', color: 'bg-yellow-500' },
    { name: 'RB Leipzig', abbr: 'RBL', color: 'bg-red-500' },
    { name: 'Leverkusen', abbr: 'LEV', color: 'bg-red-600' },
  ],
  'Champions League': [
    { name: 'Real Madrid', abbr: 'RMA', color: 'bg-white' },
    { name: 'Man City', abbr: 'MCI', color: 'bg-sky-500' },
    { name: 'Bayern Munich', abbr: 'BAY', color: 'bg-red-700' },
    { name: 'PSG', abbr: 'PSG', color: 'bg-blue-900' },
    { name: 'Barcelona', abbr: 'BAR', color: 'bg-blue-800' },
    { name: 'Inter Milan', abbr: 'INT', color: 'bg-blue-900' },
  ],
};

const NBA_TEAMS: TeamInfo[] = [
  { name: 'Lakers', abbr: 'LAL', color: 'bg-yellow-500' },
  { name: 'Celtics', abbr: 'BOS', color: 'bg-green-700' },
  { name: 'Warriors', abbr: 'GSW', color: 'bg-blue-600' },
  { name: 'Bucks', abbr: 'MIL', color: 'bg-green-800' },
  { name: 'Nuggets', abbr: 'DEN', color: 'bg-sky-700' },
  { name: '76ers', abbr: 'PHI', color: 'bg-blue-700' },
  { name: 'Suns', abbr: 'PHX', color: 'bg-orange-500' },
  { name: 'Heat', abbr: 'MIA', color: 'bg-red-700' },
  { name: 'Mavericks', abbr: 'DAL', color: 'bg-blue-800' },
  { name: 'Thunder', abbr: 'OKC', color: 'bg-sky-600' },
  { name: 'Knicks', abbr: 'NYK', color: 'bg-orange-600' },
  { name: 'Cavaliers', abbr: 'CLE', color: 'bg-red-800' },
];

const TENNIS_PLAYERS: TeamInfo[] = [
  { name: 'N. Djokovic', abbr: 'DJO', color: 'bg-blue-700' },
  { name: 'C. Alcaraz', abbr: 'ALC', color: 'bg-red-600' },
  { name: 'J. Sinner', abbr: 'SIN', color: 'bg-blue-500' },
  { name: 'D. Medvedev', abbr: 'MED', color: 'bg-red-500' },
  { name: 'A. Zverev', abbr: 'ZVE', color: 'bg-yellow-500' },
  { name: 'S. Tsitsipas', abbr: 'TSI', color: 'bg-sky-500' },
  { name: 'H. Rune', abbr: 'RUN', color: 'bg-red-400' },
  { name: 'T. Fritz', abbr: 'FRI', color: 'bg-blue-400' },
];

const F1_DRIVERS = [
  { driver: 'M. Verstappen', team: 'Red Bull' },
  { driver: 'L. Norris', team: 'McLaren' },
  { driver: 'C. Leclerc', team: 'Ferrari' },
  { driver: 'L. Hamilton', team: 'Ferrari' },
  { driver: 'O. Piastri', team: 'McLaren' },
  { driver: 'C. Sainz', team: 'Williams' },
  { driver: 'G. Russell', team: 'Mercedes' },
  { driver: 'F. Alonso', team: 'Aston Martin' },
  { driver: 'P. Gasly', team: 'Alpine' },
  { driver: 'A. Antonelli', team: 'Mercedes' },
];

const CRICKET_TEAMS: TeamInfo[] = [
  { name: 'India', abbr: 'IND', color: 'bg-blue-600' },
  { name: 'Australia', abbr: 'AUS', color: 'bg-yellow-500' },
  { name: 'England', abbr: 'ENG', color: 'bg-blue-800' },
  { name: 'South Africa', abbr: 'RSA', color: 'bg-green-700' },
  { name: 'New Zealand', abbr: 'NZL', color: 'bg-gray-900' },
  { name: 'Pakistan', abbr: 'PAK', color: 'bg-green-600' },
];

const MMA_FIGHTERS: TeamInfo[] = [
  { name: 'I. Adesanya', abbr: 'ADY', color: 'bg-purple-700' },
  { name: 'A. Pereira', abbr: 'PER', color: 'bg-green-700' },
  { name: 'I. Topuria', abbr: 'TOP', color: 'bg-red-600' },
  { name: 'S. O\'Malley', abbr: 'OMA', color: 'bg-pink-500' },
  { name: 'J. Jones', abbr: 'JON', color: 'bg-gray-800' },
  { name: 'L. Edwards', abbr: 'EDW', color: 'bg-blue-700' },
  { name: 'A. Volkanovski', abbr: 'VOL', color: 'bg-yellow-600' },
  { name: 'M. Dvalishvili', abbr: 'DVA', color: 'bg-red-700' },
];

const SPORT_FILTERS: { key: SportFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'football', label: 'Football' },
  { key: 'basketball', label: 'Basketball' },
  { key: 'tennis', label: 'Tennis' },
  { key: 'f1', label: 'Formula 1' },
  { key: 'cricket', label: 'Cricket' },
  { key: 'mma', label: 'MMA/Boxing' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTwo<T>(arr: T[]): [T, T] {
  const a = Math.floor(Math.random() * arr.length);
  let b = Math.floor(Math.random() * (arr.length - 1));
  if (b >= a) b++;
  return [arr[a], arr[b]];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Match generators
// ---------------------------------------------------------------------------

function generateFootballMatch(status: MatchStatus): FootballMatch {
  const leagueKey = pick(Object.keys(FOOTBALL_TEAMS));
  const [home, away] = pickTwo(FOOTBALL_TEAMS[leagueKey]);
  const minute = status === 'live' ? randInt(1, 90) : status === 'finished' ? 90 : 0;
  const half: FootballMatch['half'] = status === 'finished'
    ? 'FT'
    : status === 'upcoming'
    ? 1
    : minute <= 45
    ? 1
    : minute === 45
    ? 'HT'
    : 2;

  return {
    id: uid(),
    sport: 'football',
    league: leagueKey,
    status,
    startTime: Date.now() - minute * 60_000,
    home,
    away,
    homeScore: status === 'upcoming' ? 0 : randInt(0, 3),
    awayScore: status === 'upcoming' ? 0 : randInt(0, 3),
    minute,
    half,
  };
}

function generateBasketballMatch(status: MatchStatus): BasketballMatch {
  const [home, away] = pickTwo(NBA_TEAMS);
  const quarter: BasketballMatch['quarter'] = status === 'finished'
    ? 'FT'
    : status === 'upcoming'
    ? 1
    : (pick([1, 2, 3, 4]) as 1 | 2 | 3 | 4);
  const qMulti = status === 'finished' ? 4 : typeof quarter === 'number' ? quarter : 4;

  return {
    id: uid(),
    sport: 'basketball',
    league: 'NBA',
    status,
    startTime: Date.now() - randInt(0, 120) * 60_000,
    home,
    away,
    homeScore: status === 'upcoming' ? 0 : randInt(18, 32) * qMulti,
    awayScore: status === 'upcoming' ? 0 : randInt(18, 32) * qMulti,
    quarter,
    clock: status === 'live' ? `${randInt(0, 11)}:${String(randInt(0, 59)).padStart(2, '0')}` : '0:00',
  };
}

function generateTennisMatch(status: MatchStatus): TennisMatch {
  const [p1, p2] = pickTwo(TENNIS_PLAYERS);
  const completeSets: [number, number][] = [];
  const numSets = status === 'upcoming' ? 0 : randInt(1, 3);
  for (let i = 0; i < numSets; i++) {
    const winner = Math.random() > 0.5;
    const loserGames = randInt(0, 5);
    completeSets.push(winner ? [6, loserGames] : [loserGames, 6]);
  }
  if (status === 'live') {
    completeSets.push([randInt(0, 5), randInt(0, 5)]);
  }
  const tournaments = ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open', 'ATP Masters 1000'];

  return {
    id: uid(),
    sport: 'tennis',
    league: pick(tournaments),
    status,
    startTime: Date.now() - randInt(0, 180) * 60_000,
    player1: p1,
    player2: p2,
    sets: completeSets.length > 0 ? completeSets : [[0, 0]],
    serving: pick([1, 2]) as 1 | 2,
    currentGame: status === 'live' ? [pick([0, 15, 30, 40]), pick([0, 15, 30, 40])] : [0, 0],
    currentSet: completeSets.length,
  };
}

function generateF1Match(status: MatchStatus): F1Match {
  const races = [
    'Bahrain GP', 'Saudi Arabian GP', 'Australian GP', 'Japanese GP', 'Chinese GP',
    'Miami GP', 'Emilia Romagna GP', 'Monaco GP', 'Canadian GP', 'Spanish GP',
    'Austrian GP', 'British GP', 'Hungarian GP', 'Belgian GP', 'Dutch GP',
    'Italian GP', 'Singapore GP', 'US GP', 'Mexico GP', 'Brazilian GP', 'Abu Dhabi GP',
  ];
  const totalLaps = randInt(50, 70);
  const lap = status === 'live' ? randInt(1, totalLaps) : status === 'finished' ? totalLaps : 0;
  const shuffled = [...F1_DRIVERS].sort(() => Math.random() - 0.5);
  const positions = shuffled.map((d, i) => ({
    driver: d.driver,
    team: d.team,
    gap: i === 0 ? 'Leader' : `+${(Math.random() * (i * 3) + 0.5).toFixed(1)}s`,
  }));

  return {
    id: uid(),
    sport: 'f1',
    league: 'Formula 1',
    status,
    startTime: Date.now() - randInt(0, 90) * 60_000,
    raceName: pick(races),
    lap,
    totalLaps,
    positions,
  };
}

function generateCricketMatch(status: MatchStatus): CricketMatch {
  const [home, away] = pickTwo(CRICKET_TEAMS);
  const runs = randInt(80, 350);
  const wickets = randInt(0, 10);
  const oversNum = wickets === 10 ? 50 : randInt(10, 50);
  const oversBall = randInt(0, 5);

  return {
    id: uid(),
    sport: 'cricket',
    league: pick(['ICC World Cup', 'IPL', 'The Ashes', 'ICC Champions Trophy']),
    status,
    startTime: Date.now() - randInt(0, 300) * 60_000,
    home,
    away,
    battingScore: status === 'upcoming' ? '-' : `${runs}/${wickets}`,
    overs: status === 'upcoming' ? '-' : `${oversNum}.${oversBall}`,
    bowlingScore: status === 'upcoming' ? '-' : `${randInt(150, 320)}/10`,
    innings: status === 'upcoming' ? 0 : status === 'live' ? pick([1, 2]) : 2,
  };
}

function generateMMAMatch(status: MatchStatus): MMAMatch {
  const [f1, f2] = pickTwo(MMA_FIGHTERS);
  const totalRounds = pick([3, 5]);
  const round = status === 'live' ? randInt(1, totalRounds) : status === 'finished' ? totalRounds : 0;

  return {
    id: uid(),
    sport: 'mma',
    league: 'UFC',
    status,
    startTime: Date.now() - randInt(0, 30) * 60_000,
    fighter1: f1,
    fighter2: f2,
    round,
    totalRounds,
    clock: status === 'live' ? `${randInt(0, 4)}:${String(randInt(0, 59)).padStart(2, '0')}` : '0:00',
    event: pick(['UFC 310', 'UFC Fight Night', 'UFC 311', 'UFC 312']),
  };
}

function generateMatchSet(): Match[] {
  const matches: Match[] = [];

  // Live matches
  for (let i = 0; i < 3; i++) matches.push(generateFootballMatch('live'));
  for (let i = 0; i < 2; i++) matches.push(generateBasketballMatch('live'));
  matches.push(generateTennisMatch('live'));
  matches.push(generateF1Match('live'));
  matches.push(generateCricketMatch('live'));
  matches.push(generateMMAMatch('live'));

  // Finished matches
  for (let i = 0; i < 3; i++) matches.push(generateFootballMatch('finished'));
  for (let i = 0; i < 2; i++) matches.push(generateBasketballMatch('finished'));
  matches.push(generateTennisMatch('finished'));
  matches.push(generateCricketMatch('finished'));

  // Upcoming
  for (let i = 0; i < 2; i++) matches.push(generateFootballMatch('upcoming'));
  matches.push(generateBasketballMatch('upcoming'));
  matches.push(generateTennisMatch('upcoming'));
  matches.push(generateF1Match('upcoming'));

  return matches;
}

// ---------------------------------------------------------------------------
// Score change tracker for flash animation
// ---------------------------------------------------------------------------

function useScoreFlash() {
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const flash = useCallback((id: string) => {
    setFlashIds((prev) => new Set(prev).add(id));
    if (timers.current.has(id)) clearTimeout(timers.current.get(id)!);
    timers.current.set(
      id,
      setTimeout(() => {
        setFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        timers.current.delete(id);
      }, 2000),
    );
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return { flashIds, flash };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TeamBadge({ team, size = 'md' }: { team: TeamInfo; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-5 h-5 text-2xs' : 'w-6 h-6 text-xs';
  return (
    <div
      className={`${dim} rounded-full ${team.color} flex items-center justify-center font-bold text-white shrink-0 ring-1 ring-dark-700/50`}
      title={team.name}
    >
      {team.name.charAt(0)}
    </div>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
    </span>
  );
}

function StatusBadge({ status, extra }: { status: MatchStatus; extra?: string }) {
  if (status === 'live') {
    return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-2xs font-bold uppercase tracking-wide">
        <LiveDot />
        Live{extra ? ` · ${extra}` : ''}
      </span>
    );
  }
  if (status === 'finished') {
    return (
      <span className="px-1.5 py-0.5 rounded bg-dark-700 text-dark-400 text-2xs font-bold uppercase tracking-wide">
        FT
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-400 text-2xs font-bold uppercase tracking-wide">
      {extra ?? 'Soon'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Match card renderers
// ---------------------------------------------------------------------------

function FootballCard({ match, isFlashing }: { match: FootballMatch; isFlashing: boolean }) {
  const minuteLabel = match.half === 'HT' ? 'HT' : match.half === 'FT' ? 'FT' : `${match.minute}'`;
  return (
    <div
      className={`flex flex-col gap-1.5 p-3 rounded-lg bg-dark-800/80 border border-dark-700/50 min-w-[200px] shrink-0 transition-all duration-300 ${
        isFlashing ? 'ring-1 ring-green-500/60 bg-green-500/5' : ''
      } ${match.status === 'live' ? 'hover:border-red-500/30' : 'hover:border-dark-600'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs text-dark-500 truncate max-w-[120px]">{match.league}</span>
        <StatusBadge
          status={match.status}
          extra={match.status === 'live' ? minuteLabel : undefined}
        />
      </div>

      {/* Home */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge team={match.home} size="sm" />
          <span className="text-xs font-semibold text-dark-100 truncate">{match.home.name}</span>
        </div>
        <span
          className={`text-sm font-bold font-mono tabular-nums transition-colors duration-500 ${
            isFlashing ? 'text-green-400' : 'text-dark-100'
          }`}
        >
          {match.homeScore}
        </span>
      </div>

      {/* Away */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge team={match.away} size="sm" />
          <span className="text-xs font-semibold text-dark-100 truncate">{match.away.name}</span>
        </div>
        <span
          className={`text-sm font-bold font-mono tabular-nums transition-colors duration-500 ${
            isFlashing ? 'text-green-400' : 'text-dark-100'
          }`}
        >
          {match.awayScore}
        </span>
      </div>
    </div>
  );
}

function BasketballCard({ match, isFlashing }: { match: BasketballMatch; isFlashing: boolean }) {
  const periodLabel =
    match.quarter === 'FT'
      ? 'FT'
      : match.quarter === 'OT'
      ? 'OT'
      : `Q${match.quarter}`;

  return (
    <div
      className={`flex flex-col gap-1.5 p-3 rounded-lg bg-dark-800/80 border border-dark-700/50 min-w-[200px] shrink-0 transition-all duration-300 ${
        isFlashing ? 'ring-1 ring-green-500/60 bg-green-500/5' : ''
      } ${match.status === 'live' ? 'hover:border-red-500/30' : 'hover:border-dark-600'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs text-dark-500">{match.league}</span>
        <div className="flex items-center gap-1.5">
          {match.status === 'live' && (
            <span className="text-2xs text-dark-400 font-mono">{match.clock}</span>
          )}
          <StatusBadge
            status={match.status}
            extra={match.status === 'live' ? periodLabel : undefined}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge team={match.home} size="sm" />
          <span className="text-xs font-semibold text-dark-100 truncate">{match.home.abbr}</span>
        </div>
        <span
          className={`text-sm font-bold font-mono tabular-nums transition-colors duration-500 ${
            isFlashing ? 'text-green-400' : 'text-dark-100'
          }`}
        >
          {match.homeScore}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge team={match.away} size="sm" />
          <span className="text-xs font-semibold text-dark-100 truncate">{match.away.abbr}</span>
        </div>
        <span
          className={`text-sm font-bold font-mono tabular-nums transition-colors duration-500 ${
            isFlashing ? 'text-green-400' : 'text-dark-100'
          }`}
        >
          {match.awayScore}
        </span>
      </div>
    </div>
  );
}

function TennisCard({ match, isFlashing }: { match: TennisMatch; isFlashing: boolean }) {
  return (
    <div
      className={`flex flex-col gap-1.5 p-3 rounded-lg bg-dark-800/80 border border-dark-700/50 min-w-[220px] shrink-0 transition-all duration-300 ${
        isFlashing ? 'ring-1 ring-green-500/60 bg-green-500/5' : ''
      } ${match.status === 'live' ? 'hover:border-red-500/30' : 'hover:border-dark-600'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs text-dark-500 truncate max-w-[140px]">{match.league}</span>
        <StatusBadge status={match.status} extra={match.status === 'live' ? `Set ${match.currentSet}` : undefined} />
      </div>

      {/* Player 1 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {match.serving === 1 && match.status === 'live' && (
            <Circle size={6} className="text-green-400 fill-green-400 shrink-0" />
          )}
          <span className={`text-xs font-semibold truncate ${match.serving === 1 ? 'text-dark-100' : 'text-dark-300'}`}>
            {match.player1.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {match.sets.map((s, i) => (
            <span
              key={i}
              className={`text-xs font-mono font-bold tabular-nums w-4 text-center ${
                i === match.sets.length - 1 && match.status === 'live'
                  ? 'text-brand-400'
                  : s[0] > s[1]
                  ? 'text-dark-100'
                  : 'text-dark-500'
              }`}
            >
              {s[0]}
            </span>
          ))}
          {match.status === 'live' && (
            <span className="text-2xs font-mono text-yellow-400 w-4 text-center">
              {match.currentGame[0]}
            </span>
          )}
        </div>
      </div>

      {/* Player 2 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {match.serving === 2 && match.status === 'live' && (
            <Circle size={6} className="text-green-400 fill-green-400 shrink-0" />
          )}
          <span className={`text-xs font-semibold truncate ${match.serving === 2 ? 'text-dark-100' : 'text-dark-300'}`}>
            {match.player2.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {match.sets.map((s, i) => (
            <span
              key={i}
              className={`text-xs font-mono font-bold tabular-nums w-4 text-center ${
                i === match.sets.length - 1 && match.status === 'live'
                  ? 'text-brand-400'
                  : s[1] > s[0]
                  ? 'text-dark-100'
                  : 'text-dark-500'
              }`}
            >
              {s[1]}
            </span>
          ))}
          {match.status === 'live' && (
            <span className="text-2xs font-mono text-yellow-400 w-4 text-center">
              {match.currentGame[1]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function F1Card({ match }: { match: F1Match }) {
  return (
    <div
      className={`flex flex-col gap-1.5 p-3 rounded-lg bg-dark-800/80 border border-dark-700/50 min-w-[210px] shrink-0 transition-all ${
        match.status === 'live' ? 'hover:border-red-500/30' : 'hover:border-dark-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs text-dark-500 truncate">{match.raceName}</span>
        <StatusBadge
          status={match.status}
          extra={match.status === 'live' ? `Lap ${match.lap}/${match.totalLaps}` : undefined}
        />
      </div>

      <div className="flex flex-col gap-0.5">
        {match.positions.slice(0, 5).map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-2xs font-bold w-4 text-center ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-dark-300' : i === 2 ? 'text-amber-600' : 'text-dark-500'
                }`}
              >
                P{i + 1}
              </span>
              <span className="text-xs text-dark-200 truncate">{p.driver}</span>
            </div>
            <span className="text-2xs font-mono text-dark-500">{p.gap}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CricketCard({ match, isFlashing }: { match: CricketMatch; isFlashing: boolean }) {
  return (
    <div
      className={`flex flex-col gap-1.5 p-3 rounded-lg bg-dark-800/80 border border-dark-700/50 min-w-[200px] shrink-0 transition-all duration-300 ${
        isFlashing ? 'ring-1 ring-green-500/60 bg-green-500/5' : ''
      } ${match.status === 'live' ? 'hover:border-red-500/30' : 'hover:border-dark-600'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs text-dark-500 truncate max-w-[120px]">{match.league}</span>
        <StatusBadge
          status={match.status}
          extra={match.status === 'live' ? `Inn ${match.innings}` : undefined}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge team={match.home} size="sm" />
          <span className="text-xs font-semibold text-dark-100 truncate">{match.home.abbr}</span>
        </div>
        <span
          className={`text-sm font-bold font-mono tabular-nums transition-colors duration-500 ${
            isFlashing ? 'text-green-400' : 'text-dark-100'
          }`}
        >
          {match.battingScore}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge team={match.away} size="sm" />
          <span className="text-xs font-semibold text-dark-100 truncate">{match.away.abbr}</span>
        </div>
        <span className="text-xs font-mono text-dark-400">{match.bowlingScore}</span>
      </div>

      {match.status === 'live' && (
        <div className="text-2xs text-dark-500 font-mono text-right">
          Overs: {match.overs}
        </div>
      )}
    </div>
  );
}

function MMACard({ match }: { match: MMAMatch }) {
  return (
    <div
      className={`flex flex-col gap-1.5 p-3 rounded-lg bg-dark-800/80 border border-dark-700/50 min-w-[200px] shrink-0 transition-all ${
        match.status === 'live' ? 'hover:border-red-500/30' : 'hover:border-dark-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs text-dark-500 truncate">{match.event}</span>
        <StatusBadge
          status={match.status}
          extra={match.status === 'live' ? `R${match.round}/${match.totalRounds}` : undefined}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge team={match.fighter1} size="sm" />
          <span className="text-xs font-semibold text-dark-100 truncate">{match.fighter1.name}</span>
        </div>
        <span className="text-2xs font-bold text-dark-300">VS</span>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-dark-100 truncate">{match.fighter2.name}</span>
          <TeamBadge team={match.fighter2} size="sm" />
        </div>
      </div>

      {match.status === 'live' && (
        <div className="text-center text-2xs font-mono text-dark-400">{match.clock}</div>
      )}
    </div>
  );
}

// Generic match card router
function MatchCard({ match, isFlashing }: { match: Match; isFlashing: boolean }) {
  switch (match.sport) {
    case 'football':
      return <FootballCard match={match} isFlashing={isFlashing} />;
    case 'basketball':
      return <BasketballCard match={match} isFlashing={isFlashing} />;
    case 'tennis':
      return <TennisCard match={match} isFlashing={isFlashing} />;
    case 'f1':
      return <F1Card match={match} />;
    case 'cricket':
      return <CricketCard match={match} isFlashing={isFlashing} />;
    case 'mma':
      return <MMACard match={match} />;
  }
}

// ---------------------------------------------------------------------------
// Compact result row for finished matches
// ---------------------------------------------------------------------------

function ResultRow({ match }: { match: Match }) {
  const renderTeams = () => {
    if (match.sport === 'football') {
      const m = match as FootballMatch;
      return (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TeamBadge team={m.home} size="sm" />
          <span className="text-xs text-dark-200 truncate">{m.home.abbr}</span>
          <span className="text-xs font-bold font-mono text-dark-100 tabular-nums">
            {m.homeScore} - {m.awayScore}
          </span>
          <span className="text-xs text-dark-200 truncate">{m.away.abbr}</span>
          <TeamBadge team={m.away} size="sm" />
        </div>
      );
    }
    if (match.sport === 'basketball') {
      const m = match as BasketballMatch;
      return (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TeamBadge team={m.home} size="sm" />
          <span className="text-xs text-dark-200 truncate">{m.home.abbr}</span>
          <span className="text-xs font-bold font-mono text-dark-100 tabular-nums">
            {m.homeScore} - {m.awayScore}
          </span>
          <span className="text-xs text-dark-200 truncate">{m.away.abbr}</span>
          <TeamBadge team={m.away} size="sm" />
        </div>
      );
    }
    if (match.sport === 'tennis') {
      const m = match as TennisMatch;
      return (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs text-dark-200 truncate">{m.player1.name}</span>
          <span className="text-2xs font-mono text-dark-400">
            {m.sets.map((s) => `${s[0]}-${s[1]}`).join(' ')}
          </span>
          <span className="text-xs text-dark-200 truncate">{m.player2.name}</span>
        </div>
      );
    }
    if (match.sport === 'cricket') {
      const m = match as CricketMatch;
      return (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TeamBadge team={m.home} size="sm" />
          <span className="text-xs text-dark-200">{m.home.abbr}</span>
          <span className="text-xs font-mono text-dark-400">{m.battingScore}</span>
          <span className="text-2xs text-dark-600">vs</span>
          <span className="text-xs text-dark-200">{m.away.abbr}</span>
          <span className="text-xs font-mono text-dark-400">{m.bowlingScore}</span>
          <TeamBadge team={m.away} size="sm" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-dark-800/50 rounded transition-colors">
      <StatusBadge status="finished" />
      <span className="text-2xs text-dark-500 w-16 shrink-0 truncate">{match.league}</span>
      {renderTeams()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upcoming row with countdown
// ---------------------------------------------------------------------------

function UpcomingRow({ match }: { match: Match }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    function update() {
      // Simulate upcoming matches as 30 min to 4 hours from now
      const diff = Math.max(0, match.startTime - Date.now() + randInt(30, 240) * 60_000);
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setCountdown(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }
    update();
    const iv = setInterval(update, 60_000);
    return () => clearInterval(iv);
  }, [match.startTime]);

  const renderTeams = () => {
    if (match.sport === 'football') {
      const m = match as FootballMatch;
      return (
        <span className="text-xs text-dark-300 truncate">
          {m.home.name} vs {m.away.name}
        </span>
      );
    }
    if (match.sport === 'basketball') {
      const m = match as BasketballMatch;
      return (
        <span className="text-xs text-dark-300 truncate">
          {m.home.abbr} vs {m.away.abbr}
        </span>
      );
    }
    if (match.sport === 'tennis') {
      const m = match as TennisMatch;
      return (
        <span className="text-xs text-dark-300 truncate">
          {m.player1.name} vs {m.player2.name}
        </span>
      );
    }
    if (match.sport === 'f1') {
      const m = match as F1Match;
      return <span className="text-xs text-dark-300 truncate">{m.raceName}</span>;
    }
    return <span className="text-xs text-dark-300">TBD</span>;
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-dark-800/50 rounded transition-colors">
      <Clock size={10} className="text-brand-400 shrink-0" />
      <span className="text-2xs text-dark-500 w-16 shrink-0 truncate">{match.league}</span>
      {renderTeams()}
      <span className="ml-auto text-2xs font-mono text-brand-400 shrink-0">{countdown}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal scroll container
// ---------------------------------------------------------------------------

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-dark-800/90 border border-dark-700/50 text-dark-300 hover:text-dark-100 hover:bg-dark-700 shadow-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft size={14} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-dark-800/90 border border-dark-700/50 text-dark-300 hover:text-dark-100 hover:bg-dark-700 shadow-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronRight size={14} />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hidden px-0.5 py-0.5"
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SportsHub() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<SportFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const { flashIds, flash } = useScoreFlash();
  const matchesRef = useRef<Match[]>([]);

  // Initialize matches
  useEffect(() => {
    const initialMatches = generateMatchSet();
    setMatches(initialMatches);
    matchesRef.current = initialMatches;
    setIsLoading(false);
  }, []);

  // Keep ref in sync
  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  // Tick match clocks every second
  useEffect(() => {
    const iv = setInterval(() => {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.status !== 'live') return m;

          switch (m.sport) {
            case 'football': {
              const fm = { ...m } as FootballMatch;
              fm.minute = Math.min(fm.minute + 1, 95);
              if (fm.minute === 45) fm.half = 'HT';
              else if (fm.minute === 46) fm.half = 2;
              else if (fm.minute >= 90) {
                fm.half = 'FT';
                fm.status = 'finished';
              }
              return fm;
            }
            case 'basketball': {
              const bm = { ...m } as BasketballMatch;
              // Decrement clock
              const parts = bm.clock.split(':');
              let mins = parseInt(parts[0], 10);
              let secs = parseInt(parts[1], 10);
              if (secs > 0) {
                secs--;
              } else if (mins > 0) {
                mins--;
                secs = 59;
              } else {
                // Quarter over
                if (bm.quarter === 4) {
                  bm.quarter = 'FT';
                  bm.status = 'finished';
                } else if (typeof bm.quarter === 'number') {
                  bm.quarter = (bm.quarter + 1) as 1 | 2 | 3 | 4;
                  mins = 12;
                  secs = 0;
                }
              }
              bm.clock = `${mins}:${String(secs).padStart(2, '0')}`;
              return bm;
            }
            case 'mma': {
              const mm = { ...m } as MMAMatch;
              const mparts = mm.clock.split(':');
              let mmins = parseInt(mparts[0], 10);
              let msecs = parseInt(mparts[1], 10);
              msecs++;
              if (msecs >= 60) { msecs = 0; mmins++; }
              if (mmins >= 5) {
                if (mm.round >= mm.totalRounds) {
                  mm.status = 'finished';
                } else {
                  mm.round++;
                  mmins = 0;
                  msecs = 0;
                }
              }
              mm.clock = `${mmins}:${String(msecs).padStart(2, '0')}`;
              return mm;
            }
            default:
              return m;
          }
        }),
      );
    }, 1000);

    return () => clearInterval(iv);
  }, []);

  // Random score updates every few seconds (simulates live scoring)
  useEffect(() => {
    const iv = setInterval(() => {
      setMatches((prev) => {
        const liveMatches = prev.filter((m) => m.status === 'live');
        if (liveMatches.length === 0) return prev;

        // Pick a random live match to update
        const target = pick(liveMatches);

        return prev.map((m) => {
          if (m.id !== target.id) return m;

          const updated = { ...m };

          switch (updated.sport) {
            case 'football': {
              const fm = updated as FootballMatch;
              // Goal! ~10% chance per tick (tick every 20-40s means roughly 1 goal per few minutes)
              if (Math.random() < 0.15) {
                if (Math.random() > 0.5) fm.homeScore++;
                else fm.awayScore++;
                flash(fm.id);
              }
              return fm;
            }
            case 'basketball': {
              const bm = updated as BasketballMatch;
              // Basketball scores more frequently
              const pts = pick([2, 2, 2, 3, 1]);
              if (Math.random() > 0.5) bm.homeScore += pts;
              else bm.awayScore += pts;
              flash(bm.id);
              return bm;
            }
            case 'tennis': {
              const tm = updated as TennisMatch;
              // Advance game point
              const points = [0, 15, 30, 40];
              const side = Math.random() > 0.5 ? 0 : 1;
              const curr = tm.currentGame[side];
              if (curr >= 40) {
                // Game won - advance set
                const lastSet = tm.sets[tm.sets.length - 1];
                if (lastSet) {
                  lastSet[side]++;
                  if (lastSet[side] >= 6 && lastSet[side] - lastSet[1 - side] >= 2) {
                    // Set won
                    if (tm.sets.length >= 3) {
                      tm.status = 'finished';
                    } else {
                      tm.sets.push([0, 0]);
                      tm.currentSet = tm.sets.length;
                    }
                  }
                }
                tm.currentGame = [0, 0];
                tm.serving = tm.serving === 1 ? 2 : 1;
              } else {
                const idx = points.indexOf(curr);
                tm.currentGame[side] = points[Math.min(idx + 1, 3)];
              }
              flash(tm.id);
              return tm;
            }
            case 'f1': {
              const f1m = updated as F1Match;
              f1m.lap = Math.min(f1m.lap + 1, f1m.totalLaps);
              if (f1m.lap >= f1m.totalLaps) f1m.status = 'finished';
              // Occasional position swap
              if (Math.random() < 0.2 && f1m.positions.length > 1) {
                const idx = randInt(1, Math.min(5, f1m.positions.length - 1));
                const temp = f1m.positions[idx];
                f1m.positions[idx] = f1m.positions[idx - 1];
                f1m.positions[idx - 1] = temp;
                // Recalculate gaps
                f1m.positions.forEach((p, i) => {
                  p.gap = i === 0 ? 'Leader' : `+${(Math.random() * (i * 2.5) + 0.3).toFixed(1)}s`;
                });
              }
              return f1m;
            }
            case 'cricket': {
              const cm = updated as CricketMatch;
              // Add runs
              const runs = pick([0, 1, 1, 2, 4, 6]);
              const currentRuns = parseInt(cm.battingScore.split('/')[0], 10);
              const wickets = parseInt(cm.battingScore.split('/')[1], 10);
              if (Math.random() < 0.08 && wickets < 10) {
                // Wicket!
                cm.battingScore = `${currentRuns}/${wickets + 1}`;
              } else {
                cm.battingScore = `${currentRuns + runs}/${wickets}`;
              }
              // Advance overs
              const oversParts = cm.overs.split('.');
              let oMain = parseInt(oversParts[0], 10);
              let oBall = parseInt(oversParts[1], 10);
              oBall++;
              if (oBall >= 6) { oBall = 0; oMain++; }
              cm.overs = `${oMain}.${oBall}`;
              if (oMain >= 50 || wickets >= 10) cm.status = 'finished';
              flash(cm.id);
              return cm;
            }
            default:
              return updated;
          }
        });
      });
    }, randInt(3000, 6000)); // Score update every 3-6 seconds for variety

    return () => clearInterval(iv);
  }, [flash]);

  // Re-generate finished matches as new live ones periodically (keeps feed alive)
  useEffect(() => {
    const iv = setInterval(() => {
      setMatches((prev) => {
        const finishedCount = prev.filter((m) => m.status === 'finished').length;
        if (finishedCount > 8) {
          // Replace one finished match with a new live one
          const finishedIdx = prev.findIndex((m) => m.status === 'finished');
          if (finishedIdx >= 0) {
            const generators = [
              () => generateFootballMatch('live'),
              () => generateBasketballMatch('live'),
              () => generateTennisMatch('live'),
              () => generateCricketMatch('live'),
              () => generateMMAMatch('live'),
            ];
            const newMatch = pick(generators)();
            const next = [...prev];
            next[finishedIdx] = newMatch;
            return next;
          }
        }
        return prev;
      });
    }, 30_000);

    return () => clearInterval(iv);
  }, []);

  // Attempt to fetch real data (with fallback already in place as simulated data)
  useEffect(() => {
    async function fetchRealData() {
      try {
        const res = await fetch('/api/sports');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Merge real data if available
            // For now, API endpoint may not exist, so simulated data is primary
          }
        }
      } catch {
        // Silently fall back to simulated data
      }
    }
    fetchRealData();
    const iv = setInterval(fetchRealData, 30_000);
    return () => clearInterval(iv);
  }, []);

  // Filtered matches
  const filtered = useMemo(() => {
    if (filter === 'all') return matches;
    return matches.filter((m) => m.sport === filter);
  }, [matches, filter]);

  const liveMatches = useMemo(() => filtered.filter((m) => m.status === 'live'), [filtered]);
  const finishedMatches = useMemo(() => filtered.filter((m) => m.status === 'finished'), [filtered]);
  const upcomingMatches = useMemo(() => filtered.filter((m) => m.status === 'upcoming'), [filtered]);

  const liveCount = matches.filter((m) => m.status === 'live').length;

  // Sport icon helper
  const sportIcon = (sport: SportType) => {
    switch (sport) {
      case 'football': return '\u26BD';
      case 'basketball': return '\uD83C\uDFC0';
      case 'tennis': return '\uD83C\uDFBE';
      case 'f1': return '\uD83C\uDFCE\uFE0F';
      case 'cricket': return '\uD83C\uDFCF';
      case 'mma': return '\uD83E\uDD4A';
    }
  };

  return (
    <div className="card flex flex-col">
      {/* Header */}
      <div className="card-header py-2">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-yellow-400" />
          <h2 className="text-xs font-bold text-dark-100">Sports Center</h2>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-2xs font-bold uppercase tracking-wider">
            <LiveDot />
            Live
          </span>
          {liveCount > 0 && (
            <span className="text-2xs text-dark-500">{liveCount} matches</span>
          )}
        </div>
        <button
          onClick={() => {
            setIsLoading(true);
            const newMatches = generateMatchSet();
            setMatches(newMatches);
            setTimeout(() => setIsLoading(false), 300);
          }}
          className="text-dark-500 hover:text-dark-300 transition-colors"
          title="Refresh matches"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sport filter tabs */}
      <div className="px-3 py-1.5 flex gap-1 overflow-x-auto scrollbar-hidden border-b border-dark-700/50">
        {SPORT_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() => setFilter(sf.key)}
            className={`px-2 py-1 rounded text-2xs font-medium whitespace-nowrap transition-all ${
              filter === sf.key
                ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/30'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
            }`}
          >
            {sf.key !== 'all' && (
              <span className="mr-1">{sportIcon(sf.key as SportType)}</span>
            )}
            {sf.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hidden">
        {/* Live Scores Section */}
        {liveMatches.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity size={10} className="text-red-400" />
              <span className="text-2xs font-bold text-dark-300 uppercase tracking-wider">
                Live Now
              </span>
              <span className="text-2xs text-dark-600">({liveMatches.length})</span>
            </div>
            <HorizontalScroll>
              {liveMatches.map((m) => (
                <MatchCard key={m.id} match={m} isFlashing={flashIds.has(m.id)} />
              ))}
            </HorizontalScroll>
          </div>
        )}

        {/* Recent Results */}
        {finishedMatches.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Flag size={10} className="text-dark-400" />
              <span className="text-2xs font-bold text-dark-300 uppercase tracking-wider">
                Recent Results
              </span>
            </div>
            <div className="flex flex-col">
              {finishedMatches.slice(0, 6).map((m) => (
                <ResultRow key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcomingMatches.length > 0 && (
          <div className="px-3 pt-2 pb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Timer size={10} className="text-brand-400" />
              <span className="text-2xs font-bold text-dark-300 uppercase tracking-wider">
                Upcoming
              </span>
            </div>
            <div className="flex flex-col">
              {upcomingMatches.slice(0, 5).map((m) => (
                <UpcomingRow key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-dark-500">
            <Trophy size={24} className="mb-2 opacity-30" />
            <span className="text-xs">No matches found</span>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={16} className="animate-spin text-dark-500" />
          </div>
        )}
      </div>
    </div>
  );
}
