import express from "express";
import https from "https";
import http from "http";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 4300;
const HOST = "127.0.0.1";

// Load .env from parent directory
try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dirname, "../.env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch (e) { /* .env not found, use existing env */ }

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const NASA_FIRMS_KEY = process.env.NASA_FIRMS_API_KEY || process.env.FIRMS_API_KEY || "";
const FRED_API_KEY = process.env.FRED_API_KEY || "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const ACLED_ACCESS_TOKEN = process.env.ACLED_ACCESS_TOKEN || "";
const NOAA_TOKEN = process.env.NOAA_TOKEN || "";

// -- In-memory cache --
const cacheStore = new Map();
function cacheGet(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cacheStore.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data, ttlMs) {
  cacheStore.set(key, { data, expires: Date.now() + ttlMs });
}

// Cleanup old cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cacheStore) {
    if (now > entry.expires) cacheStore.delete(key);
  }
}, 600000);

// -- Fetch helpers --
function fetchJSON(url, headers = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; GlobalPulse/2.4)", ...headers } }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error("JSON parse error: " + e.message + " | " + body.slice(0, 200))); }
      });
    });
    req.on("error", reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error("Request timeout")); });
  });
}

function fetchText(url, headers = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; GlobalPulse/2.4)", ...headers } }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error("Request timeout")); });
  });
}

function postJSON(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = JSON.stringify(body);
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "User-Agent": "GlobalPulse/2.4",
        ...headers
      }
    };
    const mod = parsed.protocol === "https:" ? https : http;
    const req = mod.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("JSON parse error: " + e.message)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Request timeout")); });
    req.write(payload);
    req.end();
  });
}

// -- Yahoo Finance v8 spark helper with batching --
const YAHOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const BATCH_SIZE = 18;

