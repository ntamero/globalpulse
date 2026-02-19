import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
export const config = { runtime: 'edge' };

const SYMBOL_PATTERN = /^[A-Za-z0-9.^]+$/;
const MAX_SYMBOLS = 20;
const MAX_SYMBOL_LENGTH = 10;

function validateSymbols(symbolsParam) {
  if (!symbolsParam) return null;

  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length <= MAX_SYMBOL_LENGTH && SYMBOL_PATTERN.test(s))
    .slice(0, MAX_SYMBOLS);

  return symbols.length > 0 ? symbols : null;
}

async function fetchQuote(symbol, apiKey) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    return { symbol, error: `HTTP ${response.status}` };
  }

  const data = await response.json();

  // Finnhub returns { c, d, dp, h, l, o, pc, t } where:
  // c = current price, d = change, dp = percent change
  // h = high, l = low, o = open, pc = previous close, t = timestamp
  if (data.c === 0 && data.h === 0 && data.l === 0) {
    return { symbol, error: 'No data available' };
  }

  return {
    symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    timestamp: data.t,
  };
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    if (isDisallowedOrigin(req)) {
      return new Response(null, { status: 403, headers: corsHeaders });
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ quotes: [], skipped: true, reason: 'FINNHUB_API_KEY not configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30', ...corsHeaders },
    });
  }

  const url = new URL(req.url);
  const symbols = validateSymbols(url.searchParams.get('symbols'));

  if (!symbols) {
    return new Response(JSON.stringify({ error: 'Invalid or missing symbols parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // Fetch all quotes in parallel (Finnhub allows 60 req/min on free tier)
    const quotes = await Promise.all(
      symbols.map(symbol => fetchQuote(symbol, apiKey))
    );

    return new Response(JSON.stringify({ quotes }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=15',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
