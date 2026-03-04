/**
 * GlobalScope — Category Sitemap
 *
 * Per-category sitemap with dynamic lastmod timestamps
 * and trending headline URLs.
 *
 * GET /api/category-sitemap → XML sitemap
 */

const BASE_URL = 'https://globalscope.live';

function escXml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function handler(req) {
  const seoState = globalThis.__seoState;
  const categoryMeta = globalThis.__seoCategoryMeta || {};
  const categories = globalThis.__seoCategories || [];
  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const cat of categories) {
    const meta = categoryMeta[cat];
    if (!meta) continue;

    const catState = seoState?.categories?.[cat];
    const lastmod = catState?.lastUpdate
      ? new Date(catState.lastUpdate).toISOString().split('T')[0]
      : now;

    // Category landing page
    xml += `
  <url>
    <loc>${BASE_URL}/t/${cat}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // Individual headline anchors within category
    if (catState?.headlines?.length > 0) {
      for (const headline of catState.headlines.slice(0, 10)) {
        const slug = headline.slug || headline.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
        const pubDate = headline.pubDate instanceof Date
          ? headline.pubDate.toISOString().split('T')[0]
          : now;

        xml += `
  <url>
    <loc>${BASE_URL}/t/${cat}#${escXml(slug)}</loc>
    <lastmod>${pubDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }
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
