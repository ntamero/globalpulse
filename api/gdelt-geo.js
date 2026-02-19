// GDELT Geo API proxy with security hardening
import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
export const config = { runtime: 'edge' };

const ALLOWED_FORMATS = ['geojson', 'json', 'csv'];
const MAX_RECORDS = 500;
const MIN_RECORDS = 1;
const ALLOWED_TIMESPANS = ['1d', '7d', '14d', '30d', '60d', '90d'];

function validateMaxRecords(val) {
  const num = parseInt(val, 10);
  if (isNaN(num)) return 250;
  return Math.max(MIN_RECORDS, Math.min(MAX_RECORDS, num));
}

function validateFormat(val) {
  return ALLOWED_FORMATS.includes(val) ? val : 'geojson';
}

function validateTimespan(val) {
  return ALLOWED_TIMESPANS.includes(val) ? val : '7d';
}

function sanitizeQuery(val) {
  if (!val || typeof val !== 'string') return 'protest';
  return val.slice(0, 200).replace(/[<>\"']/g, '');
}

export default async function handler(req) {
  const cors = getCorsHeaders(req);
  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers: cors });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const url = new URL(req.url);
  const query = sanitizeQuery(url.searchParams.get('query'));
  const format = validateFormat(url.searchParams.get('format') || 'geojson');
  const maxrecords = validateMaxRecords(url.searchParams.get('maxrecords') || '250');
  const timespan = validateTimespan(url.searchParams.get('timespan') || '7d');

  try {
    const response = await fetch(
      `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(query)}&format=${format}&maxrecords=${maxrecords}&timespan=${timespan}`
    );

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Upstream service unavailable' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...cors,
        },
      });
    }

    const data = await response.text();
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        ...cors,
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[GDELT] Fetch error:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to fetch GDELT data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...cors,
      },
    });
  }
}
