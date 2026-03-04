import express from "express";
import https from "https";
import http from "http";

const app = express();
const PORT = 4300;
const HOST = "127.0.0.1";

// -- In-memory cache --
const cacheStore = new Map();

function cacheGet(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data, ttlMs) {
  cacheStore.set(key, { data, expires: Date.now() + ttlMs });
}

// -- Fetch helpers --
function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { headers: { "User-Agent": "GlobalPulse/1.0", ...headers } }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error("JSON parse error: " + e.message + " body: " + body.slice(0, 200)));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Request timeout")); });
  });
}

function fetchText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { headers: { "User-Agent": "GlobalPulse/1.0", ...headers } }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Request timeout")); });
  });
}

// -- Yahoo Finance v8 spark helper with batching --
const YAHOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const BATCH_SIZE = 18;

async function fetchYahooSpark(symbols, range, interval) {
  range = range || "5d";
  interval = interval || "1d";
  const symbolList = symbols.split(",").map(function(s) { return s.trim(); }).filter(Boolean);

  if (symbolList.length <= BATCH_SIZE) {
    const url = "https://query1.finance.yahoo.com/v8/finance/spark?symbols=" + encodeURIComponent(symbols) + "&range=" + range + "&interval=" + interval;
    return await fetchJSON(url, { "User-Agent": YAHOO_UA });
  }

  // Batch requests
  const batches = [];
  for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
    batches.push(symbolList.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(function(batch) {
      const batchStr = batch.join(",");
      const url = "https://query1.finance.yahoo.com/v8/finance/spark?symbols=" + encodeURIComponent(batchStr) + "&range=" + range + "&interval=" + interval;
      return fetchJSON(url, { "User-Agent": YAHOO_UA });
    })
  );

  // Merge results - v8 format has symbols as top-level keys
  const merged = {};
  for (const result of results) {
    if (result.spark && result.spark.result) {
      // Old format
      for (const item of result.spark.result) {
        if (item.symbol) {
          const meta = (item.response && item.response[0] && item.response[0].meta) || {};
          const closes = (item.response && item.response[0] && item.response[0].indicators && item.response[0].indicators.quote && item.response[0].indicators.quote[0] && item.response[0].indicators.quote[0].close) || [];
          const timestamps = (item.response && item.response[0] && item.response[0].timestamp) || [];
          merged[item.symbol] = {
            timestamp: timestamps,
            symbol: item.symbol,
            close: closes,
            chartPreviousClose: meta.chartPreviousClose || meta.previousClose,
            dataGranularity: meta.dataGranularity || 300
          };
        }
      }
    } else {
      // New v8 format - keys are symbols directly
      for (const [key, value] of Object.entries(result)) {
        if (key !== "spark" && value && typeof value === "object") {
          merged[key] = value;
        }
      }
    }
  }

  return merged;
}

// -- CORS middleware --
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// -- a) Sports Scores --
const SPORT_MAP = {
  soccer: "soccer",
  football: "football",
  basketball: "basketball",
  baseball: "baseball",
  hockey: "hockey",
  tennis: "tennis",
  "f1": "racing/f1",
  cricket: "cricket",
  rugby: "rugby",
  mma: "mma",
};

