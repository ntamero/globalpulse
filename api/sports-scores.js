/**
 * GlobalScope — Sports Scores API
 *
 * Proxies ESPN's unofficial API for live scores, fixtures, and standings.
 * No API key required.
 *
 * GET /api/sports-scores?sport=soccer&league=eng.1          → live/recent scores
 * GET /api/sports-scores?sport=soccer&league=eng.1&view=standings → standings
 * GET /api/sports-scores?sport=basketball&league=nba        → NBA scores
 */

export const config = { runtime: 'edge' };

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const ESPN_STANDINGS = 'https://site.api.espn.com/apis/v2/sports';

// Valid sport/league combinations
const VALID_SPORTS = {
  soccer: ['eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1', 'tur.1', 'uefa.champions', 'uefa.europa', 'usa.1', 'fifa.world'],
  basketball: ['nba', 'wnba'],
  football: ['nfl'],
  tennis: ['atp', 'wta'],
  racing: ['f1'],
  cricket: ['icc'],
  baseball: ['mlb'],
  hockey: ['nhl'],
};

function cors(body, status = 200, cacheSeconds = 60) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=30`,
    },
  });
}

function parseScoreboard(data, sport) {
  const events = data?.events || [];
  return events.map(event => {
    const competition = event.competitions?.[0];
    if (!competition) return null;

    const competitors = competition.competitors || [];
    const home = competitors.find(c => c.homeAway === 'home') || competitors[0];
    const away = competitors.find(c => c.homeAway === 'away') || competitors[1];

    const status = competition.status || event.status || {};
    const statusType = status.type || {};

    return {
      id: event.id,
      name: event.name || `${home?.team?.displayName || '?'} vs ${away?.team?.displayName || '?'}`,
      shortName: event.shortName || '',
      date: event.date,
      league: data.leagues?.[0]?.name || '',
      leagueAbbr: data.leagues?.[0]?.abbreviation || '',
      status: {
        state: statusType.state || 'pre', // pre, in, post
        detail: statusType.detail || status.displayClock || '',
        shortDetail: statusType.shortDetail || '',
        completed: statusType.completed || false,
        period: status.period || 0,
        clock: status.displayClock || '',
      },
      home: {
        name: home?.team?.displayName || home?.team?.name || '?',
        abbr: home?.team?.abbreviation || '',
        logo: home?.team?.logo || '',
        score: home?.score || '0',
        winner: home?.winner || false,
      },
      away: {
        name: away?.team?.displayName || away?.team?.name || '?',
        abbr: away?.team?.abbreviation || '',
        logo: away?.team?.logo || '',
        score: away?.score || '0',
        winner: away?.winner || false,
      },
      venue: competition.venue?.fullName || '',
      broadcast: competition.broadcasts?.[0]?.names?.[0] || '',
    };
  }).filter(Boolean);
}

function parseStandings(data) {
  const children = data?.children || [];
  const standings = [];

  for (const group of children) {
    const groupName = group.name || group.abbreviation || '';
    const entries = group.standings?.entries || [];

    for (const entry of entries) {
      const stats = {};
      for (const stat of (entry.stats || [])) {
        stats[stat.abbreviation || stat.name] = stat.displayValue || stat.value;
      }

      standings.push({
        team: entry.team?.displayName || entry.team?.name || '?',
        abbr: entry.team?.abbreviation || '',
        logo: entry.team?.logos?.[0]?.href || '',
        group: groupName,
        stats,
      });
    }
  }

  return standings;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const sport = url.searchParams.get('sport') || 'soccer';
  const league = url.searchParams.get('league') || 'eng.1';
  const view = url.searchParams.get('view') || 'scores';

  // Validate sport
  if (!VALID_SPORTS[sport]) {
    return cors({ error: 'Invalid sport', validSports: Object.keys(VALID_SPORTS) }, 400);
  }

  // Validate league
  if (!VALID_SPORTS[sport].includes(league)) {
    return cors({ error: 'Invalid league', validLeagues: VALID_SPORTS[sport] }, 400);
  }

  try {
    if (view === 'standings') {
      // Standings
      const standingsUrl = `${ESPN_STANDINGS}/${sport}/${league}/standings`;
      const res = await fetch(standingsUrl, {
        headers: { 'User-Agent': 'GlobalScope/3.0' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return cors({ error: 'ESPN standings unavailable', status: res.status }, 502);
      }

      const data = await res.json();
      const standings = parseStandings(data);

      return cors({
        sport,
        league,
        view: 'standings',
        leagueName: data.name || league,
        season: data.season?.displayName || '',
        entries: standings,
      }, 200, 300);
    }

    // Scores / Scoreboard
    const scoreUrl = `${ESPN_BASE}/${sport}/${league}/scoreboard`;
    const res = await fetch(scoreUrl, {
      headers: { 'User-Agent': 'GlobalScope/3.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return cors({ error: 'ESPN scores unavailable', status: res.status }, 502);
    }

    const data = await res.json();
    const matches = parseScoreboard(data, sport);

    return cors({
      sport,
      league,
      view: 'scores',
      leagueName: data.leagues?.[0]?.name || league,
      season: data.leagues?.[0]?.season?.displayName || '',
      day: data.day?.date || new Date().toISOString().split('T')[0],
      matches,
    }, 200, 60);

  } catch (err) {
    return cors({ error: 'Failed to fetch sports data', message: err.message }, 500);
  }
}
