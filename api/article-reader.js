import { getCorsHeaders } from './_cors.js';

export const config = { runtime: 'edge' };

/**
 * Article Reader Proxy
 *
 * Fetches an article URL server-side and returns the HTML content
 * with X-Frame-Options and CSP headers stripped, so it can be
 * displayed in an iframe overlay on our site.
 *
 * For Google News wrapper URLs, returns a redirect page that opens
 * the article directly since Google News URLs can't be proxied.
 */

async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

const BLOCKED_DOMAINS = [
  'localhost', '127.0.0.1', '0.0.0.0',
  '169.254.169.254',
  'metadata.google.internal',
];

function isDomainBlocked(hostname) {
  return BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
}

/**
 * Check if URL is a Google News wrapper URL that can't be proxied.
 */
function isGoogleNewsUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === 'news.google.com' && u.pathname.includes('/articles/');
  } catch { return false; }
}

/**
 * Generate a nice reader page that redirects to the actual article.
 * Used for Google News URLs and other unproxyable sources.
 */
function generateRedirectPage(articleUrl, title, source) {
  const safeUrl = articleUrl.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const safeTitle = (title || 'Article').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const safeSource = (source || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 500px;
      text-align: center;
      background: #16213e;
      border-radius: 16px;
      padding: 3rem 2rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    .title {
      font-size: 1.1rem;
      line-height: 1.5;
      margin-bottom: 0.5rem;
      color: #fff;
      font-weight: 600;
    }
    .source {
      font-size: 0.85rem;
      color: #ffa500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.5rem;
    }
    .message {
      font-size: 0.9rem;
      color: #999;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #e94560, #c23152);
      color: #fff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 12px rgba(233,69,96,0.3);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(233,69,96,0.4);
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #e94560;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .redirect-note {
      font-size: 0.8rem;
      color: #666;
      margin-top: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📰</div>
    ${safeSource ? `<div class="source">${safeSource}</div>` : ''}
    <div class="title">${safeTitle}</div>
    <div class="message">This article is available from its original source</div>
    <a class="btn" href="${safeUrl}" target="_blank" rel="noopener">Read Article →</a>
    <div class="redirect-note">Click to open article from its original source</div>
  </div>
</body>
</html>`;
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const articleUrl = requestUrl.searchParams.get('url');
  const title = requestUrl.searchParams.get('title') || '';
  const source = requestUrl.searchParams.get('source') || '';

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

    // Google News URLs can't be proxied — show redirect page
    if (isGoogleNewsUrl(articleUrl)) {
      const html = generateRedirectPage(articleUrl, title, source);
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...corsHeaders,
        },
      });
    }

    const response = await fetchWithTimeout(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Referer': 'https://www.google.com/',
      },
      redirect: 'follow',
    }, 15000);

    if (!response.ok) {
      // If upstream fails, show redirect page instead of error
      const html = generateRedirectPage(articleUrl, title, source);
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...corsHeaders,
        },
      });
    }

    const contentType = response.headers.get('content-type') || '';

    // Only proxy HTML responses
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      const html = generateRedirectPage(articleUrl, title, source);
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...corsHeaders,
        },
      });
    }

    let html = await response.text();

    // If the response looks like a redirect page (very short with meta-refresh or JS redirect),
    // try to extract the target URL
    if (html.length < 5000) {
      const metaRefresh = html.match(/content=["']\d+;\s*url=([^"']+)/i);
      const jsRedirect = html.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)/i);
      const redirectUrl = metaRefresh?.[1] || jsRedirect?.[1];

      if (redirectUrl && redirectUrl.startsWith('http')) {
        // Follow the extracted redirect
        try {
          const redirectResponse = await fetchWithTimeout(redirectUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.google.com/',
            },
            redirect: 'follow',
          }, 12000);

          if (redirectResponse.ok) {
            html = await redirectResponse.text();
          }
        } catch { /* use original html */ }
      }
    }

    // Determine base URL for relative resource resolution
    const finalUrl = response.url || articleUrl;
    const finalParsed = new URL(finalUrl);
    const baseUrl = finalParsed.origin + finalParsed.pathname.replace(/\/[^/]*$/, '/');

    // Inject <base> tag and reader styles
    const baseTag = `<base href="${baseUrl}" target="_self">`;
    const readerStyle = `<style>
      body { margin: 0 !important; }
      [class*="cookie"], [class*="consent"], [class*="paywall"],
      [class*="subscribe-wall"], [class*="modal-overlay"],
      [id*="cookie"], [id*="consent"], [id*="paywall"],
      [class*="ad-slot"], [class*="ad-container"], [class*="advertisement"],
      .fc-consent-root, #onetrust-banner-sdk, .qc-cmp2-container,
      [class*="newsletter-signup"], [class*="popup-overlay"],
      [class*="sticky-header"], [class*="site-nav"],
      .tp-modal, .tp-backdrop, [class*="piano"] {
        display: none !important;
      }
      /* Prevent scripts from showing alerts/popups */
    </style>`;

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}${readerStyle}`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD>${baseTag}${readerStyle}`);
    } else {
      html = `${baseTag}${readerStyle}${html}`;
    }

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=600, s-maxage=600',
        ...corsHeaders,
      },
    });
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    console.error('Article reader error:', articleUrl, error.message);

    // On error, show redirect page instead of JSON error
    const html = generateRedirectPage(articleUrl, title, source);
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        ...corsHeaders,
      },
    });
  }
}