async function fetchYahooSpark(symbols, range, interval) {
  range = range || "5d";
  interval = interval || "1d";
  const symbolList = symbols.split(",").map(s => s.trim()).filter(Boolean);

  if (symbolList.length <= BATCH_SIZE) {
    const url = "https://query1.finance.yahoo.com/v8/finance/spark?symbols=" + encodeURIComponent(symbols) + "&range=" + range + "&interval=" + interval;
    return await fetchJSON(url, { "User-Agent": YAHOO_UA });
  }

  const batches = [];
  for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
    batches.push(symbolList.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(batches.map(batch => {
    const url = "https://query1.finance.yahoo.com/v8/finance/spark?symbols=" + encodeURIComponent(batch.join(",")) + "&range=" + range + "&interval=" + interval;
    return fetchJSON(url, { "User-Agent": YAHOO_UA });
  }));

  const merged = {};
  for (const result of results) {
    if (result.spark && result.spark.result) {
      for (const item of result.spark.result) {
        if (item.symbol) {
          const meta = (item.response?.[0]?.meta) || {};
          const closes = (item.response?.[0]?.indicators?.quote?.[0]?.close) || [];
          const timestamps = (item.response?.[0]?.timestamp) || [];
          merged[item.symbol] = { timestamp: timestamps, symbol: item.symbol, close: closes, chartPreviousClose: meta.chartPreviousClose || meta.previousClose, dataGranularity: meta.dataGranularity || 300 };
        }
      }
    } else {
      for (const [key, value] of Object.entries(result)) {
        if (key !== "spark" && value && typeof value === "object") merged[key] = value;
      }
    }
  }
  return merged;
}

// -- CORS + JSON middleware --
app.use(express.json({ limit: "50kb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ================================================================
//  EXISTING ENDPOINTS (a-l) - kept as-is
// ================================================================

// -- a) Sports Scores --
const SPORT_MAP = { soccer: "soccer", football: "football", basketball: "basketball", baseball: "baseball", hockey: "hockey", tennis: "tennis", f1: "racing/f1", cricket: "cricket", rugby: "rugby", mma: "mma" };

app.get("/api/sports-scores", async (req, res) => {
  try {
    const sport = req.query.sport || "soccer";
    const league = req.query.league || "eng.1";
    const view = req.query.view || "scoreboard";
    const mappedSport = SPORT_MAP[sport] || sport;
    const cacheKey = "sports:" + mappedSport + ":" + league + ":" + view;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    if (view === "standings") {
      const url = "https://site.api.espn.com/apis/v2/sports/" + mappedSport + "/" + league + "/standings";
      const data = await fetchJSON(url);
      const entries = [];
      let leagueName = "";
      let children = data.children || [];
      if (children.length === 0 && data.standings) children = [data.standings];
      for (const group of children) {
        leagueName = leagueName || group.name || "";
        const groupEntries = (group.standings?.entries) || group.entries || [];
        for (const entry of groupEntries) {
          const team = entry.team || {};
          const athlete = entry.athlete || {};
          const statsObj = {};
          for (const s of (entry.stats || [])) { statsObj[s.abbreviation || s.name] = String(s.displayValue || s.value || "0"); }
          entries.push({
            team: team.displayName || team.name || athlete.displayName || athlete.name || "Unknown",
            abbr: team.abbreviation || athlete.abbreviation || "",
            logo: team.logos?.[0]?.href || athlete.flag?.href || "",
            group: group.name || "",
            stats: statsObj
          });
        }
      }
      const payload = { entries, leagueName };
      cacheSet(cacheKey, payload, 30000);
      return res.json(payload);
    }

    if (view === "news") {
      const newsData = await fetchJSON("https://site.api.espn.com/apis/site/v2/sports/" + mappedSport + "/" + league + "/news");
      cacheSet(cacheKey, newsData, 30000);
      return res.json(newsData);
    }

    // Scoreboard
    const scoreData = await fetchJSON("https://site.api.espn.com/apis/site/v2/sports/" + mappedSport + "/" + league + "/scoreboard");
    const events = scoreData.events || [];
    const leagueInfo = scoreData.leagues?.[0] || {};
    const matches = events.map(ev => {
      const comp = ev.competitions?.[0] || {};
      const competitors = comp.competitors || [];
      let homeTeam = null, awayTeam = null;
      for (const t of competitors) {
        const info = {
          name: t.team?.displayName || t.team?.name || t.athlete?.displayName || t.athlete?.name || "TBD",
          abbr: t.team?.abbreviation || t.athlete?.abbreviation || "",
          logo: t.team?.logo || t.team?.logos?.[0]?.href || t.athlete?.flag?.href || "",
          score: t.score || "0",
          winner: t.winner || false
        };
        if (t.homeAway === "home") homeTeam = info;
        else awayTeam = info;
      }
      if (!homeTeam && competitors[0]) { const t = competitors[0]; homeTeam = { name: t.team?.displayName || t.athlete?.displayName || "P1", abbr: t.team?.abbreviation || "", logo: t.team?.logo || "", score: t.score || "0", winner: t.winner || false }; }
      if (!awayTeam && competitors[1]) { const t = competitors[1]; awayTeam = { name: t.team?.displayName || t.athlete?.displayName || "P2", abbr: t.team?.abbreviation || "", logo: t.team?.logo || "", score: t.score || "0", winner: t.winner || false }; }
      const st = ev.status?.type || {};
      const bc = comp.broadcasts?.[0]?.names?.join(", ") || "";
      return {
        id: ev.id || "", name: ev.name || "", shortName: ev.shortName || "", date: ev.date || "",
        league: leagueInfo.name || league, leagueAbbr: leagueInfo.abbreviation || league,
        status: { state: st.state || "pre", detail: st.detail || "", shortDetail: st.shortDetail || "", completed: st.completed || false, period: ev.status?.period || 0, clock: ev.status?.displayClock || "" },
        home: homeTeam || { name: "TBD", abbr: "", logo: "", score: "0", winner: false },
        away: awayTeam || { name: "TBD", abbr: "", logo: "", score: "0", winner: false },
        venue: comp.venue?.fullName || "", broadcast: bc
      };
    });
    const payload = { matches, league: leagueInfo };
    cacheSet(cacheKey, payload, 30000);
    res.json(payload);
  } catch (err) {
    console.error("[sports-scores]", err.message);
    res.status(502).json({ error: "Failed to fetch sports scores", detail: err.message });
  }
});

// -- b) Conflict Events (GDELT) --
app.get("/api/ucdp-events", async (req, res) => {
  try {
    const cacheKey = "ucdp-conflict-events";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const url = "https://api.gdeltproject.org/api/v2/doc/doc?query=(conflict%20OR%20attack%20OR%20violence%20OR%20war%20OR%20military)&mode=artlist&maxrecords=50&format=json&timespan=48h&sort=datedesc";
    const data = await fetchJSON(url, {}, 20000);
    const payload = {
      source: "gdelt", generated: new Date().toISOString(),
      count: data.articles?.length || 0,
      events: (data.articles || []).map(a => ({ title: a.title, url: a.url, source: a.domain || a.source?.domain, date: a.seendate, language: a.language, sourcecountry: a.sourcecountry }))
    };
    cacheSet(cacheKey, payload, 600000);
    res.json(payload);
  } catch (err) {
    console.error("[ucdp-events]", err.message);
    res.status(502).json({ error: "Failed to fetch conflict events", detail: err.message });
  }
});

// -- c) UNHCR Population --
app.get("/api/unhcr-population", async (req, res) => {
  try {
    const cacheKey = "unhcr-population";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const lastYear = new Date().getFullYear() - 1;
    const data = await fetchJSON("https://api.unhcr.org/population/v1/population/?limit=20&year=" + lastYear + "&page=1");
    cacheSet(cacheKey, data, 3600000);
    res.json(data);
  } catch (err) {
    console.error("[unhcr-population]", err.message);
    res.status(502).json({ error: "Failed to fetch UNHCR data", detail: err.message });
  }
});

// -- d) Climate Anomalies --
app.get("/api/climate-anomalies", async (req, res) => {
  try {
    const cacheKey = "climate-anomalies";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const now = new Date();
    const endDate = now.toISOString().slice(0, 10);
    const startDate = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);
    const cities = [
      { name: "New York", lat: 40.71, lon: -74.01 }, { name: "London", lat: 51.51, lon: -0.13 },
      { name: "Tokyo", lat: 35.68, lon: 139.69 }, { name: "Sydney", lat: -33.87, lon: 151.21 },
      { name: "Sao Paulo", lat: -23.55, lon: -46.63 }, { name: "Cairo", lat: 30.04, lon: 31.24 },
      { name: "Mumbai", lat: 19.08, lon: 72.88 }, { name: "Beijing", lat: 39.90, lon: 116.40 },
    ];
    const results = [];
    for (const city of cities) {
      try {
        const d = await fetchJSON("https://climate-api.open-meteo.com/v1/climate?latitude=" + city.lat + "&longitude=" + city.lon + "&start_date=" + startDate + "&end_date=" + endDate + "&daily=temperature_2m_mean&models=EC_Earth3P_HR");
        results.push({ city: city.name, lat: city.lat, lon: city.lon, data: d });
      } catch { results.push({ city: city.name, lat: city.lat, lon: city.lon, data: null }); }
    }
    const payload = { generated: new Date().toISOString(), cities: results };
    cacheSet(cacheKey, payload, 3600000);
    res.json(payload);
  } catch (err) {
    console.error("[climate-anomalies]", err.message);
    res.status(502).json({ error: "Failed to fetch climate data", detail: err.message });
  }
});

// -- e) WorldPop Exposure --
app.get("/api/worldpop-exposure", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 0;
    const lon = parseFloat(req.query.lon) || 0;
    const radius = parseFloat(req.query.radius) || 50;
    const cacheKey = "worldpop:" + lat + ":" + lon + ":" + radius;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const absLat = Math.abs(lat);
    let baseDensity = absLat < 15 ? 120 : absLat < 30 ? 200 : absLat < 45 ? 150 : absLat < 60 ? 60 : 10;
    if (lon > 68 && lon < 145 && lat > 5 && lat < 45) baseDensity *= 2.5;
    else if (lon > -10 && lon < 30 && lat > 35 && lat < 60) baseDensity *= 1.8;
    else if (lon > -90 && lon < -70 && lat > 25 && lat < 50) baseDensity *= 1.5;
    const areaSqKm = Math.PI * radius * radius;
    const payload = { lat, lon, radiusKm: radius, areaSqKm: Math.round(areaSqKm), estimatedPopulation: Math.round(baseDensity * areaSqKm), densityPerSqKm: Math.round(baseDensity), source: "estimate-model" };
    cacheSet(cacheKey, payload, 3600000);
    res.json(payload);
  } catch (err) {
    console.error("[worldpop-exposure]", err.message);
    res.status(502).json({ error: "Failed to compute population exposure", detail: err.message });
  }
});

// -- f) Tech Events --
app.get("/api/tech-events", async (req, res) => {
  try {
    const cacheKey = "tech-events";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const Y = new Date().getFullYear();
    const NY = Y + 1;
    const events = [
      { name: "CES", date: Y+"-01-07", endDate: Y+"-01-10", location: "Las Vegas, USA", category: "consumer-electronics" },
      { name: "MWC Barcelona", date: Y+"-02-24", endDate: Y+"-02-27", location: "Barcelona, Spain", category: "mobile" },
      { name: "GDC", date: Y+"-03-17", endDate: Y+"-03-21", location: "San Francisco, USA", category: "gaming" },
      { name: "Google Cloud Next", date: Y+"-04-09", endDate: Y+"-04-11", location: "Las Vegas, USA", category: "cloud" },
      { name: "RSA Conference", date: Y+"-04-28", endDate: Y+"-05-01", location: "San Francisco, USA", category: "security" },
      { name: "Microsoft Build", date: Y+"-05-19", endDate: Y+"-05-21", location: "Seattle, USA", category: "developer" },
      { name: "Google I/O", date: Y+"-05-20", endDate: Y+"-05-21", location: "Mountain View, USA", category: "developer" },
      { name: "Computex", date: Y+"-06-03", endDate: Y+"-06-06", location: "Taipei, Taiwan", category: "hardware" },
      { name: "WWDC", date: Y+"-06-09", endDate: Y+"-06-13", location: "Cupertino, USA", category: "developer" },
      { name: "VivaTech", date: Y+"-06-11", endDate: Y+"-06-14", location: "Paris, France", category: "startup" },
      { name: "Black Hat USA", date: Y+"-08-02", endDate: Y+"-08-07", location: "Las Vegas, USA", category: "security" },
      { name: "DEF CON", date: Y+"-08-07", endDate: Y+"-08-10", location: "Las Vegas, USA", category: "security" },
      { name: "Gamescom", date: Y+"-08-20", endDate: Y+"-08-24", location: "Cologne, Germany", category: "gaming" },
      { name: "IFA Berlin", date: Y+"-09-05", endDate: Y+"-09-09", location: "Berlin, Germany", category: "consumer-electronics" },
      { name: "TechCrunch Disrupt", date: Y+"-09-15", endDate: Y+"-09-17", location: "San Francisco, USA", category: "startup" },
      { name: "Meta Connect", date: Y+"-09-25", endDate: Y+"-09-26", location: "Menlo Park, USA", category: "vr-ar" },
      { name: "GitHub Universe", date: Y+"-10-29", endDate: Y+"-10-30", location: "San Francisco, USA", category: "developer" },
      { name: "Web Summit", date: Y+"-11-11", endDate: Y+"-11-14", location: "Lisbon, Portugal", category: "general" },
      { name: "AWS re:Invent", date: Y+"-12-01", endDate: Y+"-12-05", location: "Las Vegas, USA", category: "cloud" },
      { name: "NeurIPS", date: Y+"-12-09", endDate: Y+"-12-15", location: "Vancouver, Canada", category: "ai-ml" },
      { name: "CES (next)", date: NY+"-01-06", endDate: NY+"-01-09", location: "Las Vegas, USA", category: "consumer-electronics" },
    ];
    const days = parseInt(req.query.days) || 180;
    const limit = parseInt(req.query.limit) || 100;
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 86400000);
    const filtered = events.filter(e => new Date(e.endDate) >= now && new Date(e.date) <= cutoff)
      .sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, limit)
      .map(e => ({ ...e, daysUntil: Math.max(0, Math.ceil((new Date(e.date) - now) / 86400000)), status: new Date(e.date) <= now && new Date(e.endDate) >= now ? "ongoing" : "upcoming" }));
    const payload = { generated: new Date().toISOString(), count: filtered.length, events: filtered };
    cacheSet(cacheKey, payload, 3600000);
    res.json(payload);
  } catch (err) {
    console.error("[tech-events]", err.message);
    res.status(502).json({ error: "Failed to get tech events", detail: err.message });
  }
});

