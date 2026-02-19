'use client';

import { useEffect, useState, useCallback } from 'react';
import { Newspaper, RefreshCw, ExternalLink, Activity, Globe, AlertTriangle } from 'lucide-react';

interface HeadlineItem {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  published_at: string;
  image_url: string;
  language: string;
  category: string;
  is_breaking: boolean;
}

const categories = [
  { key: 'all', label: 'All', query: 'world news', color: 'bg-dark-400' },
  { key: 'conflict', label: 'Conflict', query: 'war OR conflict OR military', color: 'bg-red-500' },
  { key: 'politics', label: 'Politics', query: 'politics OR election OR government', color: 'bg-blue-500' },
  { key: 'economy', label: 'Economy', query: 'economy OR market OR trade OR inflation', color: 'bg-green-500' },
  { key: 'tech', label: 'Tech', query: 'technology OR AI OR cyber', color: 'bg-cyan-500' },
  { key: 'climate', label: 'Climate', query: 'climate OR earthquake OR disaster OR flood', color: 'bg-yellow-500' },
  { key: 'health', label: 'Health', query: 'health OR pandemic OR WHO', color: 'bg-pink-500' },
];

const categoryDotColor: Record<string, string> = {
  conflict: 'bg-red-500',
  politics: 'bg-blue-500',
  economy: 'bg-green-500',
  tech: 'bg-cyan-500',
  climate: 'bg-yellow-500',
  health: 'bg-pink-500',
  all: 'bg-dark-400',
};

function guessCategoryFromTitle(title: string, source: string): string {
  const t = (title + ' ' + source).toLowerCase();
  if (t.includes('war') || t.includes('conflict') || t.includes('military') || t.includes('attack') || t.includes('bomb') || t.includes('ukraine') || t.includes('gaza')) return 'conflict';
  if (t.includes('election') || t.includes('president') || t.includes('senate') || t.includes('parliament') || t.includes('trump') || t.includes('biden')) return 'politics';
  if (t.includes('market') || t.includes('economy') || t.includes('stock') || t.includes('inflation') || t.includes('trade') || t.includes('gdp') || t.includes('oil')) return 'economy';
  if (t.includes('tech') || t.includes('ai ') || t.includes('artificial intelligence') || t.includes('openai') || t.includes('google') || t.includes('microsoft') || t.includes('cyber')) return 'tech';
  if (t.includes('climate') || t.includes('earthquake') || t.includes('flood') || t.includes('disaster') || t.includes('hurricane') || t.includes('wildfire')) return 'climate';
  if (t.includes('health') || t.includes('vaccine') || t.includes('pandemic') || t.includes('who') || t.includes('covid') || t.includes('disease')) return 'health';
  return 'all';
}

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

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    // Make domain more readable
    const parts = domain.split('.');
    if (parts.length > 2) return parts.slice(-2).join('.');
    return domain;
  } catch {
    return '';
  }
}

