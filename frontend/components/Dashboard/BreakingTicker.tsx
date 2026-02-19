'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { getMockBreakingNews, type NewsItem } from '@/lib/api';

export default function BreakingTicker() {
  const [headlines, setHeadlines] = useState<NewsItem[]>([]);

  useEffect(() => {
    async function loadBreaking() {
      try {
        const res = await fetch('/api/news/breaking');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data)
            ? data
            : Array.isArray(data?.articles)
            ? data.articles
            : Array.isArray(data?.items)
            ? data.items
            : [];
          if (items.length > 0) {
            const normalized = items.map((a: any) => ({
              id: a.id || String(Math.random()),
              title: a.title || '',
              source: a.source || a.source_name || '',
              url: a.url || a.source_url || '#',
              category: a.category || 'general',
              published_at: a.published_at || new Date().toISOString(),
              is_breaking: true,
            }));
            setHeadlines(normalized);
            return;
          }
        }
      } catch {
        // fallback to mock
      }
      setHeadlines(getMockBreakingNews());
    }
    loadBreaking();
    const interval = setInterval(loadBreaking, 15000);
    return () => clearInterval(interval);
  }, []);

  if (headlines.length === 0) return null;

  // Double the headlines for seamless looping
  const tickerItems = [...headlines, ...headlines];

  return (
    <div className="bg-red-950/40 border-b border-red-900/50 relative overflow-hidden h-8 flex items-center">
      {/* Breaking Label */}
      <div className="flex-shrink-0 flex items-center gap-1.5 bg-red-600 px-3 h-full z-10 shadow-lg shadow-red-600/20">
        <AlertTriangle size={13} className="text-white" />
        <span className="text-white text-xs font-bold uppercase tracking-wider">Breaking</span>
      </div>

      {/* Scrolling Ticker */}
      <div className="ticker-wrapper flex-1 h-full flex items-center ml-3">
        <div className="ticker-content">
          {tickerItems.map((item, idx) => (
            <span key={`${item.id}-${idx}`} className="inline-flex items-center mr-8">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-pulse-live" />
              <a
                href={item.url}
                className="text-xs text-dark-200 hover:text-white transition-colors font-medium"
              >
                {item.title}
              </a>
              <span className="text-2xs text-dark-500 ml-2 font-mono">
                {item.source}
              </span>
              <span className="text-2xs text-dark-600 ml-1.5">
                {formatDistanceToNowStrict(new Date(item.published_at), { addSuffix: false })}
              </span>
              <span className="text-dark-700 mx-4">|</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