// -- g) Service Status --
app.get("/api/service-status", async (req, res) => {
  try {
    const cacheKey = "service-status";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const services = [
      { name: "GitHub", url: "https://www.githubstatus.com/api/v2/status.json" },
      { name: "Cloudflare", url: "https://www.cloudflarestatus.com/api/v2/status.json" },
      { name: "Vercel", url: "https://www.vercel-status.com/api/v2/status.json" },
      { name: "Netlify", url: "https://www.netlifystatus.com/api/v2/status.json" },
    ];
    const results = await Promise.allSettled(services.map(async svc => {
      try {
        const data = await fetchJSON(svc.url);
        return { name: svc.name, status: data.status?.indicator === "none" ? "operational" : data.status?.indicator || "unknown", description: data.status?.description || "Unknown" };
      } catch { return { name: svc.name, status: "unknown", description: "Could not reach" }; }
    }));
    const payload = { generated: new Date().toISOString(), services: results.map(r => r.status === "fulfilled" ? r.value : { name: "Unknown", status: "error", description: "Check failed" }) };
    cacheSet(cacheKey, payload, 120000);
    res.json(payload);
  } catch (err) {
    console.error("[service-status]", err.message);
    res.status(502).json({ error: "Failed to fetch service status", detail: err.message });
  }
});

// -- h) Macro Signals --
app.get("/api/macro-signals", async (req, res) => {
  try {
    const cacheKey = "macro-signals";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const data = await fetchYahooSpark("^GSPC,^DJI,^IXIC,^VIX,GC=F,CL=F,^TNX,EURUSD=X,BTC-USD", "5d", "1d");
    const signals = [];
    for (const [symbol, info] of Object.entries(data)) {
      if (!info || typeof info !== "object" || !info.close) continue;
      const closes = info.close.filter(c => c !== null);
      if (closes.length < 2) continue;
      const last = closes[closes.length - 1];
      const prev = info.chartPreviousClose || closes[0];
      const change = last - prev;
      const pct = prev !== 0 ? (change / prev) * 100 : 0;
      signals.push({ symbol: info.symbol || symbol, price: Math.round(last * 100) / 100, change: Math.round(change * 100) / 100, changePercent: Math.round(pct * 100) / 100, sparkline: closes.map(c => Math.round(c * 100) / 100) });
    }
    const payload = { generated: new Date().toISOString(), signals };
    cacheSet(cacheKey, payload, 60000);
    res.json(payload);
  } catch (err) {
    console.error("[macro-signals]", err.message);
    res.status(502).json({ error: "Failed to fetch macro signals", detail: err.message });
  }
});

// -- i) Yahoo Spark --
app.get("/api/yahoo-spark", async (req, res) => {
  try {
    const symbols = req.query.symbols || "^GSPC";
    const range = req.query.range || "5d";
    const interval = req.query.interval || "1d";
    const cacheKey = "yahoo-spark:" + symbols + ":" + range + ":" + interval;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const data = await fetchYahooSpark(symbols, range, interval);
    cacheSet(cacheKey, data, 60000);
    res.json(data);
  } catch (err) {
    console.error("[yahoo-spark]", err.message);
    res.status(502).json({ error: "Failed to fetch Yahoo spark", detail: err.message });
  }
});

// -- j) Stablecoin Markets --
app.get("/api/stablecoin-markets", async (req, res) => {
  try {
    const cacheKey = "stablecoin-markets";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const data = await fetchJSON("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=stablecoins&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=1h,24h,7d");
    cacheSet(cacheKey, data, 300000);
    res.json(data);
  } catch (err) {
    console.error("[stablecoin-markets]", err.message);
    res.status(502).json({ error: "Failed to fetch stablecoin markets", detail: err.message });
  }
});

// -- k) ETF Flows --
app.get("/api/etf-flows", async (req, res) => {
  try {
    const cacheKey = "etf-flows";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const data = await fetchYahooSpark("IBIT,FBTC,ARKB,BITB,HODL", "1mo", "1d");
    const etfs = [];
    for (const [symbol, info] of Object.entries(data)) {
      if (!info || !info.close) continue;
      const closes = info.close.filter(c => c !== null);
      if (closes.length < 2) continue;
      const last = closes[closes.length - 1];
      const prev = info.chartPreviousClose || closes[0];
      const change = last - prev;
      const pct = prev !== 0 ? (change / prev) * 100 : 0;
      etfs.push({ symbol: info.symbol || symbol, name: symbol, price: Math.round(last * 100) / 100, change: Math.round(change * 100) / 100, changePercent: Math.round(pct * 100) / 100, sparkline: closes.map(c => Math.round(c * 100) / 100) });
    }
    cacheSet(cacheKey, { generated: new Date().toISOString(), etfs }, 300000);
    res.json({ generated: new Date().toISOString(), etfs });
  } catch (err) {
    console.error("[etf-flows]", err.message);
    res.status(502).json({ error: "Failed to fetch ETF flows", detail: err.message });
  }
});

// -- l) RSS Feed Proxy (expanded domains) --
app.get("/api/rss-proxy", async (req, res) => {
  try {
    const feedUrl = req.query.url;
    if (!feedUrl) return res.status(400).json({ error: "Missing url parameter" });

    // Generous allowlist for RSS/news domains
    const allowedDomains = [
      "feeds.bbci.co.uk", "rss.nytimes.com", "feeds.reuters.com", "feeds.feedburner.com",
      "news.google.com", "rsshub.app", "rss.app", "www.aljazeera.com", "techcrunch.com",
      "feeds.arstechnica.com", "www.theverge.com",
      // Additional news sources
      "feeds.npr.org", "www.npr.org", "www.theguardian.com", "feeds.guardian.co.uk",
      "rss.cnn.com", "www.cnn.com", "feeds.cnbc.com", "www.cnbc.com",
      "www.ft.com", "feeds.ft.com", "news.mit.edu", "www.technologyreview.com",
      "export.arxiv.org", "arxiv.org", "feeds.venturebeat.com", "venturebeat.com",
      "feeds.finance.yahoo.com", "finance.yahoo.com",
      "www.euronews.com", "feeds.euronews.com", "www.france24.com", "feeds.france24.com",
      "news.ycombinator.com", "hnrss.org",
      // Middle East / Africa / Latin America / Asia news
      "www.middleeasteye.net", "www.al-monitor.com", "english.alarabiya.net",
      "www.africanews.com", "www.devex.com", "www.channelnewsasia.com",
      "www.scmp.com", "asia.nikkei.com",
      // Think tanks / policy
      "www.brookings.edu", "www.cfr.org", "carnegieendowment.org",
      "www.chathamhouse.org", "www.rand.org", "www.csis.org",
      // Energy / commodities
      "oilprice.com", "www.eia.gov", "www.iea.org",
      // Tech / AI
      "openai.com", "blog.google", "ai.googleblog.com", "blogs.microsoft.com",
      "engineering.fb.com", "www.wired.com", "arstechnica.com",
      // Crypto
      "cointelegraph.com", "www.coindesk.com", "decrypt.co",
      // General
      "www.bbc.com", "www.bbc.co.uk", "feeds.washingtonpost.com",
      "rss.politico.com", "thehill.com", "www.reuters.com",
      "feeds.skynews.com", "www.dw.com", "www3.nhk.or.jp",
      // Layoffs
      "layoffs.fyi",
    ];

    try {
      const urlObj = new URL(feedUrl);
      // Block only obviously dangerous URLs (localhost, private IPs)
      const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.", "10.", "192.168.", "172.16."];
      if (blocked.some(b => urlObj.hostname.startsWith(b))) {
        return res.status(403).json({ error: "Internal URLs not allowed" });
      }
    } catch { return res.status(400).json({ error: "Invalid URL" }); }

    const cacheKey = "rss:" + feedUrl;
    const cached = cacheGet(cacheKey);
    if (cached) { res.type("application/xml"); return res.send(cached); }
    const text = await fetchText(feedUrl);
    cacheSet(cacheKey, text, 300000);
    res.type("application/xml");
    res.send(text);
  } catch (err) {
    console.error("[rss-proxy]", err.message);
    res.status(502).json({ error: "Failed to fetch RSS feed", detail: err.message });
  }
});

// ================================================================
//  NEW ENDPOINTS (m-z+)
// ================================================================

// -- m) Earthquakes (USGS) --
app.get("/api/earthquakes", async (req, res) => {
  try {
    const cacheKey = "earthquakes";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const data = await fetchJSON("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson");
    cacheSet(cacheKey, data, 300000);
    res.json(data);
  } catch (err) {
    console.error("[earthquakes]", err.message);
    res.status(502).json({ error: "Failed to fetch earthquakes", detail: err.message });
  }
});

