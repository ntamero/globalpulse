import express from 'express';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

const app = express();
const PORT = process.env.PORT || 3000;

// Compression
app.use(compression());

// CORS for all /api and /rss routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ============================================
// RSS Proxy Routes
// ============================================
const RSS_PROXIES = {
  '/rss/bbc': 'https://feeds.bbci.co.uk',
  '/rss/guardian': 'https://www.theguardian.com',
  '/rss/npr': 'https://feeds.npr.org',
  '/rss/apnews': 'https://rsshub.app/apnews',
  '/rss/aljazeera': 'https://www.aljazeera.com',
  '/rss/cnn': 'http://rss.cnn.com',
  '/rss/hn': 'https://hnrss.org',
  '/rss/arstechnica': 'https://feeds.arstechnica.com',
  '/rss/verge': 'https://www.theverge.com',
  '/rss/cnbc': 'https://www.cnbc.com',
  '/rss/marketwatch': 'https://feeds.marketwatch.com',
  '/rss/defenseone': 'https://www.defenseone.com',
  '/rss/warontherocks': 'https://warontherocks.com',
  '/rss/breakingdefense': 'https://breakingdefense.com',
  '/rss/bellingcat': 'https://www.bellingcat.com',
  '/rss/techcrunch': 'https://techcrunch.com',
  '/rss/googlenews': 'https://news.google.com',
  '/rss/openai': 'https://openai.com',
  '/rss/anthropic': 'https://www.anthropic.com',
  '/rss/googleai': 'https://blog.google',
  '/rss/deepmind': 'https://deepmind.google',
  '/rss/huggingface': 'https://huggingface.co',
  '/rss/techreview': 'https://www.technologyreview.com',
  '/rss/arxiv': 'https://rss.arxiv.org',
  '/rss/whitehouse': 'https://www.whitehouse.gov',
  '/rss/statedept': 'https://www.state.gov',
  '/rss/state': 'https://www.state.gov',
  '/rss/defense': 'https://www.defense.gov',
  '/rss/justice': 'https://www.justice.gov',
  '/rss/cdc': 'https://tools.cdc.gov',
  '/rss/fema': 'https://www.fema.gov',
  '/rss/dhs': 'https://www.dhs.gov',
  '/rss/fedreserve': 'https://www.federalreserve.gov',
  '/rss/sec': 'https://www.sec.gov',
  '/rss/treasury': 'https://home.treasury.gov',
  '/rss/cisa': 'https://www.cisa.gov',
  '/rss/brookings': 'https://www.brookings.edu',
  '/rss/cfr': 'https://www.cfr.org',
  '/rss/csis': 'https://www.csis.org',
  '/rss/warzone': 'https://www.thedrive.com',
  '/rss/defensegov': 'https://www.defense.gov',
  '/rss/krebs': 'https://krebsonsecurity.com',
  '/rss/yahoonews': 'https://finance.yahoo.com',
  '/rss/diplomat': 'https://thediplomat.com',
  '/rss/venturebeat': 'https://venturebeat.com',
  '/rss/foreignpolicy': 'https://foreignpolicy.com',
  '/rss/ft': 'https://www.ft.com',
  '/rss/reuters': 'https://www.reutersagency.com',
};

for (const [path, target] of Object.entries(RSS_PROXIES)) {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: '' },
    timeout: 15000,
    on: {
      error: (err, req, res) => {
        console.error(`RSS proxy ${path} error:`, err.message);
        if (!res.headersSent) res.status(502).json({ error: 'RSS proxy error' });
      },
    },
  }));
}

// ============================================
// API Proxy Routes
// ============================================

// Yahoo Finance
app.use('/api/yahoo', createProxyMiddleware({
  target: 'https://query1.finance.yahoo.com',
  changeOrigin: true,
  pathRewrite: { '^/api/yahoo': '' },
  timeout: 15000,
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'Yahoo proxy error' }); } },
}));