app.get("/api/sports-scores", async function(req, res) {
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
      // Transform standings to frontend format
      const entries = [];
      var leagueName = "";
      var children = (data.children || []);
      if (children.length === 0 && data.standings) {
        children = [data.standings];
      }
      for (var g = 0; g < children.length; g++) {
        var group = children[g];
        leagueName = leagueName || (group.name || "");
        var groupEntries = (group.standings && group.standings.entries) || group.entries || [];
        for (var e = 0; e < groupEntries.length; e++) {
          var entry = groupEntries[e];
          var team = entry.team || {};
          var statsObj = {};
          var statsArr = entry.stats || [];
          for (var s = 0; s < statsArr.length; s++) {
            statsObj[statsArr[s].abbreviation || statsArr[s].name] = String(statsArr[s].displayValue || statsArr[s].value || "0");
          }
          entries.push({
            team: team.displayName || team.name || "Unknown",
            abbr: team.abbreviation || "",
            logo: (team.logos && team.logos[0] && team.logos[0].href) || "",
            group: group.name || "",
            stats: statsObj
          });
        }
      }
      var standingsPayload = { entries: entries, leagueName: leagueName };
      cacheSet(cacheKey, standingsPayload, 30000);
      return res.json(standingsPayload);
    }

    if (view === "news") {
      var newsUrl = "https://site.api.espn.com/apis/site/v2/sports/" + mappedSport + "/" + league + "/news";
      var newsData = await fetchJSON(newsUrl);
      cacheSet(cacheKey, newsData, 30000);
      return res.json(newsData);
    }

    // Scoreboard - transform ESPN events to MatchData format
    var scoreUrl = "https://site.api.espn.com/apis/site/v2/sports/" + mappedSport + "/" + league + "/scoreboard";
    var scoreData = await fetchJSON(scoreUrl);
    var events = scoreData.events || [];
    var leagueInfo = (scoreData.leagues && scoreData.leagues[0]) || {};
    var matches = [];

    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var comp = (ev.competitions && ev.competitions[0]) || {};
      var competitors = comp.competitors || [];
      var homeTeam = null;
      var awayTeam = null;

      for (var c = 0; c < competitors.length; c++) {
        var t = competitors[c];
        var teamInfo = {
          name: (t.team && t.team.displayName) || (t.team && t.team.name) || "TBD",
          abbr: (t.team && t.team.abbreviation) || "",
          logo: (t.team && t.team.logo) || (t.team && t.team.logos && t.team.logos[0] && t.team.logos[0].href) || "",
          score: t.score || "0",
          winner: t.winner || false
        };
        if (t.homeAway === "home") homeTeam = teamInfo;
        else awayTeam = teamInfo;
      }

      // If no home/away distinction (tennis, etc.), use order
      if (!homeTeam && competitors.length >= 1) {
        var t1 = competitors[0];
        homeTeam = {
          name: (t1.team && t1.team.displayName) || (t1.athlete && t1.athlete.displayName) || "Player 1",
          abbr: (t1.team && t1.team.abbreviation) || "",
          logo: (t1.team && t1.team.logo) || "",
          score: t1.score || "0",
          winner: t1.winner || false
        };
      }
      if (!awayTeam && competitors.length >= 2) {
        var t2 = competitors[1];
        awayTeam = {
          name: (t2.team && t2.team.displayName) || (t2.athlete && t2.athlete.displayName) || "Player 2",
          abbr: (t2.team && t2.team.abbreviation) || "",
          logo: (t2.team && t2.team.logo) || "",
          score: t2.score || "0",
          winner: t2.winner || false
        };
      }

      var statusType = (ev.status && ev.status.type) || {};
      var broadcasts = (comp.broadcasts || []);
      var broadcastStr = "";
      if (broadcasts.length > 0 && broadcasts[0].names) {
        broadcastStr = broadcasts[0].names.join(", ");
      }

      matches.push({
        id: ev.id || "",
        name: ev.name || "",
        shortName: ev.shortName || "",
        date: ev.date || "",
        league: leagueInfo.name || league,
        leagueAbbr: leagueInfo.abbreviation || league,
        status: {
          state: statusType.state || "pre",
          detail: statusType.detail || "",
          shortDetail: statusType.shortDetail || "",
          completed: statusType.completed || false,
          period: (ev.status && ev.status.period) || 0,
          clock: (ev.status && ev.status.displayClock) || ""
        },
        home: homeTeam || { name: "TBD", abbr: "", logo: "", score: "0", winner: false },
        away: awayTeam || { name: "TBD", abbr: "", logo: "", score: "0", winner: false },
        venue: (comp.venue && comp.venue.fullName) || "",
        broadcast: broadcastStr
      });
    }

    var scorePayload = { matches: matches, league: leagueInfo };
    cacheSet(cacheKey, scorePayload, 30000);
    res.json(scorePayload);
  } catch (err) {
    console.error("[sports-scores]", err.message);
    res.status(502).json({ error: "Failed to fetch sports scores", detail: err.message });
  }
});