// -- n) Polymarket --
app.get("/api/polymarket", async (req, res) => {
  try {
    const endpoint = req.query.endpoint || "events";
    const closed = req.query.closed || "false";
    const order = req.query.order || "volume";
    const ascending = req.query.ascending || "false";
    const limit = req.query.limit || "50";
    const tag = req.query.tag || "";

    const cacheKey = "polymarket:" + endpoint + ":" + tag + ":" + limit;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    let url = "https://gamma-api.polymarket.com/" + endpoint + "?closed=" + closed + "&order=" + order + "&ascending=" + ascending + "&limit=" + limit;
    if (tag) url += "&tag=" + encodeURIComponent(tag);

    try {
      const data = await fetchJSON(url, {}, 10000);
      cacheSet(cacheKey, data, 120000);
      res.json(data);
    } catch (fetchErr) {
      // Polymarket sometimes blocks server-side requests
      console.warn("[polymarket] Fetch failed, returning empty:", fetchErr.message);
      res.json([]);
    }
  } catch (err) {
    console.error("[polymarket]", err.message);
    res.json([]);
  }
});

// -- o) GDELT Doc API --
app.get("/api/gdelt-doc", async (req, res) => {
  try {
    const query = (req.query.query || "").replace(/[<>"']/g, "");
    const maxrecords = Math.min(parseInt(req.query.maxrecords) || 10, 250);
    const timespan = req.query.timespan || "72h";
    const mode = req.query.mode || "artlist";
    const format = req.query.format || "json";

    const cacheKey = "gdelt-doc:" + query + ":" + maxrecords + ":" + timespan + ":" + mode;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const url = "https://api.gdeltproject.org/api/v2/doc/doc?query=" + encodeURIComponent(query || "world") + "&mode=" + mode + "&maxrecords=" + maxrecords + "&format=" + format + "&timespan=" + timespan + "&sort=datedesc";
    let data;
    try {
      data = await fetchJSON(url, {}, 25000);
    } catch (gdeltErr) {
      // GDELT may be unreachable from this server, return empty result
      console.warn("[gdelt-doc] GDELT unreachable:", gdeltErr.message);
      data = { articles: [] };
    }

    // Strip articles to essential fields
    if (data.articles) {
      data.articles = data.articles.map(a => ({
        title: a.title, url: a.url, source: a.domain || a.source?.domain,
        date: a.seendate, image: a.socialimage, language: a.language,
        tone: a.tone, sourcecountry: a.sourcecountry
      }));
    }

    cacheSet(cacheKey, data, 300000);
    res.json(data);
  } catch (err) {
    console.error("[gdelt-doc]", err.message);
    res.status(502).json({ error: "Failed to fetch GDELT doc data", detail: err.message });
  }
});

// -- p) GDELT Geo API --
app.get("/api/gdelt-geo", async (req, res) => {
  try {
    const query = (req.query.query || "protest").replace(/[<>"']/g, "");
    const format = req.query.format || "geojson";
    const maxrecords = Math.min(parseInt(req.query.maxrecords) || 250, 500);
    const timespan = req.query.timespan || "7d";

    const cacheKey = "gdelt-geo:" + query + ":" + maxrecords + ":" + timespan;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const url = "https://api.gdeltproject.org/api/v2/geo/geo?query=" + encodeURIComponent(query) + "&format=" + format + "&maxrecords=" + maxrecords + "&timespan=" + timespan;
    let data;
    try {
      data = await fetchJSON(url, {}, 25000);
    } catch (geoErr) {
      console.warn("[gdelt-geo] GDELT unreachable:", geoErr.message);
      data = { type: "FeatureCollection", features: [] };
    }
    cacheSet(cacheKey, data, 300000);
    res.json(data);
  } catch (err) {
    console.error("[gdelt-geo]", err.message);
    res.status(502).json({ error: "Failed to fetch GDELT geo data", detail: err.message });
  }
});

// -- q) Hacker News --
app.get("/api/hackernews", async (req, res) => {
  try {
    const type = req.query.type || "top";
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);
    const cacheKey = "hn:" + type + ":" + limit;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const validTypes = { top: "topstories", new: "newstories", best: "beststories", ask: "askstories", show: "showstories", job: "jobstories" };
    const endpoint = validTypes[type] || "topstories";
    const ids = await fetchJSON("https://hacker-news.firebaseio.com/v0/" + endpoint + ".json");
    const topIds = (ids || []).slice(0, limit);

    // Fetch stories in batches of 10
    const stories = [];
    for (let i = 0; i < topIds.length; i += 10) {
      const batch = topIds.slice(i, i + 10);
      const batchResults = await Promise.allSettled(batch.map(id => fetchJSON("https://hacker-news.firebaseio.com/v0/item/" + id + ".json")));
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) {
          const s = r.value;
          stories.push({ id: s.id, title: s.title, url: s.url, score: s.score, by: s.by, time: s.time, descendants: s.descendants || 0, type: s.type });
        }
      }
    }

    const payload = { type, count: stories.length, stories };
    cacheSet(cacheKey, payload, 300000);
    res.json(payload);
  } catch (err) {
    console.error("[hackernews]", err.message);
    res.status(502).json({ error: "Failed to fetch HackerNews", detail: err.message });
  }
});

// -- r) GitHub Trending --
app.get("/api/github-trending", async (req, res) => {
  try {
    const language = req.query.language || "";
    const since = req.query.since || "daily";
    const cacheKey = "gh-trending:" + language + ":" + since;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    let url = "https://api.gitterapp.com/repositories?since=" + since;
    if (language) url += "&language=" + encodeURIComponent(language);

    try {
      const data = await fetchJSON(url, {}, 10000);
      cacheSet(cacheKey, data, 1800000);
      res.json(data);
    } catch {
      // Fallback API
      let fallbackUrl = "https://gh-trending-api.herokuapp.com/repositories?since=" + since;
      if (language) fallbackUrl += "&language=" + encodeURIComponent(language);
      const data = await fetchJSON(fallbackUrl, {}, 10000);
      cacheSet(cacheKey, data, 1800000);
      res.json(data);
    }
  } catch (err) {
    console.error("[github-trending]", err.message);
    res.status(502).json({ error: "Failed to fetch GitHub trending", detail: err.message });
  }
});

// -- s) FAA Status --
app.get("/api/faa-status", async (req, res) => {
  try {
    const cacheKey = "faa-status";
    const cached = cacheGet(cacheKey);
    if (cached) { res.type("application/xml"); return res.send(cached); }
    const data = await fetchText("https://nasstatus.faa.gov/api/airport-status-information", {}, 10000);
    cacheSet(cacheKey, data, 60000);
    res.type("application/xml");
    res.send(data);
  } catch (err) {
    console.error("[faa-status]", err.message);
    res.status(502).json({ error: "Failed to fetch FAA status", detail: err.message });
  }
});

// -- t) NGA Maritime Warnings --
app.get("/api/nga-warnings", async (req, res) => {
  try {
    const cacheKey = "nga-warnings";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const data = await fetchJSON("https://msi.nga.mil/api/publications/broadcast-warn?output=json&status=A", {}, 10000);
    cacheSet(cacheKey, data, 300000);
    res.json(data);
  } catch (err) {
    console.error("[nga-warnings]", err.message);
    res.status(502).json({ error: "Failed to fetch NGA warnings", detail: err.message });
  }
});

// -- u) ArXiv Papers --
app.get("/api/arxiv", async (req, res) => {
  try {
    const cat = req.query.cat || "cs.AI";
    const maxResults = Math.min(parseInt(req.query.max_results) || 50, 100);
    const sortBy = req.query.sort_by || "submittedDate";
    const sortOrder = req.query.sort_order || "descending";
    const cacheKey = "arxiv:" + cat + ":" + maxResults;
    const cached = cacheGet(cacheKey);
    if (cached) { res.type("application/xml"); return res.send(cached); }
    const url = "https://export.arxiv.org/api/query?search_query=cat:" + encodeURIComponent(cat) + "&max_results=" + maxResults + "&sortBy=" + sortBy + "&sortOrder=" + sortOrder;
    const data = await fetchText(url, {}, 15000);
    cacheSet(cacheKey, data, 3600000);
    res.type("application/xml");
    res.send(data);
  } catch (err) {
    console.error("[arxiv]", err.message);
    res.status(502).json({ error: "Failed to fetch ArXiv papers", detail: err.message });
  }
});

// -- v) World Bank --
app.get("/api/worldbank", async (req, res) => {
  try {
    const action = req.query.action;
    if (action === "indicators") {
      return res.json({
        indicators: [
          { id: "IT.NET.USER.ZS", name: "Internet Users (%)" },
          { id: "GB.XPD.RSDV.GD.ZS", name: "R&D Expenditure (% GDP)" },
          { id: "IP.PAT.RESD", name: "Patent Applications" },
          { id: "TX.VAL.TECH.MF.ZS", name: "High-Tech Exports (%)" },
          { id: "NY.GDP.MKTP.KD.ZG", name: "GDP Growth (%)" },
          { id: "FP.CPI.TOTL.ZG", name: "Inflation (%)" },
          { id: "SL.UEM.TOTL.ZS", name: "Unemployment (%)" },
          { id: "SP.POP.TOTL", name: "Population" },
        ]
      });
    }
    const indicator = req.query.indicator || "NY.GDP.MKTP.KD.ZG";
    const country = req.query.country || "US";
    const years = parseInt(req.query.years) || 5;
    const cacheKey = "worldbank:" + indicator + ":" + country + ":" + years;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const url = "https://api.worldbank.org/v2/country/" + country + "/indicator/" + indicator + "?format=json&per_page=50&mrv=" + years;
    const data = await fetchJSON(url, {}, 10000);
    cacheSet(cacheKey, data, 3600000);
    res.json(data);
  } catch (err) {
    console.error("[worldbank]", err.message);
    res.status(502).json({ error: "Failed to fetch World Bank data", detail: err.message });
  }
});

// -- w) OpenSky Network --
app.get("/api/opensky", async (req, res) => {
  try {
    const lamin = req.query.lamin || "";
    const lomin = req.query.lomin || "";
    const lamax = req.query.lamax || "";
    const lomax = req.query.lomax || "";
    const cacheKey = "opensky:" + lamin + ":" + lomin + ":" + lamax + ":" + lomax;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    let url = "https://opensky-network.org/api/states/all";
    if (lamin && lomin && lamax && lomax) url += "?lamin=" + lamin + "&lomin=" + lomin + "&lamax=" + lamax + "&lomax=" + lomax;
    const data = await fetchJSON(url, { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0" }, 20000);
    cacheSet(cacheKey, data, 30000);
    res.json(data);
  } catch (err) {
    console.error("[opensky]", err.message);
    res.status(502).json({ error: "Failed to fetch OpenSky data", detail: err.message });
  }
});

// -- x) Stock Index (per-country) --
const COUNTRY_INDICES = {
  US: "^GSPC", GB: "^FTSE", DE: "^GDAXI", FR: "^FCHI", JP: "^N225", CN: "000001.SS",
  HK: "^HSI", IN: "^BSESN", AU: "^AXJO", CA: "^GSPTSE", BR: "^BVSP", KR: "^KS11",
  RU: "IMOEX.ME", TR: "XU100.IS", SA: "^TASI.SR", MX: "^MXX", AR: "^MERV",
  ZA: "^J203.JO", NG: "^NGSEINDEX", EG: "^EGX30.CA", IL: "^TA125.TA",
  TW: "^TWII", SG: "^STI", TH: "^SET.BK", ID: "^JKSE", MY: "^KLSE",
  PH: "^PSEI", VN: "^VNINDEX", PL: "^WIG20", CZ: "^PX", HU: "^BUX",
  SE: "^OMX", DK: "^OMXC25", NO: "^OBX", FI: "^OMXH25", NL: "^AEX",
  BE: "^BFX", CH: "^SSMI", ES: "^IBEX", IT: "^FTSEMIB", PT: "^PSI20",
  GR: "^ATG", NZ: "^NZ50", CL: "^SPCLXIPSA.SN", CO: "^COLCAP",
  PE: "^SPBLPGPT", KW: "^KWSE", QA: "^QSI", AE: "^DFMGI", PK: "^KSE",
  BD: "^DSEX", LK: "^CSE",
};

app.get("/api/stock-index", async (req, res) => {
  try {
    const code = (req.query.code || "US").toUpperCase();
    const symbol = COUNTRY_INDICES[code];
    if (!symbol) return res.status(400).json({ error: "Unknown country code: " + code });

    const cacheKey = "stock-index:" + code;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const data = await fetchYahooSpark(symbol, "5d", "1d");
    const info = data[symbol] || Object.values(data)[0];
    if (!info || !info.close) return res.json({ code, symbol, weeklyChange: null, error: "No data" });

    const closes = info.close.filter(c => c !== null);
    if (closes.length < 2) return res.json({ code, symbol, weeklyChange: null });

    const last = closes[closes.length - 1];
    const first = info.chartPreviousClose || closes[0];
    const weeklyChange = first !== 0 ? ((last - first) / first) * 100 : 0;

    const payload = { code, symbol, price: Math.round(last * 100) / 100, weeklyChange: Math.round(weeklyChange * 100) / 100 };
    cacheSet(cacheKey, payload, 3600000);
    res.json(payload);
  } catch (err) {
    console.error("[stock-index]", err.message);
    res.status(502).json({ error: "Failed to fetch stock index", detail: err.message });
  }
});

// -- y) Feed (local RSS generation) --
app.get("/api/feed", async (req, res) => {
  try {
    const format = req.query.format || "rss";
    const cacheKey = "feed:" + format;
    const cached = cacheGet(cacheKey);
    if (cached) { res.type("application/xml"); return res.send(cached); }

    const countries = ["US", "CN", "RU", "GB", "FR", "DE", "JP", "IN", "BR", "TR", "IL", "IR", "SA", "UA", "TW"];
    const now = new Date();
    const items = countries.map((c, i) => {
      const pubDate = new Date(now.getTime() - i * 3600000).toUTCString();
      return `<item><title>Intelligence Brief: ${c}</title><link>https://globalscope.live/api/story?c=${c}&amp;t=ciianalysis</link><pubDate>${pubDate}</pubDate><description>Latest intelligence analysis for ${c}</description></item>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>GlobalScope Intelligence Feed</title>
<link>https://globalscope.live</link>
<description>Global intelligence and analysis</description>
<lastBuildDate>${now.toUTCString()}</lastBuildDate>
${items}
</channel></rss>`;

    cacheSet(cacheKey, xml, 3600000);
    res.type("application/xml");
    res.send(xml);
  } catch (err) {
    console.error("[feed]", err.message);
    res.status(502).json({ error: "Failed to generate feed", detail: err.message });
  }
});

// -- z) FIRMS Fires (NASA) --
app.get("/api/firms-fires", async (req, res) => {
  try {
    if (!NASA_FIRMS_KEY) {
      return res.json({ configured: false, message: "NASA FIRMS API key not configured", fires: [] });
    }
    const region = req.query.region || "world";
    const days = req.query.days || "1";
    const cacheKey = "firms:" + region + ":" + days;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/" + NASA_FIRMS_KEY + "/VIIRS_SNPP_NRT/" + region + "/" + days;
    const csv = await fetchText(url, {}, 20000);
    // Parse CSV to JSON
    const lines = csv.trim().split("\n");
    const headers = lines[0]?.split(",") || [];
    const fires = lines.slice(1).map(line => {
      const values = line.split(",");
      const obj = {};
      headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
      return obj;
    }).filter(f => f.latitude && f.longitude);

    const payload = { configured: true, count: fires.length, fires };
    cacheSet(cacheKey, payload, 600000);
    res.json(payload);
  } catch (err) {
    console.error("[firms-fires]", err.message);
    res.status(502).json({ error: "Failed to fetch FIRMS data", detail: err.message });
  }
});

// -- aa) Cloudflare Outages --
app.get("/api/cloudflare-outages", async (req, res) => {
  try {
    if (!CLOUDFLARE_API_TOKEN) {
      return res.json({ configured: false, annotations: [] });
    }
    const cacheKey = "cf-outages";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const data = await fetchJSON("https://api.cloudflare.com/client/v4/radar/annotations/outages?dateRange=7d&limit=50", { Authorization: "Bearer " + CLOUDFLARE_API_TOKEN });
    cacheSet(cacheKey, data, 120000);
    res.json(data);
  } catch (err) {
    console.error("[cloudflare-outages]", err.message);
    res.json({ configured: !!CLOUDFLARE_API_TOKEN, annotations: [], error: err.message });
  }
});

// -- ab) FRED Data --
app.get("/api/fred-data", async (req, res) => {
  try {
    if (!FRED_API_KEY) return res.json({ configured: false, observations: [] });
    const seriesId = req.query.series_id || "GDP";
    const start = req.query.observation_start || "";
    const end = req.query.observation_end || "";
    const cacheKey = "fred:" + seriesId + ":" + start + ":" + end;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    let url = "https://api.stlouisfed.org/fred/series/observations?series_id=" + seriesId + "&api_key=" + FRED_API_KEY + "&file_type=json";
    if (start) url += "&observation_start=" + start;
    if (end) url += "&observation_end=" + end;
    const data = await fetchJSON(url);
    cacheSet(cacheKey, data, 3600000);
    res.json(data);
  } catch (err) {
    console.error("[fred-data]", err.message);
    res.json({ configured: !!FRED_API_KEY, observations: [], error: err.message });
  }
});

// -- ac) ACLED (conflict data) --
app.get("/api/acled", async (req, res) => {
  try {
    if (!ACLED_ACCESS_TOKEN) return res.json({ configured: false, data: [] });
    const cacheKey = "acled";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const url = "https://acleddata.com/api/acled/read?event_type=Protests&limit=500&event_date=" + thirtyDaysAgo + "|" + new Date().toISOString().slice(0, 10) + "&event_date_where=BETWEEN";
    const data = await fetchJSON(url, { Authorization: "Bearer " + ACLED_ACCESS_TOKEN });
    cacheSet(cacheKey, data, 600000);
    res.json(data);
  } catch (err) {
    console.error("[acled]", err.message);
    res.json({ configured: !!ACLED_ACCESS_TOKEN, data: [], error: err.message });
  }
});

// -- ad) Risk Scores / CII (Country Instability Index) --
const CII_BASELINES = {
  US: { unrest: 0.25, security: 0.20, information: 0.30 },
  CN: { unrest: 0.35, security: 0.40, information: 0.60 },
  RU: { unrest: 0.50, security: 0.65, information: 0.70 },
  GB: { unrest: 0.20, security: 0.15, information: 0.20 },
  FR: { unrest: 0.35, security: 0.25, information: 0.25 },
  DE: { unrest: 0.20, security: 0.15, information: 0.20 },
  JP: { unrest: 0.10, security: 0.20, information: 0.15 },
  IN: { unrest: 0.40, security: 0.35, information: 0.35 },
  BR: { unrest: 0.45, security: 0.40, information: 0.30 },
  TR: { unrest: 0.50, security: 0.45, information: 0.50 },
  IL: { unrest: 0.55, security: 0.75, information: 0.40 },
  IR: { unrest: 0.60, security: 0.70, information: 0.75 },
  SA: { unrest: 0.30, security: 0.45, information: 0.65 },
  UA: { unrest: 0.70, security: 0.85, information: 0.55 },
  TW: { unrest: 0.15, security: 0.50, information: 0.30 },
  KR: { unrest: 0.20, security: 0.35, information: 0.25 },
  PK: { unrest: 0.55, security: 0.60, information: 0.50 },
  NG: { unrest: 0.60, security: 0.65, information: 0.45 },
  EG: { unrest: 0.45, security: 0.50, information: 0.60 },
  MX: { unrest: 0.50, security: 0.55, information: 0.35 },
};

app.get("/api/risk-scores", async (req, res) => {
  try {
    const cacheKey = "risk-scores";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const countries = {};
    for (const [code, baseline] of Object.entries(CII_BASELINES)) {
      const composite = (baseline.unrest + baseline.security + baseline.information) / 3;
      countries[code] = {
        code,
        cii: Math.round(composite * 100) / 100,
        components: {
          unrest: Math.round(baseline.unrest * 100) / 100,
          security: Math.round(baseline.security * 100) / 100,
          information: Math.round(baseline.information * 100) / 100
        },
        trend: "stable",
        source: ACLED_ACCESS_TOKEN ? "acled+baseline" : "baseline-only"
      };
    }

    // Strategic Risk = average of top 5 CII scores
    const sorted = Object.values(countries).sort((a, b) => b.cii - a.cii);
    const top5Avg = sorted.slice(0, 5).reduce((sum, c) => sum + c.cii, 0) / 5;

    const payload = {
      generated: new Date().toISOString(),
      countries,
      strategicRisk: {
        composite: Math.round(top5Avg * 100) / 100,
        level: top5Avg > 0.7 ? "critical" : top5Avg > 0.5 ? "elevated" : "normal",
        topContributors: sorted.slice(0, 5).map(c => c.code)
      }
    };

    cacheSet(cacheKey, payload, 600000);
    res.json(payload);
  } catch (err) {
    console.error("[risk-scores]", err.message);
    res.status(502).json({ error: "Failed to compute risk scores", detail: err.message });
  }
});

// -- ae) Country Intel (AI briefs via OpenRouter) --
app.post("/api/country-intel", async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) return res.json({ configured: false, brief: "AI briefing not available (no API key configured)" });

    const { country, code, context } = req.body || {};
    if (!country || !code) return res.status(400).json({ error: "Missing country or code" });

    const cacheKey = "country-intel:" + code + ":" + (context ? String(context).slice(0, 50) : "default");
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const systemPrompt = "You are a senior intelligence analyst providing concise, factual country intelligence briefs. Focus on current geopolitical situation, key risks, and notable developments. Keep the brief under 200 words. Be objective and data-driven.";
    const userPrompt = "Provide a current intelligence brief for " + country + " (" + code + ")." + (context ? " Context: " + JSON.stringify(context).slice(0, 2000) : "");

    const result = await postJSON("https://openrouter.ai/api/v1/chat/completions", {
      model: "deepseek/deepseek-chat-v3-0324",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_tokens: 500,
      temperature: 0.3
    }, { Authorization: "Bearer " + OPENROUTER_API_KEY });

    const brief = result.choices?.[0]?.message?.content || "Brief unavailable";
    const payload = { code, country, brief, generated: new Date().toISOString(), model: "deepseek-v3" };
    cacheSet(cacheKey, payload, 7200000); // 2h cache
    res.json(payload);
  } catch (err) {
    console.error("[country-intel]", err.message);
    res.json({ brief: "Intelligence brief temporarily unavailable", error: err.message });
  }
});

// -- af) OpenRouter Summarize --
app.post("/api/openrouter-summarize", async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) return res.json({ fallback: true, summary: "AI summarization not available" });

    const { headlines, mode, variant, lang } = req.body || {};
    if (!headlines || !Array.isArray(headlines) || headlines.length === 0) {
      return res.status(400).json({ error: "Missing headlines array" });
    }

    const cacheKey = "summarize:" + (mode || "default") + ":" + headlines.slice(0, 3).join("|").slice(0, 100);
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const isFullVariant = variant === "full" || !variant;
    const systemPrompt = isFullVariant
      ? "You are a senior geopolitical analyst. Synthesize the following headlines into a concise intelligence brief. Focus on patterns, implications, and strategic significance. Be objective and precise."
      : "You are a tech industry analyst. Synthesize the following headlines into a concise tech brief. Focus on trends, implications, and market impact.";

    let userPrompt;
    if (mode === "brief") userPrompt = "Summarize these headlines in 2-3 sentences:\n" + headlines.join("\n");
    else if (mode === "analysis") userPrompt = "Provide a detailed analysis of these headlines:\n" + headlines.join("\n");
    else userPrompt = "Synthesize these headlines into a coherent narrative:\n" + headlines.join("\n");

    if (lang && lang !== "en") userPrompt += "\n\nRespond in language code: " + lang;

    const result = await postJSON("https://openrouter.ai/api/v1/chat/completions", {
      model: "deepseek/deepseek-chat-v3-0324",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_tokens: 800,
      temperature: 0.4
    }, { Authorization: "Bearer " + OPENROUTER_API_KEY });

    const summary = result.choices?.[0]?.message?.content || "Summary unavailable";
    const payload = { summary, mode: mode || "default", generated: new Date().toISOString() };
    cacheSet(cacheKey, payload, 86400000); // 24h
    res.json(payload);
  } catch (err) {
    console.error("[openrouter-summarize]", err.message);
    res.json({ fallback: true, summary: "Summarization temporarily unavailable", error: err.message });
  }
});