// CoinGecko
app.use('/api/coingecko', (req, res, next) => {
  const params = new URLSearchParams(req.url.includes('?') ? req.url.split('?')[1] : '');
  if (params.get('endpoint') === 'markets') {
    params.delete('endpoint');
    const vs = params.get('vs_currencies') || 'usd';
    params.delete('vs_currencies');
    params.set('vs_currency', vs);
    params.set('sparkline', 'true');
    params.set('order', 'market_cap_desc');
    req.url = `/api/v3/coins/markets?${params.toString()}`;
  } else {
    const qs = req.url.includes('?') ? req.url.split('?')[1] : '';
    req.url = `/api/v3/simple/price?${qs}`;
  }
  next();
}, createProxyMiddleware({
  target: 'https://api.coingecko.com',
  changeOrigin: true,
  timeout: 15000,
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'CoinGecko proxy error' }); } },
}));

// USGS Earthquake
app.use('/api/earthquake', createProxyMiddleware({
  target: 'https://earthquake.usgs.gov',
  changeOrigin: true,
  pathRewrite: { '^/api/earthquake': '' },
  timeout: 30000,
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'Earthquake proxy error' }); } },
}));

// PizzINT
app.use('/api/pizzint', createProxyMiddleware({
  target: 'https://www.pizzint.watch',
  changeOrigin: true,
  pathRewrite: { '^/api/pizzint': '/api' },
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'PizzINT proxy error' }); } },
}));

// Cloudflare Radar
app.use('/api/cloudflare-radar', createProxyMiddleware({
  target: 'https://api.cloudflare.com',
  changeOrigin: true,
  pathRewrite: { '^/api/cloudflare-radar': '' },
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'Cloudflare proxy error' }); } },
}));

// NGA Maritime Safety
app.use('/api/nga-msi', createProxyMiddleware({
  target: 'https://msi.nga.mil',
  changeOrigin: true,
  pathRewrite: { '^/api/nga-msi': '' },
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'NGA proxy error' }); } },
}));

// ACLED
app.use('/api/acled', createProxyMiddleware({
  target: 'https://acleddata.com',
  changeOrigin: true,
  pathRewrite: { '^/api/acled': '' },
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'ACLED proxy error' }); } },
}));

// GDELT GEO (must come before /api/gdelt)
app.use('/api/gdelt-geo', createProxyMiddleware({
  target: 'https://api.gdeltproject.org',
  changeOrigin: true,
  pathRewrite: { '^/api/gdelt-geo': '/api/v2/geo/geo' },
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'GDELT geo proxy error' }); } },
}));

// GDELT
app.use('/api/gdelt', createProxyMiddleware({
  target: 'https://api.gdeltproject.org',
  changeOrigin: true,
  pathRewrite: { '^/api/gdelt': '' },
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'GDELT proxy error' }); } },
}));

// FAA NASSTATUS
app.use('/api/faa', createProxyMiddleware({
  target: 'https://nasstatus.faa.gov',
  changeOrigin: true,
  pathRewrite: { '^/api/faa': '' },
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'FAA proxy error' }); } },
}));

// OpenSky
app.use('/api/opensky', createProxyMiddleware({
  target: 'https://opensky-network.org/api',
  changeOrigin: true,
  pathRewrite: { '^/api/opensky': '' },
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'OpenSky proxy error' }); } },
}));

// ADS-B Exchange
app.use('/api/adsb-exchange', createProxyMiddleware({
  target: 'https://adsbexchange.com/api',
  changeOrigin: true,
  pathRewrite: { '^/api/adsb-exchange': '' },
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'ADS-B proxy error' }); } },
}));

// Polymarket - proxy to worldmonitor.app Vercel edge function
app.use('/api/polymarket', createProxyMiddleware({
  target: 'https://worldmonitor.app',
  changeOrigin: true,
  on: { error: (err, req, res) => { if (!res.headersSent) res.status(502).json({ error: 'Polymarket proxy error' }); } },
}));

