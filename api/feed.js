/**
 * GlobalPulse — RSS/Atom Feed
 *
 * Provides an RSS 2.0 feed of GlobalPulse intelligence briefs
 * for feed readers and aggregators.
 *
 * GET /api/feed → RSS 2.0 XML
 * GET /api/feed?format=atom → Atom 1.0 XML
 */

const BASE_URL = 'http://46.62.167.252';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CN', name: 'China' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'IL', name: 'Israel' },
  { code: 'IR', name: 'Iran' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TW', name: 'Taiwan' },
];

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default function handler(req) {
  const url = new URL(req.url, BASE_URL);
  const format = url.searchParams.get('format') || 'rss';
  const now = new Date();

  // Generate items — one per country with today's date
  const items = COUNTRIES.map((country, idx) => {
    const pubDate = new Date(now.getTime() - idx * 3600000); // stagger by 1 hour each
    return {
      title: `${country.name} — Intelligence Brief`,
      link: `${BASE_URL}/api/story?c=${country.code}&t=ciianalysis`,
      description: `AI-generated intelligence analysis for ${country.name}. Covers instability indicators, economic signals, military activity, and geopolitical developments.`,
      pubDate: pubDate.toUTCString(),
      pubDateISO: pubDate.toISOString(),
      guid: `${BASE_URL}/story/${country.code}/${now.toISOString().split('T')[0]}`,
      category: 'Intelligence',
      country: country.name,
      code: country.code,
    };
  });

  if (format === 'atom') {
    return generateAtom(items, now);
  }
  return generateRSS(items, now);
}

function generateRSS(items, now) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>GlobalPulse Intelligence</title>
    <link>${BASE_URL}/</link>
    <description>AI-powered real-time global intelligence briefs covering geopolitics, markets, military activity, and crisis monitoring.</description>
    <language>en</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/api/feed" rel="self" type="application/rss+xml" />
    <image>
      <url>${BASE_URL}/favico/android-chrome-192x192.png</url>
      <title>GlobalPulse</title>
      <link>${BASE_URL}/</link>
    </image>
    <ttl>60</ttl>
    <copyright>GlobalPulse ${now.getFullYear()}</copyright>
    <managingEditor>noreply@globalpulse.io (GlobalPulse)</managingEditor>
    <webMaster>noreply@globalpulse.io (GlobalPulse)</webMaster>
    <category>News</category>
    <category>Intelligence</category>
    <category>Geopolitics</category>
${items.map(item => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <dc:creator>GlobalPulse AI</dc:creator>
      <category>${escapeXml(item.category)}</category>
      <category>${escapeXml(item.country)}</category>
    </item>`).join('')}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function generateAtom(items, now) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>GlobalPulse Intelligence</title>
  <subtitle>AI-powered real-time global intelligence briefs</subtitle>
  <link href="${BASE_URL}/" />
  <link href="${BASE_URL}/api/feed?format=atom" rel="self" type="application/atom+xml" />
  <id>${BASE_URL}/</id>
  <updated>${now.toISOString()}</updated>
  <author>
    <name>GlobalPulse</name>
    <uri>${BASE_URL}/</uri>
  </author>
  <icon>${BASE_URL}/favico/favicon-32x32.png</icon>
  <logo>${BASE_URL}/favico/android-chrome-192x192.png</logo>
  <rights>GlobalPulse ${now.getFullYear()}</rights>
  <category term="intelligence" />
  <category term="news" />
  <category term="geopolitics" />
${items.map(item => `
  <entry>
    <title>${escapeXml(item.title)}</title>
    <link href="${escapeXml(item.link)}" />
    <id>${escapeXml(item.guid)}</id>
    <updated>${item.pubDateISO}</updated>
    <published>${item.pubDateISO}</published>
    <summary>${escapeXml(item.description)}</summary>
    <author>
      <name>GlobalPulse AI</name>
    </author>
    <category term="${escapeXml(item.country)}" />
    <category term="intelligence" />
  </entry>`).join('')}
</feed>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