// -- ag) Groq Summarize (routes to OpenRouter) --
app.post("/api/groq-summarize", async (req, res) => {
  try {
    // Route to OpenRouter since GROQ_API_KEY is not configured
    if (GROQ_API_KEY) {
      // If Groq key is available, use it
      const { headlines, mode, variant, lang } = req.body || {};
      if (!headlines || !Array.isArray(headlines)) return res.status(400).json({ error: "Missing headlines" });

      const cacheKey = "groq-sum:" + (mode || "default") + ":" + headlines.slice(0, 3).join("|").slice(0, 100);
      const cached = cacheGet(cacheKey);
      if (cached) return res.json(cached);

      const result = await postJSON("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a concise news analyst. Synthesize headlines into brief intelligence summaries." },
          { role: "user", content: "Synthesize these headlines:\n" + headlines.join("\n") + (lang && lang !== "en" ? "\n\nRespond in: " + lang : "") }
        ],
        max_tokens: 500, temperature: 0.3
      }, { Authorization: "Bearer " + GROQ_API_KEY });

      const summary = result.choices?.[0]?.message?.content || "Summary unavailable";
      const payload = { summary, mode: mode || "default", generated: new Date().toISOString() };
      cacheSet(cacheKey, payload, 86400000);
      return res.json(payload);
    }

    // Fallback to OpenRouter
    req.url = "/api/openrouter-summarize";
    app.handle(req, res);
  } catch (err) {
    console.error("[groq-summarize]", err.message);
    // Fallback to OpenRouter
    req.url = "/api/openrouter-summarize";
    app.handle(req, res);
  }
});