// -- b) Conflict Events (GDELT + UCDP fallback) --
app.get("/api/ucdp-events", async function(req, res) {
  try {
    const cacheKey = "ucdp-conflict-events";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Use GDELT Events API for conflict events (UCDP now needs auth)
    const url = "https://api.gdeltproject.org/api/v2/doc/doc?query=(conflict%20OR%20attack%20OR%20violence%20OR%20war%20OR%20military)&mode=artlist&maxrecords=50&format=json&timespan=48h&sort=datedesc";

    try {
      const data = await fetchJSON(url);
      const payload = {
        source: "gdelt",
        generated: new Date().toISOString(),
        count: (data.articles && data.articles.length) || 0,
        events: (data.articles || []).map(function(a) {
          return {
            title: a.title,
            url: a.url,
            source: a.domain || (a.source && a.source.domain),
            date: a.seendate,
            language: a.language,
            sourcecountry: a.sourcecountry
          };
        })
      };
      cacheSet(cacheKey, payload, 600000);
      return res.json(payload);
    } catch (gdeltErr) {
      // Fallback: try UCDP without auth
      try {
        const ucdpUrl = "https://ucdpapi.pcr.uu.se/api/gedevents/24.0.10?pagesize=50&page=0";
        const ucdpData = await fetchJSON(ucdpUrl);
        cacheSet(cacheKey, ucdpData, 600000);
        return res.json(ucdpData);
      } catch (e) {
        throw gdeltErr;
      }
    }
  } catch (err) {
    console.error("[ucdp-events]", err.message);
    res.status(502).json({ error: "Failed to fetch conflict events", detail: err.message });
  }
});

// -- c) UNHCR Population --
app.get("/api/unhcr-population", async function(req, res) {
  try {
    const cacheKey = "unhcr-population";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const lastYear = new Date().getFullYear() - 1;
    const url = "https://api.unhcr.org/population/v1/population/?limit=20&year=" + lastYear + "&page=1";
    const data = await fetchJSON(url);
    cacheSet(cacheKey, data, 3600000);
    res.json(data);
  } catch (err) {
    console.error("[unhcr-population]", err.message);
    res.status(502).json({ error: "Failed to fetch UNHCR population", detail: err.message });
  }
});

// -- d) Climate Anomalies --
app.get("/api/climate-anomalies", async function(req, res) {
  try {
    const cacheKey = "climate-anomalies";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const now = new Date();
    const endDate = now.toISOString().slice(0, 10);
    const startDate = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);

    const cities = [
      { name: "New York", lat: 40.71, lon: -74.01 },
      { name: "London", lat: 51.51, lon: -0.13 },
      { name: "Tokyo", lat: 35.68, lon: 139.69 },
      { name: "Sydney", lat: -33.87, lon: 151.21 },
      { name: "Sao Paulo", lat: -23.55, lon: -46.63 },
      { name: "Cairo", lat: 30.04, lon: 31.24 },
      { name: "Mumbai", lat: 19.08, lon: 72.88 },
      { name: "Beijing", lat: 39.90, lon: 116.40 },
    ];

    const results = [];
    for (const city of cities) {
      try {
        const url = "https://climate-api.open-meteo.com/v1/climate?latitude=" + city.lat + "&longitude=" + city.lon + "&start_date=" + startDate + "&end_date=" + endDate + "&daily=temperature_2m_mean&models=EC_Earth3P_HR";
        const d = await fetchJSON(url);
        results.push({ city: city.name, lat: city.lat, lon: city.lon, data: d });
      } catch (e) {
        results.push({ city: city.name, lat: city.lat, lon: city.lon, data: null });
      }
    }

    const payload = { generated: new Date().toISOString(), cities: results };
    cacheSet(cacheKey, payload, 3600000);
    res.json(payload);
  } catch (err) {
    console.error("[climate-anomalies]", err.message);
    res.status(502).json({ error: "Failed to fetch climate anomalies", detail: err.message });
  }
});

