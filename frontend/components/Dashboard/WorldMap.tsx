'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Layers, Maximize2 } from 'lucide-react';
import { getMockEvents, type EventItem } from '@/lib/api';

// Dynamically import map to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((mod) => mod.Tooltip),
  { ssr: false }
);

const categoryColors: Record<string, string> = {
  conflict: '#ef4444',
  diplomacy: '#3b82f6',
  protests: '#f97316',
  sanctions: '#a855f7',
  economy: '#22c55e',
  internet: '#06b6d4',
  military: '#dc2626',
  humanitarian: '#f59e0b',
};

function getMarkerRadius(severity: number): number {
  if (severity >= 9) return 12;
  if (severity >= 7) return 10;
  if (severity >= 5) return 8;
  return 6;
}

export default function WorldMap() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Add Leaflet CSS
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    async function loadMapEvents() {
      try {
        const res = await fetch('/api/events/map');
        if (res.ok) {
          const data = await res.json();
          setEvents(data.items || data || []);
          return;
        }
      } catch {
        // fallback
      }
      setEvents(getMockEvents().filter((e) => e.location));
    }
    loadMapEvents();
  }, []);

  const eventsWithLocation = useMemo(
    () => events.filter((e) => e.location),
    [events]
  );

  return (
    <div className={`card ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-brand-400" />
          <h2 className="text-sm font-bold text-dark-100">Global Event Map</h2>
          <span className="text-2xs text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded font-mono">
            {eventsWithLocation.length} events
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-dark-500 hover:text-dark-300 transition-colors">
            <Layers size={14} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-dark-500 hover:text-dark-300 transition-colors"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className={`relative ${isFullscreen ? 'h-[calc(100vh-48px)]' : 'h-[350px] sm:h-[400px]'}`}>
        {isClient ? (
          <MapContainer
            center={[30, 20]}
            zoom={2}
            minZoom={2}
            maxZoom={10}
            style={{ height: '100%', width: '100%', background: '#0f172a' }}
            zoomControl={true}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />

            {eventsWithLocation.map((event) => {
              const color = categoryColors[event.category] || '#6b7280';
              const radius = getMarkerRadius(event.severity);

              return (
                <CircleMarker
                  key={event.id}
                  center={[event.location!.lat, event.location!.lng]}
                  radius={radius}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.4,
                    weight: 2,
                    opacity: 0.8,
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -10]}
                    className="!bg-dark-800 !border-dark-600 !text-dark-200 !rounded-lg !text-xs !shadow-xl"
                  >
                    <div className="font-semibold">{event.title}</div>
                    {event.location?.name && (
                      <div className="text-dark-400 text-2xs mt-0.5">
                        {event.location.name}
                      </div>
                    )}
                  </Tooltip>
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                          {event.category}
                        </span>
                        <span className="text-xs font-mono font-bold text-dark-200 ml-auto">
                          {event.severity}/10
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-dark-100 mb-1">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-xs text-dark-400 mb-2">{event.description}</p>
                      )}
                      {event.location?.name && (
                        <div className="text-2xs text-dark-500">
                          <MapPin size={10} className="inline mr-1" />
                          {event.location.name}
                          {event.location.country && `, ${event.location.country}`}
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="h-full w-full bg-dark-800 flex items-center justify-center">
            <div className="text-dark-500 text-sm">Loading map...</div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-dark-900/90 backdrop-blur-sm border border-dark-700 rounded-lg p-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {Object.entries(categoryColors).map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-2xs text-dark-400 capitalize">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