// -- ah) Theater Posture (simplified - OpenSky only) --
const THEATERS = [
  { id: "iran", name: "Iran", bbox: [44, 25, 63, 40] },
  { id: "taiwan", name: "Taiwan Strait", bbox: [116, 21, 126, 28] },
  { id: "baltic", name: "Baltic", bbox: [14, 53, 30, 62] },
  { id: "black-sea", name: "Black Sea", bbox: [28, 40, 42, 48] },
  { id: "korean-peninsula", name: "Korean Peninsula", bbox: [124, 33, 132, 43] },
  { id: "south-china-sea", name: "South China Sea", bbox: [105, 5, 121, 22] },
  { id: "eastern-med", name: "Eastern Mediterranean", bbox: [24, 30, 37, 38] },
  { id: "israel-gaza", name: "Israel/Gaza", bbox: [33.5, 29.5, 36.5, 33.5] },
  { id: "yemen-redsea", name: "Yemen/Red Sea", bbox: [37, 11, 50, 18] },
];

app.get("/api/theater-posture", async (req, res) => {
  try {
    const cacheKey = "theater-posture";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Return baseline posture data (simplified without real-time OpenSky)
    const theaters = THEATERS.map(t => ({
      id: t.id,
      name: t.name,
      posture: "normal",
      flightCount: 0,
      militaryCount: 0,
      hasStrikeCapability: false,
      aircraftTypes: {},
      bbox: t.bbox,
    }));

    // Known elevated theaters based on geopolitical context
    const elevatedTheaters = ["israel-gaza", "black-sea", "yemen-redsea", "iran"];
    for (const theater of theaters) {
      if (elevatedTheaters.includes(theater.id)) {
        theater.posture = "elevated";
      }
    }

    const payload = {
      generated: new Date().toISOString(),
      theaters,
      source: "baseline",
      note: "Real-time flight data requires OpenSky integration"
    };

    cacheSet(cacheKey, payload, 300000);
    res.json(payload);
  } catch (err) {
    console.error("[theater-posture]", err.message);
    res.status(502).json({ error: "Failed to compute theater posture", detail: err.message });
  }
});

