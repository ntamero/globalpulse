'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Layers, Maximize2, Flame, Crosshair, CloudRain, Activity, RefreshCw } from 'lucide-react';
import { getMockEvents, type EventItem } from '@/lib/api';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((mod) => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then((mod) => mod.Tooltip), { ssr: false });

interface FirePoint { lat: number; lon: number; brightness: number; confidence: number; frp: number; acq_date: string; region: string; }
interface ACLEDEvent { event_id: string; event_date: string; event_type: string; sub_event_type: string; actor1: string; country: string; location: string; latitude: number; longitude: number; fatalities: number; notes: string; }
interface ClimateAnomaly { zone: string; lat: number; lon: number; tempDelta: number; precipDelta: number; severity: string; type: string; }

const categoryColors: Record<string, string> = {
  conflict: '#ef4444', diplomacy: '#3b82f6', protests: '#f97316', sanctions: '#a855f7',
  economy: '#22c55e', internet: '#06b6d4', military: '#dc2626', humanitarian: '#f59e0b',
};

interface DataLayer { id: string; label: string; icon: string; enabled: boolean; }

const DEFAULT_LAYERS: DataLayer[] = [
  { id: 'events', label: 'Events', icon: '📰', enabled: true },
  { id: 'earthquakes', label: 'Earthquakes', icon: '🌍', enabled: true },
  { id: 'fires', label: 'Fires', icon: '🔥', enabled: true },
  { id: 'conflicts', label: 'Conflicts', icon: '⚔️', enabled: true },
  { id: 'protests', label: 'Protests', icon: '✊', enabled: true },
  { id: 'outages', label: 'Outages', icon: '📡', enabled: true },
  { id: 'climate', label: 'Climate', icon: '🌡️', enabled: true },
];

function guessCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('conflict') || t.includes('attack') || t.includes('military') || t.includes('war') || t.includes('bomb')) return 'conflict';
  if (t.includes('protest') || t.includes('rally') || t.includes('demonstrat')) return 'protests';
  if (t.includes('sanction') || t.includes('embargo')) return 'sanctions';
  if (t.includes('diplomat') || t.includes('summit') || t.includes('treaty')) return 'diplomacy';
  if (t.includes('economy') || t.includes('market') || t.includes('trade')) return 'economy';
  if (t.includes('earthquake') || t.includes('flood') || t.includes('humanitarian')) return 'humanitarian';
  if (t.includes('cyber') || t.includes('internet') || t.includes('outage')) return 'internet';
  return 'military';
}

function getMarkerRadius(severity: number): number {
  if (severity >= 9) return 12;
  if (severity >= 7) return 10;
  if (severity >= 5) return 8;
  return 6;
}

