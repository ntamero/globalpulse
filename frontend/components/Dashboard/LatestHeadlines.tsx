'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Newspaper, RefreshCw, ExternalLink } from 'lucide-react';
import { getMockHeadlines, type NewsItem } from '@/lib/api';

const categories = [
  { key: 'all', label: 'All', color: 'bg-dark-400' },
  { key: 'protests', label: 'Protests', color: 'bg-orange-500' },
  { key: 'sanctions', label: 'Sanctions', color: 'bg-purple-500' },
  { key: 'diplomacy', label: 'Diplomacy', color: 'bg-blue-500' },
  { key: 'conflict', label: 'Conflict', color: 'bg-red-500' },
  { key: 'internet', label: 'Internet', color: 'bg-cyan-500' },
  { key: 'economy', label: 'Economy', color: 'bg-green-500' },
  { key: 'military', label: 'Military', color: 'bg-red-600' },
  { key: 'humanitarian', label: 'Other', color: 'bg-yellow-500' },
];

const categoryDotColor: Record<string, string> = {
  protests: 'bg-orange-500',
  sanctions: 'bg-purple-500',
  diplomacy: 'bg-blue-500',
  conflict: 'bg-red-500',
  internet: 'bg-cyan-500',
  economy: 'bg-green-500',
  military: 'bg-red-600',
  humanitarian: 'bg-yellow-500',
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function LatestHeadlines() {
  const [headlines, setHeadlines] = useState<NewsItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadHeadlines = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') params.set('category', activeCategory);
      const res = await fetch(`/api/news?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHeadlines(data.items || data || []);
        setLastUpdate(new Date());
        setIsRefreshing(false);
        return;
      }
    } catch {
      // fallback
    }
    const mock = getMockHeadlines();
    setHeadlines(
      activeCategory === 'all'
        ? mock
        : mock.filter((h) => h.category === activeCategory)
    );
    setLastUpdate(new Date());
    setIsRefreshing(false);
  }, [activeCategory]);

  useEffect(() => {
    loadHeadlines();
    const interval = setInterval(loadHeadlines, 30000);
    return () => clearInterval(interval);
  }, [loadHeadlines]);

  const filtered =
    activeCategory === 'all'
      ? headlines
      : headlines.filter((h) => h.category === activeCategory);

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Newspaper size={15} className="text-brand-400" />
          <h2 className="text-sm font-bold text-dark-100">Latest Headlines</h2>
          <span className="text-2xs text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded font-mono">
            {filtered.length} stories
          </span>
        </div>
        <button
          onClick={loadHeadlines}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-2xs text-dark-500 hover:text-dark-300 transition-colors"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">
            {formatDistanceToNowStrict(lastUpdate, { addSuffix: true })}
          </span>
        </button>
      </div>

      {/* Category Filters */}
      <div className="px-4 py-2 border-b border-dark-700/50 flex items-center gap-1.5 overflow-x-auto scrollbar-hidden">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-2xs font-medium transition-colors flex-shrink-0 ${
              activeCategory === cat.key
                ? 'bg-dark-700 text-dark-100'
                : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${cat.color}`} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Headlines List */}
      <div className="max-h-[400px] overflow-y-auto scrollbar-dark">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-dark-500 text-sm">
            No headlines in this category
          </div>
        ) : (
          filtered.map((item, idx) => (
            <div
              key={item.id}
              className={`news-item animate-fade-in`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    categoryDotColor[item.category] || 'bg-dark-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <a
                    href={item.url}
                    className="text-sm text-dark-200 hover:text-brand-400 transition-colors font-medium leading-snug line-clamp-2 block"
                  >
                    {item.title}
                    {item.is_breaking && (
                      <span className="inline-flex ml-1.5 badge-breaking text-2xs px-1 py-0">
                        BREAKING
                      </span>
                    )}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xs text-dark-500 font-medium">
                      {item.source}
                    </span>
                    <span className="text-2xs text-dark-600">
                      {formatRelativeTime(item.published_at)}
                    </span>
                    {item.url && item.url !== '#' && (
                      <ExternalLink size={10} className="text-dark-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