// YouTube Live API
app.get('/api/youtube/live', (req, res) => {
  const channel = req.query.channel;
  if (!channel) return res.status(400).json({ error: 'Missing channel parameter' });
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({ videoId: null, channel });
});

// ============================================
// Vercel Serverless Function Adapter
// ============================================
// The API handlers use Vercel Edge Runtime format: export default function handler(req: Request) => Response
// We adapt them to Express by wrapping the Request/Response

async function loadVercelHandler(apiPath) {
  try {
    const modulePath = resolve(ROOT, 'api', apiPath);
    if (!existsSync(modulePath + '.js') && !existsSync(modulePath)) return null;
    const mod = await import(existsSync(modulePath + '.js') ? modulePath + '.js' : modulePath);
    return mod.default || null;
  } catch (err) {
    console.error(`Failed to load API handler ${apiPath}:`, err.message);
    return null;
  }
}

// Adapt Vercel Edge handler to Express
function vercelEdgeAdapter(handlerPath) {
  return async (req, res) => {
    try {
      const handler = await loadVercelHandler(handlerPath);
      if (!handler) return res.status(404).json({ error: 'API handler not found' });

      // Build a Web API Request from Express req
      const url = new URL(req.originalUrl, `http://${req.headers.host || 'localhost'}`);
      const webRequest = new Request(url.toString(), {
        method: req.method,
        headers: new Headers(req.headers),
      });

      const webResponse = await handler(webRequest);

      // Copy status and headers
      res.status(webResponse.status);
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Send body
      const body = await webResponse.text();
      res.send(body);
    } catch (err) {
      console.error(`API error ${handlerPath}:`, err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Register Vercel-style API handlers
const VERCEL_APIS = [
  'rss-proxy',
  'yahoo-finance',
  'coingecko',
  'earthquakes',
  'gdelt-doc',
  'gdelt-geo',
  'finnhub',
  'groq-summarize',
  'openrouter-summarize',
  'risk-scores',
  'classify-event',
  'classify-batch',
  'country-intel',
  'macro-signals',
  'stock-index',
  'etf-flows',
  'stablecoin-markets',
  'github-trending',
  'hackernews',
  'service-status',
  'tech-events',
  'story',
  'og-story',
  'version',
  'cloudflare-outages',
  'firms-fires',
  'cyber-threats',
  'climate-anomalies',
  'worldbank',
  'ucdp',
  'ucdp-events',
  'unhcr-population',
  'worldpop-exposure',
  'theater-posture',
  'temporal-baseline',
  'ais-snapshot',
  'acled',
  'acled-conflict',
  'nga-warnings',
  'faa-status',
  'opensky',
  'polymarket',
  'arxiv',
  'fred-data',
  'hapi',
  'fwdstart',
  'download',
];

for (const api of VERCEL_APIS) {
  app.all(`/api/${api}`, vercelEdgeAdapter(api));
  app.all(`/api/${api}/*`, vercelEdgeAdapter(api));
}

// ============================================
// Static File Serving (Production Build)
// ============================================

// Serve static assets with long cache
app.use('/assets', express.static(resolve(DIST, 'assets'), {
  maxAge: '365d',
  immutable: true,
}));

// Serve other static files
app.use(express.static(DIST, {
  maxAge: '1h',
  setHeaders(res, path) {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    if (path.endsWith('sw.js') || path.endsWith('manifest.webmanifest')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  },
}));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/rss/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(resolve(DIST, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌍 GlobalPulse (WorldMonitor) server running on port ${PORT}`);
  console.log(`   Frontend: http://0.0.0.0:${PORT}`);
  console.log(`   API proxies: ${Object.keys(RSS_PROXIES).length} RSS + ${VERCEL_APIS.length} API handlers`);
});