// -- e) WorldPop Exposure --
app.get("/api/worldpop-exposure", async function(req, res) {
  try {
    const lat = parseFloat(req.query.lat) || 0;
    const lon = parseFloat(req.query.lon) || 0;
    const radius = parseFloat(req.query.radius) || 50;

    const cacheKey = "worldpop:" + lat + ":" + lon + ":" + radius;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const absLat = Math.abs(lat);
    let baseDensity;
    if (absLat < 15) baseDensity = 120;
    else if (absLat < 30) baseDensity = 200;
    else if (absLat < 45) baseDensity = 150;
    else if (absLat < 60) baseDensity = 60;
    else baseDensity = 10;

    if (lon > 68 && lon < 145 && lat > 5 && lat < 45) baseDensity *= 2.5;
    else if (lon > -10 && lon < 30 && lat > 35 && lat < 60) baseDensity *= 1.8;
    else if (lon > -90 && lon < -70 && lat > 25 && lat < 50) baseDensity *= 1.5;

    const areaSqKm = Math.PI * radius * radius;
    const estimatedPopulation = Math.round(baseDensity * areaSqKm);

    const payload = {
      lat: lat, lon: lon, radiusKm: radius,
      areaSqKm: Math.round(areaSqKm),
      estimatedPopulation: estimatedPopulation,
      densityPerSqKm: Math.round(baseDensity),
      source: "estimate-model",
    };

    cacheSet(cacheKey, payload, 3600000);
    res.json(payload);
  } catch (err) {
    console.error("[worldpop-exposure]", err.message);
    res.status(502).json({ error: "Failed to compute population exposure", detail: err.message });
  }
});

// -- f) Tech Events --
app.get("/api/tech-events", async function(req, res) {
  try {
    const cacheKey = "tech-events";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const events = [
      { name: "CES", date: currentYear + "-01-07", endDate: currentYear + "-01-10", location: "Las Vegas, USA", category: "consumer-electronics" },
      { name: "MWC Barcelona", date: currentYear + "-02-24", endDate: currentYear + "-02-27", location: "Barcelona, Spain", category: "mobile" },
      { name: "GDC", date: currentYear + "-03-17", endDate: currentYear + "-03-21", location: "San Francisco, USA", category: "gaming" },
      { name: "Google Cloud Next", date: currentYear + "-04-09", endDate: currentYear + "-04-11", location: "Las Vegas, USA", category: "cloud" },
      { name: "RSA Conference", date: currentYear + "-04-28", endDate: currentYear + "-05-01", location: "San Francisco, USA", category: "security" },
      { name: "Microsoft Build", date: currentYear + "-05-19", endDate: currentYear + "-05-21", location: "Seattle, USA", category: "developer" },
      { name: "Google I/O", date: currentYear + "-05-20", endDate: currentYear + "-05-21", location: "Mountain View, USA", category: "developer" },
      { name: "Computex", date: currentYear + "-06-03", endDate: currentYear + "-06-06", location: "Taipei, Taiwan", category: "hardware" },
      { name: "WWDC", date: currentYear + "-06-09", endDate: currentYear + "-06-13", location: "Cupertino, USA", category: "developer" },
      { name: "VivaTech", date: currentYear + "-06-11", endDate: currentYear + "-06-14", location: "Paris, France", category: "startup" },
      { name: "Black Hat USA", date: currentYear + "-08-02", endDate: currentYear + "-08-07", location: "Las Vegas, USA", category: "security" },
      { name: "DEF CON", date: currentYear + "-08-07", endDate: currentYear + "-08-10", location: "Las Vegas, USA", category: "security" },
      { name: "Gamescom", date: currentYear + "-08-20", endDate: currentYear + "-08-24", location: "Cologne, Germany", category: "gaming" },
      { name: "IFA Berlin", date: currentYear + "-09-05", endDate: currentYear + "-09-09", location: "Berlin, Germany", category: "consumer-electronics" },
      { name: "TechCrunch Disrupt", date: currentYear + "-09-15", endDate: currentYear + "-09-17", location: "San Francisco, USA", category: "startup" },
      { name: "Apple Event", date: currentYear + "-09-09", endDate: currentYear + "-09-09", location: "Cupertino, USA", category: "consumer-electronics" },
      { name: "Meta Connect", date: currentYear + "-09-25", endDate: currentYear + "-09-26", location: "Menlo Park, USA", category: "vr-ar" },
      { name: "GitHub Universe", date: currentYear + "-10-29", endDate: currentYear + "-10-30", location: "San Francisco, USA", category: "developer" },
      { name: "Web Summit", date: currentYear + "-11-11", endDate: currentYear + "-11-14", location: "Lisbon, Portugal", category: "general" },
      { name: "AWS re:Invent", date: currentYear + "-12-01", endDate: currentYear + "-12-05", location: "Las Vegas, USA", category: "cloud" },
      { name: "NeurIPS", date: currentYear + "-12-09", endDate: currentYear + "-12-15", location: "Vancouver, Canada", category: "ai-ml" },
      { name: "CES (next year)", date: nextYear + "-01-06", endDate: nextYear + "-01-09", location: "Las Vegas, USA", category: "consumer-electronics" },
    ];

    const days = parseInt(req.query.days) || 180;
    const limit = parseInt(req.query.limit) || 100;
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 86400000);

    const filtered = events
      .filter(function(e) { return new Date(e.endDate) >= now && new Date(e.date) <= cutoff; })
      .sort(function(a, b) { return new Date(a.date) - new Date(b.date); })
      .slice(0, limit)
      .map(function(e) {
        return Object.assign({}, e, {
          daysUntil: Math.max(0, Math.ceil((new Date(e.date) - now) / 86400000)),
          status: new Date(e.date) <= now && new Date(e.endDate) >= now ? "ongoing" : "upcoming",
        });
      });

    const payload = { generated: new Date().toISOString(), count: filtered.length, events: filtered };
    cacheSet(cacheKey, payload, 3600000);
    res.json(payload);
  } catch (err) {
    console.error("[tech-events]", err.message);
    res.status(502).json({ error: "Failed to get tech events", detail: err.message });
  }
});

