import { getCorsHeaders } from './_cors.js';

export const config = { runtime: 'edge' };

/**
 * Article Reader Proxy
 *
 * Fetches an article URL server-side and returns the HTML content
 * with X-Frame-Options and CSP headers stripped, so it can be
 * displayed in an iframe overlay on our site.
 *
 * Also injects a <base> tag so relative URLs resolve correctly.
 */

// Fetch with timeout
async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// Block obviously dangerous domains
const BLOCKED_DOMAINS = [
  'localhost', '127.0.0.1', '0.0.0.0',
  '169.254.169.254', // AWS metadata
  'metadata.google.internal',
];

function isDomainBlocked(hostname) {
  return BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const articleUrl = requestUrl.searchParams.get('url');

  if (!articleUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const parsedUrl = new URL(articleUrl);

    // Security: block internal/private IPs
    if (isDomainBlocked(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ error: 'Blocked domain' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(JSON.stringify({ error: 'Invalid protocol' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const response = await fetchWithTimeout(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
      },
      redirect: 'follow',
    }, 15000);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Upstream returned ${response.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let html = await response.text();

    // Determine base URL for relative resource resolution
    const baseUrl = parsedUrl.origin + parsedUrl.pathname.replace(/\/[^/]*$/, '/');

    // Inject <base> tag right after <head> so relative URLs resolve correctly
    // Also inject minimal styling to improve readability
    const baseTag = `<base href="${baseUrl}" target="_self">`;
    const readerStyle = `<style>
      /* Article reader overlay adjustments */
      body { margin: 0 !important; }
      /* Hide common cookie/consent banners, paywalls, popups */
      [class*="cookie"], [class*="consent"], [class*="paywall"],
      [class*="subscribe-wall"], [class*="modal-overlay"],
      [id*="cookie"], [id*="consent"], [id*="paywall"],
      [class*="ad-slot"], [class*="ad-container"], [class*="advertisement"],
      .fc-consent-root, #onetrust-banner-sdk, .qc-cmp2-container,
      [class*="newsletter-signup"], [class*="popup-overlay"] {
        display: none !important;
      }
    </style>`;

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}${readerStyle}`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD>${baseTag}${readerStyle}`);
    } else {
      html = `${baseTag}${readerStyle}${html}`;
    }

    // Return HTML with security headers stripped
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=600, s-maxage=600',
        // Explicitly NOT setting X-Frame-Options or CSP frame-ancestors
        // so the content can be embedded in our iframe
        ...corsHeaders,
      },
    });
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    console.error('Article reader error:', articleUrl, error.message);
    return new Response(JSON.stringify({
      error: isTimeout ? 'Article fetch timeout' : 'Failed to fetch article',
      details: error.message,
    }), {
      status: isTimeout ? 504 : 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
