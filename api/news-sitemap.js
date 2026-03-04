/**
 * GlobalScope — News Sitemap for Google News
 *
 * Dynamic news sitemap with real trending headlines from the SEO engine.
 * Google News requires articles published within last 48 hours.
 *
 * GET /api/news-sitemap → XML news sitemap
 */

const BASE_URL = 'https://globalscope.live';

function escXml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export default function handler(req) {
  const seoState = globalThis.__seoState;
  const categoryMeta = globalThis.__seoCategoryMeta || {};

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
`;

  // If SEO engine has data, use real headlines
  if (seoState?.globalHeadlines?.length > 0) {
    const cutoff = Date.now() - (48 * 60 * 60 * 1000); // 48 hours ago

    for (const headline of seoState.globalHeadlines) {
      const pubDate = headline.pubDate instanceof Date ? headline.pubDate : new Date(headline.pubDate);
      if (pubDate.getTime() < cutoff) continue;

      const cat = headline.category || 'politics';
      const slug = headline.slug || slugify(headline.title);
      const catMeta = categoryMeta[cat];

      // Get keywords for this category
      const catKeywords = seoState.categories?.[cat]?.keywords?.slice(0, 5).map(k => k.term) || [];
      const kwString = catKeywords.length > 0
        ? catKeywords.join(', ')
        : 'intelligence, OSINT, geopolitics';

      xml += `
  <url>
    <loc>${BASE_URL}/t/${cat}#${escXml(slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>GlobalScope</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate.toISOString()}</news:publication_date>
      <news:title>${escXml(headline.title)}</news:title>
      <news:keywords>${escXml(kwString)}</news:keywords>
    </news:news>
  </url>
`;
    }
  }

  // Also include category landing pages as news entries
  const categories = globalThis.__seoCategories || [];
  for (const cat of categories) {
    const catState = seoState?.categories?.[cat];
    if (!catState?.headlines?.length) continue;

    const meta = categoryMeta[cat];
    if (!meta) continue;

    const topKeywords = catState.keywords.slice(0, 5).map(k => k.term);
    const latestDate = catState.lastUpdate || new Date();

    xml += `
  <url>
    <loc>${BASE_URL}/t/${cat}</loc>
    <news:news>
      <news:publication>
        <news:name>GlobalScope</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${latestDate instanceof Date ? latestDate.toISOString() : new Date(latestDate).toISOString()}</news:publication_date>
      <news:title>${escXml(meta.title)} — GlobalScope Intelligence</news:title>
      <news:keywords>${escXml(topKeywords.join(', ') || 'intelligence, OSINT')}</news:keywords>
    </news:news>
  </url>
`;
  }

  xml += '</urlset>';

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
      'X-Robots-Tag': 'noindex',
    },
  });
}