export default function LatestHeadlines() {
  const [headlines, setHeadlines] = useState<HeadlineItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [source, setSource] = useState<'gdelt' | 'backend' | 'mock'>('mock');

  const loadHeadlines = useCallback(async () => {
    setIsRefreshing(true);
    const catConfig = categories.find(c => c.key === activeCategory) || categories[0];
    const items: HeadlineItem[] = [];

    // 1. Try GDELT Doc API for real-time news
    try {
      const res = await fetch(`/api/realtime/gdelt-news?query=${encodeURIComponent(catConfig.query)}&maxrecords=40&timespan=24h`);
      if (res.ok) {
        const data = await res.json();
        const articles = data?.articles || [];
        if (articles.length > 0) {
          articles.forEach((a: any, idx: number) => {
            const domain = extractDomain(a.url || '');
            const cat = guessCategoryFromTitle(a.title || '', domain);
            items.push({
              id: `gdelt-${idx}-${a.seendate || Math.random()}`,
              title: a.title || '',
              url: a.url || '#',
              source: a.domain || domain || 'Unknown',
              sourceDomain: domain,
              published_at: a.seendate ? new Date(
                a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')
              ).toISOString() : new Date().toISOString(),
              image_url: a.socialimage || '',
              language: a.language || 'English',
              category: cat,
              is_breaking: idx < 3, // First 3 marked as breaking
            });
          });
          setSource('gdelt');
        }
      }
    } catch {}

    // 2. Also try backend news API
    if (items.length < 5) {
      try {
        const params = new URLSearchParams();
        if (activeCategory !== 'all') params.set('category', activeCategory);
        const res = await fetch(`/api/news?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const backendItems = Array.isArray(data) ? data : data?.articles || data?.items || [];
          backendItems.forEach((a: any) => {
            items.push({
              id: a.id || String(Math.random()),
              title: a.title || '',
              url: a.url || a.source_url || '#',
              source: a.source || a.source_name || '',
              sourceDomain: '',
              published_at: a.published_at || new Date().toISOString(),
              image_url: a.image_url || '',
              language: 'en',
              category: a.category || guessCategoryFromTitle(a.title || '', ''),
              is_breaking: a.is_breaking || false,
            });
          });
          if (items.length > 0 && source !== 'gdelt') setSource('backend');
        }
      } catch {}
    }

    // Deduplicate by title similarity
    const seen = new Set<string>();
    const unique = items.filter(item => {
      const key = item.title.toLowerCase().slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return item.title.length > 10;
    });

    if (unique.length > 0) {
      setHeadlines(unique);
    }
    setLastUpdate(new Date());
    setIsRefreshing(false);
  }, [activeCategory]);

  useEffect(() => {
    loadHeadlines();
    const interval = setInterval(loadHeadlines, 30000); // 30 sec refresh
    return () => clearInterval(interval);
  }, [loadHeadlines]);

  const filtered = activeCategory === 'all'
    ? headlines
    : headlines.filter((h) => h.category === activeCategory);

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Newspaper size={15} className="text-brand-400" />
          <h2 className="text-sm font-bold text-dark-100">Latest Headlines</h2>
          <span className="flex items-center gap-1 bg-green-500/10 rounded px-1.5 py-0.5">
            <Activity size={9} className="text-green-400" />
            <span className="text-2xs text-green-400 font-semibold">LIVE</span>
          </span>
          <span className="text-2xs text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded font-mono">
            {filtered.length} stories
          </span>
          {source !== 'mock' && (
            <span className="text-2xs text-dark-600 hidden sm:inline">
              via {source === 'gdelt' ? 'GDELT' : 'API'}
            </span>
          )}
        </div>
        <button onClick={loadHeadlines} disabled={isRefreshing}
          className="flex items-center gap-1 text-2xs text-dark-500 hover:text-dark-300 transition-colors">
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{formatRelativeTime(lastUpdate.toISOString())}</span>
        </button>
      </div>

      {/* Category Filters */}
      <div className="px-4 py-2 border-b border-dark-700/50 flex items-center gap-1.5 overflow-x-auto scrollbar-hidden">
        {categories.map((cat) => (
          <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-2xs font-medium transition-colors flex-shrink-0 ${
              activeCategory === cat.key ? 'bg-dark-700 text-dark-100' : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800'
            }`}>
            <span className={`w-2 h-2 rounded-full ${cat.color}`} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Headlines List */}
      <div className="max-h-[500px] overflow-y-auto scrollbar-dark">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-dark-500 text-sm">
            {isRefreshing ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw size={18} className="animate-spin" />
                <span>Loading headlines...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Globe size={18} />
                <span>No headlines in this category</span>
              </div>
            )}
          </div>
        ) : (
          filtered.slice(0, 30).map((item, idx) => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
              className="news-item animate-fade-in block hover:bg-dark-800/50 transition-colors"
              style={{ animationDelay: `${idx * 20}ms` }}>
              <div className="flex items-start gap-2">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  categoryDotColor[item.category] || 'bg-dark-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-dark-200 hover:text-brand-400 transition-colors font-medium leading-snug line-clamp-2">
                    {item.title}
                    {item.is_breaking && (
                      <span className="inline-flex ml-1.5 badge-breaking text-2xs px-1 py-0">BREAKING</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xs text-dark-500 font-medium">{item.source}</span>
                    <span className="text-2xs text-dark-600">{formatRelativeTime(item.published_at)}</span>
                    {item.language && item.language !== 'English' && (
                      <span className="text-2xs text-dark-600 bg-dark-800 px-1 rounded">{item.language}</span>
                    )}
                    <ExternalLink size={10} className="text-dark-600" />
                  </div>
                </div>
                {item.image_url && (
                  <div className="flex-shrink-0 hidden sm:block">
                    <img src={item.image_url} alt="" className="w-16 h-12 object-cover rounded"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
