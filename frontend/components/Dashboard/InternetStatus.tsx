'use client';

import { useState, useEffect, useCallback } from 'react';
import { Globe, RefreshCw, Activity } from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  description: string;
}

interface ServiceData {
  summary: { operational: number; degraded: number; outage: number; unknown: number };
  services: ServiceItem[];
  timestamp: string;
}

const statusDots: Record<string, string> = {
  operational: 'bg-green-500',
  degraded: 'bg-yellow-500 animate-pulse',
  outage: 'bg-red-500 animate-pulse',
  unknown: 'bg-dark-500',
};

const statusColors: Record<string, string> = {
  operational: 'text-green-400',
  degraded: 'text-yellow-400',
  outage: 'text-red-400',
  unknown: 'text-dark-400',
};

const categoryLabels: Record<string, string> = {
  cloud: 'Cloud',
  dev: 'Dev',
  comm: 'Comm',
  ai: 'AI',
  saas: 'SaaS',
};

export default function InternetStatus() {
  const [data, setData] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/realtime/services?category=all');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch { /* keep existing */ }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Every 1 min
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const summary = data?.summary || { operational: 0, degraded: 0, outage: 0, unknown: 0 };
  const services = data?.services || [];
  const total = summary.operational + summary.degraded + summary.outage + summary.unknown;

  const overallStatus = summary.outage > 0
    ? 'outage'
    : summary.degraded > 0
    ? 'degraded'
    : 'operational';

  // Show only non-operational + a few operational
  const issues = services.filter(s => s.status !== 'operational');
  const operational = services.filter(s => s.status === 'operational').slice(0, 4);
  const displayServices = [...issues, ...operational].slice(0, 6);

  return (
    <div className="card h-full">
      <div className="card-header py-2">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-brand-400" />
          <h2 className="text-xs font-bold text-dark-100">Service Health</h2>
          <span className="flex items-center gap-1 bg-green-500/10 rounded px-1.5 py-0.5">
            <Activity size={9} className="text-green-400" />
            <span className="text-2xs text-green-400 font-semibold">LIVE</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded ${
            overallStatus === 'operational' ? 'bg-green-500/10' : overallStatus === 'degraded' ? 'bg-yellow-500/10' : 'bg-red-500/10'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDots[overallStatus]}`} />
            <span className={`text-2xs font-semibold capitalize ${statusColors[overallStatus]}`}>
              {overallStatus === 'operational' ? `${summary.operational}/${total} OK` : overallStatus}
            </span>
          </div>
          <button onClick={fetchStatus} className="text-dark-500 hover:text-dark-300 transition-colors">
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div className="px-3 py-1.5 space-y-1">
        {displayServices.length === 0 && isLoading && (
          <div className="py-2 text-center">
            <RefreshCw size={14} className="animate-spin text-dark-500 mx-auto" />
          </div>
        )}
        {displayServices.map((svc) => (
          <div key={svc.id} className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDots[svc.status]}`} />
              <span className="text-xs text-dark-300">{svc.name}</span>
              <span className="text-2xs text-dark-600">{categoryLabels[svc.category] || svc.category}</span>
            </div>
            <span className={`text-2xs ${statusColors[svc.status]}`}>
              {svc.status === 'operational' ? 'OK' : svc.description?.slice(0, 20) || svc.status}
            </span>
          </div>
        ))}
        {issues.length === 0 && services.length > 0 && (
          <div className="text-center py-0.5">
            <span className="text-2xs text-green-500">All {total} services operational</span>
          </div>
        )}
      </div>
    </div>
  );
}