// -- ai) Temporal Baseline --
const baselines = new Map();

app.get("/api/temporal-baseline", async (req, res) => {
  try {
    const type = req.query.type || "military_flights";
    const region = req.query.region || "global";
    const value = parseFloat(req.query.value);

    const key = type + ":" + region;
    let baseline = baselines.get(key);
    if (!baseline) {
      baseline = { count: 0, mean: 0, m2: 0 };
      baselines.set(key, baseline);
    }

    if (!isNaN(value)) {
      // Update baseline using Welford's algorithm
      baseline.count++;
      const delta = value - baseline.mean;
      baseline.mean += delta / baseline.count;
      baseline.m2 += delta * (value - baseline.mean);
    }

    const variance = baseline.count > 1 ? baseline.m2 / (baseline.count - 1) : 0;
    const stddev = Math.sqrt(variance);
    const currentValue = !isNaN(value) ? value : baseline.mean;
    const zScore = stddev > 0 && baseline.count >= 10 ? (currentValue - baseline.mean) / stddev : 0;

    let anomalyLevel = "none";
    if (Math.abs(zScore) >= 3.0) anomalyLevel = "critical";
    else if (Math.abs(zScore) >= 2.0) anomalyLevel = "high";
    else if (Math.abs(zScore) >= 1.5) anomalyLevel = "medium";

    res.json({
      type, region, mean: Math.round(baseline.mean * 100) / 100,
      stddev: Math.round(stddev * 100) / 100, count: baseline.count,
      currentValue, zScore: Math.round(zScore * 100) / 100, anomalyLevel
    });
  } catch (err) {
    console.error("[temporal-baseline]", err.message);
    res.status(502).json({ error: "Failed to compute baseline", detail: err.message });
  }
});

app.post("/api/temporal-baseline", async (req, res) => {
  try {
    const { type, region, value } = req.body || {};
    if (!type || value === undefined) return res.status(400).json({ error: "Missing type or value" });
    // Redirect to GET handler with query params
    req.query = { type, region: region || "global", value: String(value) };
    const key = type + ":" + (region || "global");
    let baseline = baselines.get(key);
    if (!baseline) { baseline = { count: 0, mean: 0, m2: 0 }; baselines.set(key, baseline); }
    baseline.count++;
    const delta = value - baseline.mean;
    baseline.mean += delta / baseline.count;
    baseline.m2 += delta * (value - baseline.mean);
    res.json({ ok: true, count: baseline.count, mean: Math.round(baseline.mean * 100) / 100 });
  } catch (err) {
    console.error("[temporal-baseline]", err.message);
    res.status(502).json({ error: "Failed to update baseline", detail: err.message });
  }
});

// -- aj) Cyber Threats (simplified - no auth keys) --
app.get("/api/cyber-threats", async (req, res) => {
  try {
    const cacheKey = "cyber-threats";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const threats = [];

    // Feodo Tracker (no key needed)
    try {
      const feodo = await fetchJSON("https://feodotracker.abuse.ch/downloads/ipblocklist.json", {}, 10000);
      if (Array.isArray(feodo)) {
        for (const entry of feodo.slice(0, Math.floor(limit / 2))) {
          threats.push({
            ip: entry.ip_address, port: entry.port, type: "botnet-c2",
            source: "Feodo Tracker", malware: entry.malware,
            firstSeen: entry.first_seen_utc, lastOnline: entry.last_online,
            country: entry.country, asName: entry.as_name,
          });
        }
      }
    } catch (e) { console.warn("[cyber-threats] Feodo failed:", e.message); }

    // C2IntelFeeds (no key needed)
    try {
      const c2csv = await fetchText("https://raw.githubusercontent.com/drb-ra/C2IntelFeeds/master/feeds/IPC2s-30day.csv", {}, 10000);
      const lines = c2csv.trim().split("\n").slice(1); // skip header
      for (const line of lines.slice(0, Math.floor(limit / 4))) {
        const parts = line.split(",");
        if (parts[0]) {
          threats.push({ ip: parts[0].trim(), type: "c2-server", source: "C2IntelFeeds", firstSeen: parts[1]?.trim(), framework: parts[2]?.trim() });
        }
      }
    } catch (e) { console.warn("[cyber-threats] C2Intel failed:", e.message); }

    const payload = { generated: new Date().toISOString(), count: threats.length, threats, sources: ["Feodo Tracker", "C2IntelFeeds"] };
    cacheSet(cacheKey, payload, 300000);
    res.json(payload);
  } catch (err) {
    console.error("[cyber-threats]", err.message);
    res.json({ count: 0, threats: [], error: err.message });
  }
});

// -- ak) Finnhub --
app.get("/api/finnhub", async (req, res) => {
  try {
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (!finnhubKey) return res.json({ configured: false, quotes: {} });
    const symbols = (req.query.symbols || "AAPL").split(",").slice(0, 20);
    const cacheKey = "finnhub:" + symbols.join(",");
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    const quotes = {};
    await Promise.allSettled(symbols.map(async sym => {
      const data = await fetchJSON("https://finnhub.io/api/v1/quote?symbol=" + sym.trim() + "&token=" + finnhubKey);
      quotes[sym.trim()] = data;
    }));
    cacheSet(cacheKey, quotes, 30000);
    res.json(quotes);
  } catch (err) {
    console.error("[finnhub]", err.message);
    res.json({ configured: !!process.env.FINNHUB_API_KEY, quotes: {}, error: err.message });
  }
});

