'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  MapPin,
  TrendingUp,
  AlertTriangle,
  Newspaper,
  Activity,
  ChevronRight,
} from 'lucide-react';
import Header from '@/components/Layout/Header';
import BreakingTicker from '@/components/Dashboard/BreakingTicker';
import LatestHeadlines from '@/components/Dashboard/LatestHeadlines';
import EventsTimeline from '@/components/Dashboard/EventsTimeline';
import WorldMap from '@/components/Dashboard/WorldMap';
import { getMockEvents, getMockHeadlines, type EventItem, type NewsItem } from '@/lib/api';

const regionInfo: Record<string, { name: string; description: string; lat: number; lng: number }> = {
  'middle-east': { name: 'Middle East', description: 'Monitoring geopolitical developments, conflicts, and diplomatic activity across the Middle East and North Africa region.', lat: 29, lng: 42 },
  'europe': { name: 'Europe', description: 'Tracking political, economic, and security developments across the European continent.', lat: 50, lng: 10 },
  'asia-pacific': { name: 'Asia Pacific', description: 'Coverage of strategic, economic, and security dynamics in the Asia-Pacific region.', lat: 25, lng: 115 },
  'americas': { name: 'Americas', description: 'Monitoring developments across North, Central, and South America.', lat: 15, lng: -80 },
  'africa': { name: 'Africa', description: 'Tracking political, humanitarian, and economic events across the African continent.', lat: 5, lng: 20 },
  'central-asia': { name: 'Central Asia', description: 'Coverage of developments in the Central Asian republics and surrounding regions.', lat: 42, lng: 65 },
};

export default function RegionPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const region = regionInfo[slug] || {
    name: slug?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Region',
    description: 'Regional monitoring dashboard.',
    lat: 30,
    lng: 20,
  };

  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'news' | 'analysis'>('overview');

  useEffect(() => {
    // In production, fetch region-specific data
    setEvents(getMockEvents());
  }, [slug]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'events', label: 'Events', icon: AlertTriangle },
    { key: 'news', label: 'News', icon: Newspaper },
    { key: 'analysis', label: 'Analysis', icon: TrendingUp },
  ] as const;

  return (
    <div className="min-h-screen bg-dark-900">
      <Header />
      <BreakingTicker />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Region Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-dark-500 mb-2">
            <a href="/" className="hover:text-dark-300">Monitor</a>
            <ChevronRight size={14} />
            <a href="/regions" className="hover:text-dark-300">Regions</a>
            <ChevronRight size={14} />
            <span className="text-dark-300">{region.name}</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="text-brand-400" size={24} />
            <h1 className="text-2xl font-bold text-dark-100">{region.name}</h1>
            <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 rounded px-2 py-0.5">
              <span className="live-dot" style={{ width: 5, height: 5 }} />
              <span className="text-red-400 text-xs font-bold ml-1">MONITORING</span>
            </span>
          </div>
          <p className="text-sm text-dark-400 max-w-2xl">{region.description}</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-dark-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Active Events', value: events.length, color: 'text-brand-400' },
            { label: 'Critical', value: events.filter((e) => e.severity >= 8).length, color: 'text-red-400' },
            { label: 'Developing', value: events.filter((e) => e.is_developing).length, color: 'text-yellow-400' },
            { label: 'Sources', value: 24, color: 'text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className="card p-4">
              <div className="text-2xs text-dark-500 uppercase tracking-wider mb-1">
                {stat.label}
              </div>
              <div className={`text-2xl font-bold font-mono ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <WorldMap />
              <LatestHeadlines />
            </div>
            <div>
              <EventsTimeline />
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="card">
                <div className="card-header">
                  <h2 className="text-sm font-bold text-dark-100">All Events - {region.name}</h2>
                </div>
                <div className="divide-y divide-dark-700/50">
                  {events.map((event) => (
                    <div key={event.id} className="p-4 hover:bg-dark-800/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                          event.severity >= 8 ? 'bg-red-500/10 border-red-500/20' :
                          event.severity >= 6 ? 'bg-yellow-500/10 border-yellow-500/20' :
                          'bg-blue-500/10 border-blue-500/20'
                        }`}>
                          <span className={`text-sm font-bold font-mono ${
                            event.severity >= 8 ? 'text-red-400' :
                            event.severity >= 6 ? 'text-yellow-400' :
                            'text-blue-400'
                          }`}>{event.severity}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`badge ${
                              event.category === 'conflict' ? 'badge-conflict' :
                              event.category === 'diplomacy' ? 'badge-diplomacy' :
                              event.category === 'protests' ? 'badge-protests' :
                              event.category === 'sanctions' ? 'badge-sanctions' :
                              event.category === 'economy' ? 'badge-economy' :
                              event.category === 'internet' ? 'badge-internet' :
                              'bg-dark-700 text-dark-400'
                            }`}>{event.category}</span>
                            {event.is_developing && (
                              <span className="text-2xs text-red-400 font-bold">DEVELOPING</span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-dark-200">{event.title}</h3>
                          {event.description && (
                            <p className="text-xs text-dark-400 mt-1">{event.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-2xs text-dark-500">
                            {event.location?.name && (
                              <span className="flex items-center gap-1">
                                <MapPin size={10} />
                                {event.location.name}
                              </span>
                            )}
                            <span>{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <EventsTimeline />
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <LatestHeadlines />
        )}

        {activeTab === 'analysis' && (
          <div className="card p-8 text-center">
            <TrendingUp size={48} className="mx-auto text-dark-600 mb-4" />
            <h3 className="text-lg font-semibold text-dark-400">AI Analysis Coming Soon</h3>
            <p className="text-sm text-dark-500 mt-2 max-w-md mx-auto">
              Automated geopolitical analysis and trend detection for this region will be available with Premium.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
