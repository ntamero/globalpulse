'use client';

import { useEffect, useState, useMemo } from 'react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import {
  Clock,
  Filter,
  SortAsc,
  SortDesc,
  MapPin,
  AlertTriangle,
  Search,
  ChevronDown,
  X,
} from 'lucide-react';
import Header from '@/components/Layout/Header';
import { getMockEvents, type EventItem } from '@/lib/api';

const categoryOptions = [
  { key: 'all', label: 'All Categories', color: 'bg-dark-400' },
  { key: 'conflict', label: 'Conflict', color: 'bg-red-500' },
  { key: 'diplomacy', label: 'Diplomacy', color: 'bg-blue-500' },
  { key: 'protests', label: 'Protests', color: 'bg-orange-500' },
  { key: 'sanctions', label: 'Sanctions', color: 'bg-purple-500' },
  { key: 'economy', label: 'Economy', color: 'bg-green-500' },
  { key: 'internet', label: 'Internet', color: 'bg-cyan-500' },
  { key: 'military', label: 'Military', color: 'bg-red-600' },
  { key: 'humanitarian', label: 'Humanitarian', color: 'bg-yellow-500' },
];

const regionOptions = [
  'All Regions', 'Middle East', 'Europe', 'Asia Pacific', 'Americas', 'Africa', 'Central Asia',
];

const severityOptions = [
  { key: 'all', label: 'All Severity' },
  { key: '8', label: 'Critical (8+)' },
  { key: '6', label: 'High (6+)' },
  { key: '4', label: 'Medium (4+)' },
];

type SortField = 'timestamp' | 'severity';
type SortDirection = 'asc' | 'desc';

const categoryBadgeClass: Record<string, string> = {
  conflict: 'badge-conflict',
  diplomacy: 'badge-diplomacy',
  protests: 'badge-protests',
  sanctions: 'badge-sanctions',
  economy: 'badge-economy',
  internet: 'badge-internet',
  military: 'badge-military',
  humanitarian: 'badge-humanitarian',
};

function getSeverityColor(severity: number): string {
  if (severity >= 8) return 'text-red-400';
  if (severity >= 6) return 'text-yellow-400';
  if (severity >= 4) return 'text-blue-400';
  return 'text-green-400';
}

function getSeverityBg(severity: number): string {
  if (severity >= 8) return 'bg-red-500/10 border-red-500/20';
  if (severity >= 6) return 'bg-yellow-500/10 border-yellow-500/20';
  if (severity >= 4) return 'bg-blue-500/10 border-blue-500/20';
  return 'bg-green-500/10 border-green-500/20';
}