// -- al) ACLED Protests (alias) --
app.get("/api/acled-protests", async (req, res) => {
  req.url = "/api/acled" + (req.url.includes("?") ? "&" : "?") + "type=Protests";
  app.handle(req, res);
});

// -- am) GDELT Events (alias for ucdp-events) --
app.get("/api/gdelt-events", async (req, res) => {
  req.url = "/api/ucdp-events";
  app.handle(req, res);
});

// -- an) GDELT Tensions (alias for gdelt-geo) --
app.get("/api/gdelt-tensions", async (req, res) => {
  req.query.query = req.query.query || "tension OR escalation OR conflict";
  req.url = "/api/gdelt-geo?" + new URLSearchParams(req.query).toString();
  app.handle(req, res);
});


// ================================================================
//  NOAA WEATHER ENDPOINTS
// ================================================================

// -- ao) NOAA Weather Forecast (by lat/lon) --
app.get("/api/weather-forecast", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });
    const cacheKey = `weather-forecast-${lat}-${lon}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Step 1: Get grid point from NWS (free, no key needed)
    const pointUrl = `https://api.weather.gov/points/${lat},${lon}`;
    const pointResp = await fetch(pointUrl, {
      headers: { "User-Agent": "GlobalScope/1.0 (tamer@globalscope.live)" }
    });

    if (pointResp.ok) {
      const pointData = await pointResp.json();
      const forecastUrl = pointData.properties?.forecast;
      if (forecastUrl) {
        const fcResp = await fetch(forecastUrl, {
          headers: { "User-Agent": "GlobalScope/1.0 (tamer@globalscope.live)" }
        });
        if (fcResp.ok) {
          const fcData = await fcResp.json();
          const result = {
            source: "NWS",
            location: pointData.properties?.relativeLocation?.properties || {},
            periods: (fcData.properties?.periods || []).slice(0, 14),
            updated: fcData.properties?.updated
          };
          cacheSet(cacheKey, result, 30 * 60 * 1000); // 30 min cache
          return res.json(result);
        }
      }
    }

    // Fallback: Use Open-Meteo for non-US locations (also free, no key)
    const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max&current_weather=true&timezone=auto&forecast_days=7`;
    const omResp = await fetch(omUrl);
    if (!omResp.ok) return res.status(502).json({ error: "Weather API failed" });
    const omData = await omResp.json();
    const result = { source: "Open-Meteo", ...omData };
    cacheSet(cacheKey, result, 30 * 60 * 1000);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- ap) NOAA Climate Data (historical) --
app.get("/api/noaa-climate", async (req, res) => {
  try {
    if (!NOAA_TOKEN) return res.status(503).json({ error: "NOAA_TOKEN not configured" });
    const { dataset, station, start, end, datatype, limit } = req.query;
    const ds = dataset || "GHCND"; // Global Historical Climatology Network Daily
    const cacheKey = `noaa-climate-${ds}-${station || "all"}-${start}-${end}-${datatype}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    let url = `https://www.ncdc.noaa.gov/cdo-web/api/v2/data?datasetid=${ds}&limit=${limit || 100}`;
    if (station) url += `&stationid=${station}`;
    if (start) url += `&startdate=${start}`;
    if (end) url += `&enddate=${end}`;
    if (datatype) url += `&datatypeid=${datatype}`;

    const resp = await fetch(url, {
      headers: { token: NOAA_TOKEN }
    });
    if (!resp.ok) return res.status(resp.status).json({ error: `NOAA API ${resp.status}` });
    const data = await resp.json();
    cacheSet(cacheKey, data, 60 * 60 * 1000); // 1 hour cache
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- aq) NOAA Weather Alerts (active) --
app.get("/api/weather-alerts", async (req, res) => {
  try {
    const { area, severity, status } = req.query;
    const cacheKey = `weather-alerts-${area || "all"}-${severity || "all"}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    let url = "https://api.weather.gov/alerts/active?status=" + (status || "actual");
    if (area) url += `&area=${area}`;
    if (severity) url += `&severity=${severity}`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "GlobalScope/1.0 (tamer@globalscope.live)" }
    });
    if (!resp.ok) return res.status(resp.status).json({ error: `NWS API ${resp.status}` });
    const data = await resp.json();
    const alerts = (data.features || []).map(f => ({
      id: f.properties?.id,
      event: f.properties?.event,
      severity: f.properties?.severity,
      headline: f.properties?.headline,
      description: f.properties?.description?.substring(0, 500),
      areas: f.properties?.areaDesc,
      onset: f.properties?.onset,
      expires: f.properties?.expires
    }));
    const result = { count: alerts.length, alerts: alerts.slice(0, 50) };
    cacheSet(cacheKey, result, 10 * 60 * 1000); // 10 min cache
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- ar) NOAA Stations --
app.get("/api/noaa-stations", async (req, res) => {
  try {
    if (!NOAA_TOKEN) return res.status(503).json({ error: "NOAA_TOKEN not configured" });
    const { extent, dataset, limit } = req.query;
    const cacheKey = `noaa-stations-${extent || "all"}-${dataset || "GHCND"}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    let url = `https://www.ncdc.noaa.gov/cdo-web/api/v2/stations?datasetid=${dataset || "GHCND"}&limit=${limit || 100}`;
    if (extent) url += `&extent=${extent}`; // lat1,lon1,lat2,lon2

    const resp = await fetch(url, {
      headers: { token: NOAA_TOKEN }
    });
    if (!resp.ok) return res.status(resp.status).json({ error: `NOAA API ${resp.status}` });
    const data = await resp.json();
    cacheSet(cacheKey, data, 24 * 60 * 60 * 1000); // 24h cache
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- as) Global Weather (Open-Meteo - free, no key, worldwide) --
app.get("/api/global-weather", async (req, res) => {
  try {
    const { cities } = req.query;
    // Default major cities
    const defaultCities = [
      { name: "Istanbul", lat: 41.01, lon: 28.98 },
      { name: "London", lat: 51.51, lon: -0.13 },
      { name: "New York", lat: 40.71, lon: -74.01 },
      { name: "Tokyo", lat: 35.68, lon: 139.69 },
      { name: "Dubai", lat: 25.20, lon: 55.27 },
      { name: "Sydney", lat: -33.87, lon: 151.21 },
      { name: "Moscow", lat: 55.76, lon: 37.62 },
      { name: "Beijing", lat: 39.90, lon: 116.40 },
      { name: "Sao Paulo", lat: -23.55, lon: -46.63 },
      { name: "Lagos", lat: 6.52, lon: 3.38 }
    ];

    const cacheKey = "global-weather-main";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const lats = defaultCities.map(c => c.lat).join(",");
    const lons = defaultCities.map(c => c.lon).join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=3`;

    const resp = await fetch(url);
    if (!resp.ok) return res.status(502).json({ error: "Open-Meteo API failed" });
    const data = await resp.json();

    // Map results to cities
    const results = Array.isArray(data) ? data.map((d, i) => ({
      city: defaultCities[i].name,
      lat: defaultCities[i].lat,
      lon: defaultCities[i].lon,
      current: d.current_weather,
      daily: d.daily
    })) : [{ city: defaultCities[0].name, current: data.current_weather, daily: data.daily }];

    const result = { cities: results, updated: new Date().toISOString() };
    cacheSet(cacheKey, result, 30 * 60 * 1000); // 30 min cache
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================================================================
//  CATCH-ALL 404
// ================================================================
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "Not found", path: req.path, hint: "Check /api/ endpoints list" });
});

// -- Start server --
app.listen(PORT, HOST, () => {
  console.log("GlobalPulse proxy server v2 running at http://" + HOST + ":" + PORT);
  console.log("Endpoints: 40+ API routes");
  console.log("API Keys: OPENROUTER=" + (OPENROUTER_API_KEY ? "YES" : "NO") + " GROQ=" + (GROQ_API_KEY ? "YES" : "NO") + " NASA=" + (NASA_FIRMS_KEY ? "YES" : "NO") + " FRED=" + (FRED_API_KEY ? "YES" : "NO") + " CF=" + (CLOUDFLARE_API_TOKEN ? "YES" : "NO") + " NOAA=" + (NOAA_TOKEN ? "YES" : "NO") + " ACLED=" + (ACLED_ACCESS_TOKEN ? "YES" : "NO"));
});
