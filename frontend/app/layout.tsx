import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GlobalPulse | Real-Time Global Intelligence Monitor',
  description:
    'Real-time global news monitoring, event tracking, and AI-powered intelligence briefings. Track breaking news, geopolitical events, and emerging crises worldwide.',
  keywords: [
    'global news', 'intelligence monitor', 'breaking news', 'geopolitics',
    'event tracking', 'OSINT', 'real-time news', 'world events',
  ],
  authors: [{ name: 'GlobalPulse' }],
  openGraph: {
    title: 'GlobalPulse | Real-Time Global Intelligence Monitor',
    description: 'Real-time global news monitoring and AI-powered intelligence briefings.',
    type: 'website',
    locale: 'en_US',
    siteName: 'GlobalPulse',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GlobalPulse | Real-Time Global Intelligence Monitor',
    description: 'Real-time global news monitoring and AI-powered intelligence briefings.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Analytics placeholder */}
        {process.env.NEXT_PUBLIC_ANALYTICS_ID && (
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_ANALYTICS_ID}`}
          />
        )}
      </head>
      <body className="bg-dark-900 text-dark-100 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