export default function TimelinePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('All Regions');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events/timeline');
        if (res.ok) {
          const data = await res.json();
          setEvents(data.items || data || []);
          return;
        }
      } catch {
        // fallback
      }
      setEvents(getMockEvents());
    }
    loadEvents();
  }, []);

  const filtered = useMemo(() => {
    let result = [...events];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description?.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category === categoryFilter);
    }

    if (regionFilter !== 'All Regions') {
      result = result.filter((e) => e.location?.country || true);
    }

    if (severityFilter !== 'all') {
      const min = parseInt(severityFilter);
      result = result.filter((e) => e.severity >= min);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'timestamp') {
        cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else {
        cmp = a.severity - b.severity;
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [events, searchQuery, categoryFilter, regionFilter, severityFilter, sortField, sortDirection]);

  const activeFilters = [
    categoryFilter !== 'all' && categoryFilter,
    regionFilter !== 'All Regions' && regionFilter,
    severityFilter !== 'all' && `Severity ${severityFilter}+`,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-dark-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-3">
              <Clock className="text-brand-400" />
              Events Timeline
            </h1>
            <p className="text-sm text-dark-400 mt-1">
              Comprehensive chronological view of global events
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-dark-200 font-mono">{filtered.length}</div>
            <div className="text-2xs text-dark-500">events tracked</div>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div className="card mb-4">
          <div className="p-3 flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex items-center bg-dark-900 border border-dark-600 rounded-lg overflow-hidden flex-1 min-w-[200px]">
              <Search size={14} className="ml-3 text-dark-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="bg-transparent border-none outline-none text-sm text-dark-100 placeholder-dark-500 px-2 py-2 w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mr-2 text-dark-500 hover:text-dark-300">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Toggle Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                showFilters || activeFilters.length > 0
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-dark-800 text-dark-400 border border-dark-700'
              }`}
            >
              <Filter size={14} />
              Filters
              {activeFilters.length > 0 && (
                <span className="bg-brand-500 text-white text-2xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSortField(sortField === 'timestamp' ? 'severity' : 'timestamp')}
                className="px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-xs text-dark-400 hover:text-dark-200 transition-colors"
              >
                Sort: {sortField === 'timestamp' ? 'Time' : 'Severity'}
              </button>
              <button
                onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                className="p-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-400 hover:text-dark-200 transition-colors"
              >
                {sortDirection === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />}
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="px-3 pb-3 pt-1 border-t border-dark-700/50 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
              {/* Category */}
              <div>
                <label className="text-2xs text-dark-500 uppercase tracking-wider mb-1 block">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-xs text-dark-200 outline-none focus:border-brand-500"
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region */}
              <div>
                <label className="text-2xs text-dark-500 uppercase tracking-wider mb-1 block">
                  Region
                </label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-xs text-dark-200 outline-none focus:border-brand-500"
                >
                  {regionOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="text-2xs text-dark-500 uppercase tracking-wider mb-1 block">
                  Minimum Severity
                </label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-xs text-dark-200 outline-none focus:border-brand-500"
                >
                  {severityOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Active Filter Tags */}
          {activeFilters.length > 0 && (
            <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">
              {activeFilters.map((f) => (
                <span key={f as string} className="flex items-center gap-1 bg-brand-500/10 text-brand-400 text-2xs px-2 py-0.5 rounded">
                  {f}
                  <button
                    onClick={() => {
                      if (f === categoryFilter) setCategoryFilter('all');
                      if (f === regionFilter) setRegionFilter('All Regions');
                      if ((f as string).startsWith('Severity')) setSeverityFilter('all');
                    }}
                    className="hover:text-brand-300"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <button
                onClick={() => {
                  setCategoryFilter('all');
                  setRegionFilter('All Regions');
                  setSeverityFilter('all');
                }}
                className="text-2xs text-dark-500 hover:text-dark-300"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Timeline View */}
        <div className="space-y-0">
          {filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <AlertTriangle size={32} className="mx-auto text-dark-600 mb-3" />
              <h3 className="text-lg font-semibold text-dark-400">No events found</h3>
              <p className="text-sm text-dark-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            filtered.map((event, idx) => {
              const isRecent = Date.now() - new Date(event.timestamp).getTime() < 60 * 60 * 1000;

              return (
                <div
                  key={event.id}
                  className="card mb-2 hover:border-dark-600 transition-colors animate-fade-in"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="p-4 flex items-start gap-4">
                    {/* Severity Score */}
                    <div className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center flex-shrink-0 ${getSeverityBg(event.severity)}`}>
                      <span className={`text-lg font-bold font-mono ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                      <span className="text-2xs text-dark-500">/10</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`badge ${categoryBadgeClass[event.category] || 'bg-dark-700 text-dark-400'}`}>
                          {event.category}
                        </span>
                        {event.is_developing && (
                          <span className="flex items-center gap-1 text-2xs text-red-400 font-bold">
                            <span className="live-dot" style={{ width: 5, height: 5 }} />
                            <span className="ml-1">DEVELOPING</span>
                          </span>
                        )}
                        {isRecent && (
                          <span className="text-2xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                            NEW
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-dark-100 mb-1">
                        {event.title}
                      </h3>

                      {event.description && (
                        <p className="text-sm text-dark-400 mb-2">{event.description}</p>
                      )}

                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-dark-500">
                          <Clock size={12} />
                          {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')}
                          <span className="text-dark-600 ml-1">
                            ({formatDistanceToNowStrict(new Date(event.timestamp), { addSuffix: true })})
                          </span>
                        </span>
                        {event.location?.name && (
                          <span className="flex items-center gap-1 text-xs text-dark-500">
                            <MapPin size={12} />
                            {event.location.name}
                            {event.location.country && `, ${event.location.country}`}
                          </span>
                        )}
                        {event.sources.length > 0 && (
                          <span className="text-xs text-dark-500">
                            Sources: {event.sources.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