// -- g) Service Status --
app.get("/api/service-status", async function(req, res) {
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

    const results = await Promise.allSettled(
      services.map(async function(svc) {
        try {
          const data = await fetchJSON(svc.url);
          if (data.status) {
            return {
              name: svc.name,
              status: data.status.indicator === "none" ? "operational" : data.status.indicator,
              description: data.status.description || "Unknown",
            };
          }
          return { name: svc.name, status: "operational", description: "Reachable" };
        } catch (e) {
          return { name: svc.name, status: "unknown", description: "Could not reach status page" };
        }
      })
    );

    const payload = {
      generated: new Date().toISOString(),
      services: results.map(function(r) { return r.status === "fulfilled" ? r.value : { name: "Unknown", status: "error", description: "Check failed" }; }),
    };

    cacheSet(cacheKey, payload, 120000);
    res.json(payload);
  } catch (err) {
    console.error("[service-status]", err.message);
    res.status(502).json({ error: "Failed to fetch service status", detail: err.message });
  }
});

// -- h) Macro Signals (fixed for v8 format) --
app.get("/api/macro-signals", async function(req, res) {
  try {
    const cacheKey = "macro-signals";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const symbols = "^GSPC,^DJI,^IXIC,^VIX,GC=F,CL=F,^TNX,EURUSD=X,BTC-USD";
    const data = await fetchYahooSpark(symbols, "5d", "1d");

    const signals = [];

    // Handle new v8 format (top-level symbol keys)
    for (const [symbol, info] of Object.entries(data)) {
      if (!info || typeof info !== "object" || !info.close) continue;

      const closes = info.close.filter(function(c) { return c !== null; });
      if (closes.length < 2) continue;

      const lastPrice = closes[closes.length - 1];
      const prevClose = info.chartPreviousClose || closes[0];
      const change = lastPrice - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      signals.push({
        symbol: info.symbol || symbol,
        price: Math.round(lastPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        sparkline: closes.map(function(c) { return Math.round(c * 100) / 100; }),
      });
    }

    const payload = { generated: new Date().toISOString(), signals: signals };
    cacheSet(cacheKey, payload, 60000);
    res.json(payload);
  } catch (err) {
    console.error("[macro-signals]", err.message);
    res.status(502).json({ error: "Failed to fetch macro signals", detail: err.message });
  }
});

// -- i) Yahoo Spark Passthrough (with batching) --
app.get("/api/yahoo-spark", async function(req, res) {
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
    res.status(502).json({ error: "Failed to fetch Yahoo spark data", detail: err.message });
  }
});

