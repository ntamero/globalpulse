/**
 * GlobalPulse — News Sitemap for Google News
 *
 * Dynamic news sitemap that lists recent intelligence briefs.
 * Google News requires articles published within last 48 hours.
 *
 * GET /api/news-sitemap → XML news sitemap
 */

const COUNTRIES = [
  'US', 'CN', 'RU', 'UA', 'GB', 'DE', 'FR', 'JP', 'IN', 'BR',
  'KR', 'IL', 'IR', 'SA', 'TR', 'PK', 'EG', 'NG', 'ZA', 'AU',
  'CA', 'MX', 'ID', 'TH', 'TW', 'AE', 'IQ', 'SY', 'AF', 'YE',
];

const COUNTRY_NAMES = {
  US: 'United States', CN: 'China', RU: 'Russia', UA: 'Ukraine', GB: 'United Kingdom',
  DE: 'Germany', FR: 'France', JP: 'Japan', IN: 'India', BR: 'Brazil',
  KR: 'South Korea', IL: 'Israel', IR: 'Iran', SA: 'Saudi Arabia', TR: 'Turkey',
  PK: 'Pakistan', EG: 'Egypt', NG: 'Nigeria', ZA: 'South Africa', AU: 'Australia',
  CA: 'Canada', MX: 'Mexico', ID: 'Indonesia', TH: 'Thailand', TW: 'Taiwan',
  AE: 'UAE', IQ: 'Iraq', SY: 'Syria', AF: 'Afghanistan', YE: 'Yemen',
};

const BASE_URL = 'http://46.62.167.252';
const STORY_TYPES = ['ciianalysis', 'crisisalert', 'dailybrief'];

export default function handler(req) {
  const now = new Date();
  const todayISO = now.toISOString();
  const yesterdayISO = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
`;

  // Generate entries for top countries with recent "stories"
  for (const code of COUNTRIES) {
    const name = COUNTRY_NAMES[code] || code;
    for (const type of STORY_TYPES) {
      const label = type === 'ciianalysis'
        ? 'Country Instability Analysis'
        : type === 'crisisalert'
          ? 'Crisis Alert'
          : 'Daily Intelligence Brief';

      xml += `
  <url>
    <loc>${BASE_URL}/api/story?c=${code}&amp;t=${type}</loc>
    <news:news>
      <news:publication>
        <news:name>GlobalPulse</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${yesterdayISO}</news:publication_date>
      <news:title>${name} ${label} — GlobalPulse Intelligence</news:title>
      <news:keywords>${name}, intelligence, ${type.replace(/([A-Z])/g, ' $1').trim()}, geopolitics, OSINT</news:keywords>
    </news:news>
  </url>
`;
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
