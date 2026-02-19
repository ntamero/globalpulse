import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://globalpulse.news';
const locales = ['en', 'tr', 'ar', 'fr', 'de', 'es', 'zh', 'ru'];

const regions = [
  'middle-east',
  'europe',
  'asia-pacific',
  'americas',
  'africa',
  'central-asia',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [];

  // Static pages per locale
  const staticPages = ['', '/live', '/timeline', '/maps'];

  for (const locale of locales) {
    for (const page of staticPages) {
      routes.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'always' : 'hourly',
        priority: page === '' ? 1.0 : 0.8,
      });
    }

    // Region pages
    for (const region of regions) {
      routes.push({
        url: `${BASE_URL}/${locale}/region/${region}`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 0.7,
      });
    }
  }

  // Root URL
  routes.unshift({
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: 'always',
    priority: 1.0,
  });

  return routes;
}
