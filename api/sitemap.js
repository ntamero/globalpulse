/**
 * GlobalPulse — Dynamic Sitemap Generator
 *
 * Generates XML sitemap with:
 * - Main dashboard pages
 * - Country intelligence pages
 * - Category pages per variant
 *
 * GET /api/sitemap → XML sitemap
 */

// Top 60 countries by geopolitical relevance
const COUNTRIES = [
  'US', 'CN', 'RU', 'UA', 'GB', 'DE', 'FR', 'JP', 'IN', 'BR',
  'KR', 'IL', 'IR', 'SA', 'TR', 'PK', 'EG', 'NG', 'ZA', 'AU',
  'CA', 'MX', 'AR', 'CL', 'CO', 'ID', 'TH', 'VN', 'PH', 'MY',
  'TW', 'SG', 'AE', 'QA', 'KW', 'IQ', 'SY', 'AF', 'YE', 'LY',
  'SD', 'ET', 'KE', 'CD', 'PL', 'RO', 'CZ', 'SE', 'NO', 'FI',
  'IT', 'ES', 'PT', 'GR', 'NL', 'BE', 'CH', 'AT', 'NZ', 'MM',
];

const COUNTRY_NAMES = {
  US: 'United States', CN: 'China', RU: 'Russia', UA: 'Ukraine', GB: 'United Kingdom',
  DE: 'Germany', FR: 'France', JP: 'Japan', IN: 'India', BR: 'Brazil',
  KR: 'South Korea', IL: 'Israel', IR: 'Iran', SA: 'Saudi Arabia', TR: 'Turkey',
  PK: 'Pakistan', EG: 'Egypt', NG: 'Nigeria', ZA: 'South Africa', AU: 'Australia',
  CA: 'Canada', MX: 'Mexico', AR: 'Argentina', CL: 'Chile', CO: 'Colombia',
  ID: 'Indonesia', TH: 'Thailand', VN: 'Vietnam', PH: 'Philippines', MY: 'Malaysia',
  TW: 'Taiwan', SG: 'Singapore', AE: 'UAE', QA: 'Qatar', KW: 'Kuwait',
  IQ: 'Iraq', SY: 'Syria', AF: 'Afghanistan', YE: 'Yemen', LY: 'Libya',
  SD: 'Sudan', ET: 'Ethiopia', KE: 'Kenya', CD: 'DR Congo', PL: 'Poland',
  RO: 'Romania', CZ: 'Czech Republic', SE: 'Sweden', NO: 'Norway', FI: 'Finland',
  IT: 'Italy', ES: 'Spain', PT: 'Portugal', GR: 'Greece', NL: 'Netherlands',
  BE: 'Belgium', CH: 'Switzerland', AT: 'Austria', NZ: 'New Zealand', MM: 'Myanmar',
};

const BASE_URL = 'http://46.62.167.252';

export default function handler(req) {
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <!-- Main Dashboard -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Settings -->
  <url>
    <loc>${BASE_URL}/settings</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
`;

  // Country intelligence pages
  for (const code of COUNTRIES) {
    const name = COUNTRY_NAMES[code] || code;
    xml += `
  <!-- ${name} Intelligence -->
  <url>
    <loc>${BASE_URL}/api/story?c=${code}&amp;t=ciianalysis</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  xml += '</urlset>';

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}
