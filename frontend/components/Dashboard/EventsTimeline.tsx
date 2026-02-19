'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Clock, Filter, AlertTriangle, TrendingUp } from 'lucide-react';
import { getMockEvents, type EventItem } from '@/lib/api';

const timeFilters = [
  { key: 'all', label: 'All' },
  { key: '0', label: 'Today' },
  { key: '1', label: '1d ago' },
  { key: '2', label: '2d ago' },
  { key: '3', label: '3d ago' },
];

const categoryFilters = [
  { key: 'all', label: 'All', color: 'bg-dark-400' },
  { key: 'conflict', label: 'Conflict', color: 'bg-red-500' },
  { key: 'diplomacy', label: 'Diplomacy', color: 'bg-blue-500' },
  { key: 'protests', label: 'Protests', color: 'bg-orange-500' },
  { key: 'sanctions', label: 'Sanctions', color: 'bg-purple-500' },
  { key: 'economy', label: 'Economy', color: 'bg-green-500' },
  { key: 'internet', label: 'Internet', color: 'bg-cyan-500' },
];

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

export default function EventsTimeline() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    // Start with mock data so UI renders immediately
    setEvents(getMockEvents());

    async function loadEvents() {
      try {
        const res = await fetch('/api/events/timeline');
        if (res.ok) {
          const data = await res.json();
          // Backend returns {timeline: {hour: [events]}} or {items: [...]} or {events: [...]}
          let items: any[] = [];
          if (Array.isArray(data)) {
            items = data;
          } else if (Array.isArray(data?.items)) {
            items = data.items;
          } else if (Array.isArray(data?.events)) {
            items = data.events;
          } else if (data?.timeline && typeof data.timeline === 'object') {
            // Flatten timeline grouped events into a flat array
            Object.values(data.timeline).forEach((group: any) => {
              if (Array.isArray(group)) {
                items.push(...group);
              }
            });
          }
          if (items.length > 0) {
            // Normalize backend event format to EventItem format
            const normalized = items.map((e: any) => ({
              id: e.id || e.event_id || String(Math.random()),
              title: e.title || '',
              description: e.description || '',
              category: e.category || 'general',
              severity: e.severity || 5,
              timestamp: e.timestamp || new Date().toISOString(),
              location: e.location || (e.latitude && e.longitude ? {
                lat: e.latitude,
                lng: e.longitude,
                name: e.city || e.country || '',
                country: e.country || '',
              } : undefined),
              sources: e.sources || [],
              is_developing: e.is_developing || false,
            }));
            setEvents(normalized);
          }
        }
      } catch {
        // keep mock data
      }
    }
    loadEvents();
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = events.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (timeFilter !== 'all') {
      const daysAgo = parseInt(timeFilter);
      try {
        const eventDate = new Date(e.timestamp);
        if (isNaN(eventDate.getTime())) return true;
        const diffDays = Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo === 0 && diffDays > 0) return false;
        if (daysAgo > 0 && diffDays !== daysAgo) return false;
      } catch { /* pass */ }
    }
    return true;
  });

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-dark-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-brand-400" />
          <h2 className="text-xs font-bold text-dark-100">Events Timeline</h2>
          <span className="text-2xs text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded font-mono">
            {filtered.length}
          </span>
        </div>
        <Filter size={13} className="text-dark-500" />
      </div>

      {/* Time Filters */}
      <div className="px-3 py-1.5 border-b border-dark-700/30 flex items-center gap-1 overflow-x-auto scrollbar-hidden">
        {timeFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setTimeFilter(f.key)}
            className={`px-2 py-0.5 rounded text-2xs font-medium transition-colors flex-shrink-0 ${
              timeFilter === f.key
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-dark-500 hover:text-dark-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Category Filters */}
      <div className="px-3 py-1.5 border-b border-dark-700/30 flex items-center gap-1 overflow-x-auto scrollbar-hidden">
        {categoryFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setCategoryFilter(f.key)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs transition-colors flex-shrink-0 ${
              categoryFilter === f.key
                ? 'bg-dark-700 text-dark-200'
                : 'text-dark-500 hover:text-dark-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${f.color}`} />
            {f.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto scrollbar-dark max-h-[50vh]">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-dark-500 text-xs">No events match filters</div>
        ) : (
          <div className="py-1">
            {filtered.map((event, idx) => {
              const isRecent = (() => { try { const t = new Date(event.timestamp).getTime(); return !isNaN(t) && Date.now() - t < 30 * 60 * 1000; } catch { return false; } })();

              return (
                <div
                  key={event.id}
                  className={`px-3 py-2.5 border-b border-dark-700/30 hover:bg-dark-800/50 transition-colors cursor-pointer animate-fade-in ${
                    isRecent ? 'bg-brand-500/5' : ''
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-2">
                    {/* Severity */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded border flex items-center justify-center ${getSeverityBg(
                        event.severity
                      )}`}
                    >
                      <span
                        className={`text-xs font-bold font-mono ${getSeverityColor(
                          event.severity
                        )}`}
                      >
                        {event.severity}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`badge text-2xs ${
                            categoryBadgeClass[event.category] || 'bg-dark-700 text-dark-400'
                          }`}
                        >
                          {event.category}
                        </span>
                        {event.is_developing && (
                          <span className="flex items-center gap-0.5 text-2xs text-red-400">
                            <span className="live-dot" style={{ width: 5, height: 5 }} />
                            <span className="ml-1 font-medium">DEVELOPING</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-semibold text-dark-200 leading-snug line-clamp-2">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-2xs text-dark-500 mt-0.5 line-clamp-1">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xs text-dark-500" suppressHydrationWarning>
                          {(() => { try { const d = new Date(event.timestamp); return isNaN(d.getTime()) ? '' : formatDistanceToNowStrict(d, { addSuffix: true }); } catch { return ''; } })()}
                        </span>
                        {isRecent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