// -- j) Stablecoin Markets --
app.get("/api/stablecoin-markets", async function(req, res) {
  try {
    const cacheKey = "stablecoin-markets";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=stablecoins&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=1h,24h,7d";
    const data = await fetchJSON(url);
    cacheSet(cacheKey, data, 300000);
    res.json(data);
  } catch (err) {
    console.error("[stablecoin-markets]", err.message);
    res.status(502).json({ error: "Failed to fetch stablecoin markets", detail: err.message });
  }
});

// -- k) ETF Flows --
app.get("/api/etf-flows", async function(req, res) {
  try {
    const cacheKey = "etf-flows";
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const etfSymbols = "IBIT,FBTC,ARKB,BITB,HODL";
    const data = await fetchYahooSpark(etfSymbols, "1mo", "1d");

    const etfs = [];
    for (const [symbol, info] of Object.entries(data)) {
      if (!info || typeof info !== "object" || !info.close) continue;

      const closes = info.close.filter(function(c) { return c !== null; });
      if (closes.length < 2) continue;

      const lastPrice = closes[closes.length - 1];
      const prevClose = info.chartPreviousClose || closes[0];
      const change = lastPrice - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      etfs.push({
        symbol: info.symbol || symbol,
        name: symbol,
        price: Math.round(lastPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        sparkline: closes.map(function(c) { return Math.round(c * 100) / 100; }),
      });
    }

    const payload = { generated: new Date().toISOString(), etfs: etfs };
    cacheSet(cacheKey, payload, 300000);
    res.json(payload);
  } catch (err) {
    console.error("[etf-flows]", err.message);
    res.status(502).json({ error: "Failed to fetch ETF flows", detail: err.message });
  }
});

// -- l) RSS Feed Proxy --
app.get("/api/rss-proxy", async function(req, res) {
  try {
    const feedUrl = req.query.url;
    if (!feedUrl) return res.status(400).json({ error: "Missing url parameter" });

    // Only allow known RSS domains
    const allowedDomains = [
      "feeds.bbci.co.uk", "rss.nytimes.com", "feeds.reuters.com",
      "feeds.feedburner.com", "news.google.com", "rsshub.app",
      "rss.app", "www.aljazeera.com", "techcrunch.com",
      "feeds.arstechnica.com", "www.theverge.com"
    ];

    try {
      const urlObj = new URL(feedUrl);
      if (!allowedDomains.some(function(d) { return urlObj.hostname.includes(d); })) {
        return res.status(403).json({ error: "Domain not allowed" });
      }
    } catch (e) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    const cacheKey = "rss:" + feedUrl;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.type("application/xml");
      return res.send(cached);
    }

    const text = await fetchText(feedUrl);
    cacheSet(cacheKey, text, 300000);
    res.type("application/xml");
    res.send(text);
  } catch (err) {
    console.error("[rss-proxy]", err.message);
    res.status(502).json({ error: "Failed to fetch RSS feed", detail: err.message });
  }
});

// -- m) Catch-all 404 --
app.all("/api/*", function(req, res) {
  res.status(404).json({ error: "Not found", path: req.path });
});

// -- Start server --
app.listen(PORT, HOST, function() {
  console.log("GlobalPulse proxy server running at http://" + HOST + ":" + PORT);
});
