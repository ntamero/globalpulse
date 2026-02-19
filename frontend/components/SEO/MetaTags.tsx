import type { Metadata } from 'next';

interface MetaTagsInput {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'article' | 'website';
  publishedTime?: string;
  section?: string;
  locale?: string;
}

/**
 * Generate metadata object for Next.js pages.
 * Use this in page-level generateMetadata() functions.
 */
export function generatePageMetadata({
  title,
  description,
  image,
  url,
  type = 'website',
  publishedTime,
  section,
  locale = 'en',
}: MetaTagsInput): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://globalpulse.news';
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;
  const imageUrl = image || `${siteUrl}/og-default.png`;

  return {
    title: `${title} | GlobalPulse`,
    description,
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: 'GlobalPulse',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale,
      type: type === 'article' ? 'article' : 'website',
      ...(type === 'article' && publishedTime
        ? {
            publishedTime,
            section: section || 'News',
            authors: ['GlobalPulse'],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      creator: '@globalpulse',
    },
    alternates: {
      canonical: fullUrl,
      languages: {
        'en': `${siteUrl}/en${url || ''}`,
        'tr': `${siteUrl}/tr${url || ''}`,
        'ar': `${siteUrl}/ar${url || ''}`,
        'fr': `${siteUrl}/fr${url || ''}`,
        'de': `${siteUrl}/de${url || ''}`,
        'es': `${siteUrl}/es${url || ''}`,
        'zh': `${siteUrl}/zh${url || ''}`,
        'ru': `${siteUrl}/ru${url || ''}`,
      },
    },
  };
}

/**
 * Inline meta tags component for client-side rendering.
 * Use this when you need meta tags in client components.
 */
export default function MetaTags({
  title,
  description,
  image,
  url,
  type = 'website',
}: MetaTagsInput) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://globalpulse.news';
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;
  const imageUrl = image || `${siteUrl}/og-default.png`;

  return (
    <>
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="GlobalPulse" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:creator" content="@globalpulse" />
    </>
  );
}
