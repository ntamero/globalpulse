'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Zap,
  AlertTriangle,
  ExternalLink,
  Rss,
  ChevronDown,
} from 'lucide-react';

interface LiveNewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  category: string;
  published_at: string;
  importance: number;
  isNew?: boolean;
}

const categoryColors: Record<string, string> = {
  conflict: 'border-l-red-500',
  diplomacy: 'border-l-blue-500',
  protests: 'border-l-orange-500',
  sanctions: 'border-l-purple-500',
  economy: 'border-l-green-500',
  internet: 'border-l-cyan-500',
  military: 'border-l-red-600',
  humanitarian: 'border-l-yellow-500',
  general: 'border-l-dark-500',
};

const categoryDots: Record<string, string> = {
  conflict: 'bg-red-500',
  diplomacy: 'bg-blue-500',
  protests: 'bg-orange-500',
  sanctions: 'bg-purple-500',
  economy: 'bg-green-500',
  internet: 'bg-cyan-500',
  military: 'bg-red-600',
  humanitarian: 'bg-yellow-500',
  general: 'bg-dark-500',
};

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function LiveFeed() {
  const [news, setNews] = useState<LiveNewsItem[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string[]>([]);

  const fetchLatestNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news?limit=30');
      if (!res.ok) return;
      const data = await res.json();
      const articles = Array.isArray(data)
        ? data
        : Array.isArray(data?.articles)
        ? data.articles
        : Array.isArray(data?.items)
        ? data.items
        : [];

      if (articles.length === 0) return;

      const normalized: LiveNewsItem[] = articles.map((a: any) => ({
        id: a.id || String(Math.random()),
        title: a.title || '',
        source: a.source || a.source_name || '',
        url: a.url || a.source_url || '#',
        category: a.category || 'general',
        published_at: a.published_at || a.scraped_at || new Date().toISOString(),
        importance: a.importance_score || 5,
        isNew: !lastFetchRef.current.includes(a.id || ''),
      }));

      // Count genuinely new items
      const prevIds = lastFetchRef.current;
      const newItems = normalized.filter((n) => !prevIds.includes(n.id));
      if (newItems.length > 0 && prevIds.length > 0) {
        setNewCount((c) => c + newItems.length);
      }

      lastFetchRef.current = normalized.map((n) => n.id);
      setNews(normalized);

      // Auto-scroll to top for new items
      if (newItems.length > 0 && scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      // keep existing
    }
  }, []);

  useEffect(() => {
    fetchLatestNews();
    // Fetch every 8 seconds for near-real-time feel
    const interval = setInterval(fetchLatestNews, 8000);
    return () => clearInterval(interval);
  }, [fetchLatestNews]);

  // Clear new count when scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollTop < 50) setNewCount(0);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-dark-700/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-red-400" />
          <h2 className="text-xs font-bold text-dark-100">Live News</h2>
          <span className="live-dot" />
          {isLive && (
            <span className="text-2xs text-red-400 font-bold uppercase animate-pulse">
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-dark-500 font-mono">{news.length}</span>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`text-2xs px-1.5 py-0.5 rounded ${
              isLive
                ? 'bg-red-500/20 text-red-400'
                : 'bg-dark-700 text-dark-500'
            }`}
          >
            {isLive ? 'AUTO' : 'PAUSED'}
          </button>
        </div>
      </div>

      {/* New items notification */}
      {newCount > 0 && (
        <button
          onClick={() => {
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            setNewCount(0);
          }}
          className="w-full px-3 py-1.5 bg-brand-500/10 border-b border-brand-500/20 text-brand-400 text-2xs font-medium flex items-center justify-center gap-1 hover:bg-brand-500/20 transition-colors"
        >
          <ChevronDown size={10} className="rotate-180" />
          {newCount} new {newCount === 1 ? 'article' : 'articles'}
        </button>
      )}

      {/* News Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-dark">
        {news.length === 0 ? (
          <div className="p-6 text-center">
            <Rss size={24} className="text-dark-600 mx-auto mb-2" />
            <p className="text-xs text-dark-500">Loading live feed...</p>
          </div>
        ) : (
          news.map((item, idx) => {
            const isHighPriority = item.importance >= 7;
            const isVeryNew =
              Date.now() - new Date(item.published_at).getTime() < 5 * 60 * 1000;

            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block px-3 py-2.5 border-b border-dark-700/30 border-l-2 hover:bg-dark-800/60 transition-all cursor-pointer ${
                  categoryColors[item.category] || 'border-l-dark-600'
                } ${item.isNew ? 'animate-fade-in bg-brand-500/5' : ''} ${
                  isHighPriority && isVeryNew ? 'bg-red-500/5' : ''
                }`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-start gap-2">
                  {/* Priority indicator */}
                  {isHighPriority && isVeryNew && (
                    <AlertTriangle
                      size={12}
                      className="text-red-400 flex-shrink-0 mt-0.5 animate-pulse"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-xs leading-snug line-clamp-2 ${
                        isHighPriority && isVeryNew
                          ? 'text-dark-100 font-bold'
                          : 'text-dark-300 font-medium'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          categoryDots[item.category] || 'bg-dark-500'
                        }`}
                      />
                      <span className="text-2xs text-dark-500 font-medium truncate">
                        {item.source}
                      </span>
                      <span className="text-2xs text-dark-600">·</span>
                      <span className="text-2xs text-dark-600 flex-shrink-0">
                        {formatTime(item.published_at)}
                      </span>
                      {isVeryNew && (
                        <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <ExternalLink
                    size={10}
                    className="text-dark-600 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100"
                  />
                </div>
              </a>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-dark-700/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Rss size={11} className="text-dark-500" />
            <span className="text-2xs text-dark-500">
              200+ sources · Updates every 8s
            </span>
          </div>
          <span className="text-2xs text-green-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Connected
          </span>
        </div>
      </div>
    </div>
  );
}