export default function WorldMap() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [firePoints, setFirePoints] = useState<FirePoint[]>([]);
  const [acledEvents, setAcledEvents] = useState<ACLEDEvent[]>([]);
  const [acledProtests, setAcledProtests] = useState<ACLEDEvent[]>([]);
  const [climateData, setClimateData] = useState<ClimateAnomaly[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layers, setLayers] = useState<DataLayer[]>(DEFAULT_LAYERS);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ events: 0, earthquakes: 0, fires: 0, conflicts: 0, protests: 0, outages: 0, climate: 0 });

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  const toggleLayer = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l));
  }, []);

  const isLayerEnabled = useCallback((id: string) => {
    return layers.find(l => l.id === id)?.enabled ?? false;
  }, [layers]);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    const newStats = { events: 0, earthquakes: 0, fires: 0, conflicts: 0, protests: 0, outages: 0, climate: 0 };
    const allEvents: EventItem[] = [];

    // 1. GDELT geo events
    try {
      const res = await fetch('/api/realtime/gdelt?query=crisis+OR+conflict+OR+protest&maxrecords=200&timespan=7d');
      if (res.ok) {
        const geo = await res.json();
        (geo?.features || []).forEach((f: any) => {
          const coords = f.geometry?.coordinates;
          const props = f.properties || {};
          if (coords?.length >= 2) {
            allEvents.push({
              id: `gdelt-${props.urlpubtimedate || Math.random()}`,
              title: props.name || 'GDELT Event',
              description: (props.html || '').slice(0, 200),
              category: guessCategory(props.name || ''),
              severity: Math.min(10, Math.max(3, Math.abs(props.goldsteinscale || 5))),
              timestamp: props.urlpubtimedate || new Date().toISOString(),
              sources: [props.domain || 'GDELT'],
              is_developing: false,
              location: { lat: coords[1], lng: coords[0], name: props.name || '', country: '' },
            });
          }
        });
      }
    } catch {}

    // 2. USGS earthquakes
    try {
      const res = await fetch('/api/realtime/earthquakes');
      if (res.ok) {
        const data = await res.json();
        (data?.features || []).forEach((f: any) => {
          const coords = f.geometry?.coordinates;
          const props = f.properties || {};
          if (coords?.length >= 2) {
            allEvents.push({
              id: `eq-${f.id || Math.random()}`,
              title: `Earthquake M${props.mag?.toFixed(1)} - ${props.place || 'Unknown'}`,
              description: `Magnitude ${props.mag?.toFixed(1)}, Depth: ${coords[2]?.toFixed(0)}km`,
              category: 'humanitarian',
              severity: Math.min(10, Math.round((props.mag || 4) * 1.2)),
              timestamp: props.time ? new Date(props.time).toISOString() : new Date().toISOString(),
              sources: ['USGS'],
              is_developing: true,
              location: { lat: coords[1], lng: coords[0], name: props.place || '', country: '' },
            });
            newStats.earthquakes++;
          }
        });
      }
    } catch {}

    newStats.events = allEvents.length - newStats.earthquakes;
    if (allEvents.length > 0) setEvents(allEvents);
    else setEvents(getMockEvents());

    // 3. NASA FIRMS fires
    try {
      const res = await fetch('/api/realtime/fires?days=1');
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.regions) {
          const points: FirePoint[] = [];
          Object.entries(data.regions).forEach(([region, fires]: [string, any]) => {
            (fires || []).forEach((f: any) => {
              if (f.lat && f.lon) points.push({ ...f, region });
            });
          });
          setFirePoints(points);
          newStats.fires = points.length;
        }
      }
    } catch {}

    // 4. ACLED conflicts
    try {
      const res = await fetch('/api/realtime/acled?days=30&limit=500');
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.data) { setAcledEvents(data.data); newStats.conflicts = data.data.length; }
      }
    } catch {}

    // 5. ACLED protests
    try {
      const res = await fetch('/api/realtime/acled-protests?days=30&limit=500');
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.data) { setAcledProtests(data.data); newStats.protests = data.data.length; }
      }
    } catch {}

    // 6. Climate anomalies
    try {
      const res = await fetch('/api/realtime/climate');
      if (res.ok) {
        const data = await res.json();
        if (data.anomalies) { setClimateData(data.anomalies); newStats.climate = data.anomalies.length; }
      }
    } catch {}

    setStats(newStats);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 120000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  const eventsWithLocation = useMemo(() => events.filter((e) => e.location), [events]);

  const totalMarkers = useMemo(() => {
    let c = 0;
    if (isLayerEnabled('events')) c += eventsWithLocation.filter(e => !e.id.startsWith('eq-')).length;
    if (isLayerEnabled('earthquakes')) c += eventsWithLocation.filter(e => e.id.startsWith('eq-')).length;
    if (isLayerEnabled('fires')) c += firePoints.length;
    if (isLayerEnabled('conflicts')) c += acledEvents.length;
    if (isLayerEnabled('protests')) c += acledProtests.length;
    if (isLayerEnabled('climate')) c += climateData.length;
    return c;
  }, [eventsWithLocation, firePoints, acledEvents, acledProtests, climateData, isLayerEnabled]);

  return (
    <div className={`card ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className="card-header">
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-brand-400" />
          <h2 className="text-sm font-bold text-dark-100">Global Intelligence Map</h2>
          <span className="flex items-center gap-1 bg-green-500/10 rounded px-1.5 py-0.5">
            <Activity size={9} className="text-green-400" />
            <span className="text-2xs text-green-400 font-semibold">LIVE</span>
          </span>
          <span className="text-2xs text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded font-mono">{totalMarkers} pts</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`flex items-center gap-1 text-2xs px-2 py-1 rounded transition-colors ${showLayerPanel ? 'bg-brand-500/20 text-brand-400' : 'text-dark-500 hover:text-dark-300 hover:bg-dark-700'}`}>
            <Layers size={12} /><span className="hidden sm:inline">Layers</span>
          </button>
          <button onClick={loadAllData} className="text-dark-500 hover:text-dark-300 transition-colors" disabled={isLoading}>
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-dark-500 hover:text-dark-300 transition-colors">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {showLayerPanel && (
        <div className="px-3 py-2 border-b border-dark-700/50 bg-dark-800/50">
          <div className="flex flex-wrap gap-1.5">
            {layers.map(layer => (
              <button key={layer.id} onClick={() => toggleLayer(layer.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-2xs font-medium transition-all ${layer.enabled ? 'bg-dark-700 text-dark-100 ring-1 ring-dark-600' : 'bg-dark-800 text-dark-500 hover:text-dark-400'}`}>
                <span>{layer.icon}</span><span>{layer.label}</span>
                {layer.enabled && <span className="text-dark-400 font-mono">
                  {layer.id === 'events' ? stats.events : layer.id === 'earthquakes' ? stats.earthquakes : layer.id === 'fires' ? stats.fires : layer.id === 'conflicts' ? stats.conflicts : layer.id === 'protests' ? stats.protests : layer.id === 'outages' ? stats.outages : layer.id === 'climate' ? stats.climate : 0}
                </span>}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-dark-700/30">
            <span className="text-2xs text-dark-600">APIs:</span>
            <span className="text-2xs text-dark-500">GDELT</span>
            <span className="text-2xs text-dark-500">USGS</span>
            {stats.fires > 0 ? <span className="text-2xs text-orange-400">NASA FIRMS ✓</span> : <span className="text-2xs text-dark-600">FIRMS (need key)</span>}
            {stats.conflicts > 0 ? <span className="text-2xs text-red-400">ACLED ✓</span> : <span className="text-2xs text-dark-600">ACLED (need key)</span>}
            {stats.outages > 0 ? <span className="text-2xs text-purple-400">Cloudflare ✓</span> : <span className="text-2xs text-dark-600">CF Radar (need key)</span>}
            <span className="text-2xs text-green-500">Open-Meteo ✓</span>
          </div>
        </div>
      )}

      <div className={`relative ${isFullscreen ? 'h-[calc(100vh-48px)]' : 'h-[350px] sm:h-[450px]'}`}>
        {isClient ? (
          <MapContainer center={[30, 20]} zoom={2} minZoom={2} maxZoom={12}
            style={{ height: '100%', width: '100%', background: '#0f172a' }}
            zoomControl={true} attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OSM' />

            {/* Events (non-earthquake) */}
            {isLayerEnabled('events') && eventsWithLocation.filter(e => !e.id.startsWith('eq-')).map((event) => {
              const color = categoryColors[event.category] || '#6b7280';
              return (
                <CircleMarker key={event.id} center={[event.location!.lat, event.location!.lng]}
                  radius={getMarkerRadius(event.severity)}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.4, weight: 2, opacity: 0.8 }}>
                  <Tooltip direction="top" offset={[0, -10]} className="!bg-dark-800 !border-dark-600 !text-dark-200 !rounded-lg !text-xs !shadow-xl">
                    <div className="font-semibold">{event.title}</div>
                  </Tooltip>
                  <Popup><div className="min-w-[200px]">
                    <span className="text-xs font-bold uppercase" style={{ color }}>{event.category}</span>
                    <span className="text-xs font-mono ml-2">{event.severity}/10</span>
                    <h3 className="text-sm font-semibold text-dark-100 mt-1">{event.title}</h3>
                    {event.description && <p className="text-xs text-dark-400 mt-1">{event.description}</p>}
                  </div></Popup>
                </CircleMarker>
              );
            })}

            {/* Earthquakes */}
            {isLayerEnabled('earthquakes') && eventsWithLocation.filter(e => e.id.startsWith('eq-')).map((event) => (
              <CircleMarker key={event.id} center={[event.location!.lat, event.location!.lng]}
                radius={getMarkerRadius(event.severity)}
                pathOptions={{ color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.5, weight: 2, opacity: 0.9 }}>
                <Tooltip direction="top" offset={[0, -10]} className="!bg-dark-800 !border-dark-600 !text-dark-200 !rounded-lg !text-xs !shadow-xl">
                  <div className="font-semibold">{event.title}</div>
                  <div className="text-red-400 text-2xs">{event.description}</div>
                </Tooltip>
                <Popup><div className="min-w-[200px]">
                  <span className="text-xs font-bold text-red-400">🌍 EARTHQUAKE</span>
                  <h3 className="text-sm font-semibold text-dark-100 mt-1">{event.title}</h3>
                  <p className="text-xs text-dark-400 mt-1">{event.description}</p>
                </div></Popup>
              </CircleMarker>
            ))}

            {/* NASA FIRMS Fires */}
            {isLayerEnabled('fires') && firePoints.map((fire, i) => (
              <CircleMarker key={`fire-${i}`} center={[fire.lat, fire.lon]}
                radius={Math.max(3, Math.min(8, fire.confidence / 15))}
                pathOptions={{ color: '#ff6b00', fillColor: fire.confidence > 80 ? '#ff0000' : '#ff6b00', fillOpacity: 0.6, weight: 1, opacity: 0.8 }}>
                <Tooltip direction="top" offset={[0, -8]} className="!bg-dark-800 !border-dark-600 !text-dark-200 !rounded-lg !text-xs !shadow-xl">
                  <div className="font-semibold">🔥 Fire - {fire.region}</div>
                  <div className="text-orange-400 text-2xs">Conf: {fire.confidence}% | FRP: {fire.frp?.toFixed(1)} MW</div>
                </Tooltip>
                <Popup><div className="min-w-[180px]">
                  <div className="flex items-center gap-2 mb-1"><Flame size={14} className="text-orange-500" /><span className="text-xs font-bold text-orange-400">SATELLITE FIRE</span></div>
                  <div className="text-xs text-dark-300 space-y-0.5">
                    <div>Region: <strong>{fire.region}</strong></div>
                    <div>Confidence: <strong>{fire.confidence}%</strong></div>
                    <div>Brightness: {fire.brightness?.toFixed(1)}K | FRP: {fire.frp?.toFixed(1)} MW</div>
                    <div>Date: {fire.acq_date}</div>
                    <div className="text-2xs text-dark-500 mt-1">Source: NASA FIRMS VIIRS</div>
                  </div>
                </div></Popup>
              </CircleMarker>
            ))}

            {/* ACLED Conflicts */}
            {isLayerEnabled('conflicts') && acledEvents.map((evt, i) => (
              <CircleMarker key={`ac-${evt.event_id || i}`} center={[evt.latitude, evt.longitude]}
                radius={Math.max(4, Math.min(10, (evt.fatalities || 0) + 4))}
                pathOptions={{ color: '#dc2626', fillColor: evt.fatalities > 5 ? '#7f1d1d' : '#dc2626', fillOpacity: 0.5, weight: 1.5, opacity: 0.8 }}>
                <Tooltip direction="top" offset={[0, -8]} className="!bg-dark-800 !border-dark-600 !text-dark-200 !rounded-lg !text-xs !shadow-xl">
                  <div className="font-semibold">⚔️ {evt.event_type}</div>
                  <div className="text-red-400 text-2xs">{evt.location}, {evt.country}</div>
                  {evt.fatalities > 0 && <div className="text-red-500 text-2xs">{evt.fatalities} fatalities</div>}
                </Tooltip>
                <Popup><div className="min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1"><Crosshair size={14} className="text-red-500" /><span className="text-xs font-bold text-red-400">{evt.event_type}</span></div>
                  <div className="text-xs text-dark-300 space-y-0.5">
                    <div><strong>{evt.sub_event_type}</strong></div>
                    <div>{evt.location}, {evt.country} — {evt.event_date}</div>
                    {evt.actor1 && <div>Actor: {evt.actor1}</div>}
                    {evt.fatalities > 0 && <div className="text-red-400">Fatalities: {evt.fatalities}</div>}
                    {evt.notes && <div className="text-2xs text-dark-400 mt-1 line-clamp-3">{evt.notes}</div>}
                    <div className="text-2xs text-dark-500 mt-1">Source: ACLED</div>
                  </div>
                </div></Popup>
              </CircleMarker>
            ))}

            {/* ACLED Protests */}
            {isLayerEnabled('protests') && acledProtests.map((evt, i) => (
              <CircleMarker key={`ap-${evt.event_id || i}`} center={[evt.latitude, evt.longitude]}
                radius={5}
                pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.4, weight: 1.5, opacity: 0.7 }}>
                <Tooltip direction="top" offset={[0, -8]} className="!bg-dark-800 !border-dark-600 !text-dark-200 !rounded-lg !text-xs !shadow-xl">
                  <div className="font-semibold">✊ Protest — {evt.location}, {evt.country}</div>
                </Tooltip>
                <Popup><div className="min-w-[180px]">
                  <span className="text-xs font-bold text-orange-400">✊ PROTEST</span>
                  <div className="text-xs text-dark-300 mt-1 space-y-0.5">
                    <div><strong>{evt.sub_event_type}</strong></div>
                    <div>{evt.location}, {evt.country} — {evt.event_date}</div>
                    {evt.actor1 && <div>Actor: {evt.actor1}</div>}
                    {evt.notes && <div className="text-2xs text-dark-400 mt-1 line-clamp-3">{evt.notes}</div>}
                  </div>
                </div></Popup>
              </CircleMarker>
            ))}

            {/* Climate Anomalies */}
            {isLayerEnabled('climate') && climateData.map((a, i) => {
              const isEx = a.severity === 'extreme';
              const isMod = a.severity === 'moderate';
              const color = isEx ? '#ef4444' : isMod ? '#f59e0b' : '#10b981';
              return (
                <CircleMarker key={`cl-${i}`} center={[a.lat, a.lon]}
                  radius={isEx ? 15 : isMod ? 12 : 8}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 2, opacity: isEx ? 0.8 : 0.5, dashArray: '4 4' }}>
                  <Tooltip direction="top" offset={[0, -10]} className="!bg-dark-800 !border-dark-600 !text-dark-200 !rounded-lg !text-xs !shadow-xl">
                    <div className="font-semibold">🌡️ {a.zone}</div>
                    <div className="text-2xs" style={{ color }}>{a.tempDelta > 0 ? '+' : ''}{a.tempDelta}°C | {a.severity}</div>
                  </Tooltip>
                  <Popup><div className="min-w-[180px]">
                    <div className="flex items-center gap-2 mb-1"><CloudRain size={14} style={{ color }} /><span className="text-xs font-bold" style={{ color }}>CLIMATE {a.severity.toUpperCase()}</span></div>
                    <div className="text-xs text-dark-300 space-y-0.5">
                      <div>Zone: <strong>{a.zone}</strong></div>
                      <div>Temp Δ: <strong style={{ color: a.tempDelta > 0 ? '#ef4444' : '#3b82f6' }}>{a.tempDelta > 0 ? '+' : ''}{a.tempDelta}°C</strong></div>
                      <div>Precip Δ: <strong>{a.precipDelta > 0 ? '+' : ''}{a.precipDelta}mm</strong></div>
                      <div className="text-2xs text-dark-500 mt-1">Source: Open-Meteo</div>
                    </div>
                  </div></Popup>
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
            {isLayerEnabled('events') && <><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-2xs text-dark-400">Conflict</span></div><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-2xs text-dark-400">Diplomacy</span></div></>}
            {isLayerEnabled('earthquakes') && stats.earthquakes > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-600" /><span className="text-2xs text-dark-400">Quake ({stats.earthquakes})</span></div>}
            {isLayerEnabled('fires') && stats.fires > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-2xs text-dark-400">Fire ({stats.fires})</span></div>}
            {isLayerEnabled('conflicts') && stats.conflicts > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-700" /><span className="text-2xs text-dark-400">Battle ({stats.conflicts})</span></div>}
            {isLayerEnabled('protests') && stats.protests > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-2xs text-dark-400">Protest ({stats.protests})</span></div>}
            {isLayerEnabled('climate') && stats.climate > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-2xs text-dark-400">Climate ({stats.climate})</span></div>}
          </div>
        </div>

        {isLoading && (
          <div className="absolute top-3 right-3 z-[1000] bg-dark-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
            <RefreshCw size={12} className="text-brand-400 animate-spin" /><span className="text-2xs text-dark-300">Loading layers...</span>
          </div>
        )}
      </div>
    </div>
  );
}
