'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Shield, AlertTriangle, Globe } from 'lucide-react';

interface StatusItem {
  label: string;
  status: 'operational' | 'degraded' | 'outage';
  detail: string;
}

const statusColors: Record<string, string> = {
  operational: 'text-green-400 bg-green-500/10',
  degraded: 'text-yellow-400 bg-yellow-500/10',
  outage: 'text-red-400 bg-red-500/10',
};

const statusDots: Record<string, string> = {
  operational: 'bg-green-500',
  degraded: 'bg-yellow-500',
  outage: 'bg-red-500 animate-pulse',
};

export default function InternetStatus() {
  const [statuses, setStatuses] = useState<StatusItem[]>([
    { label: 'Cloudflare', status: 'operational', detail: 'All systems normal' },
    { label: 'OONI Blocks', status: 'degraded', detail: '23 countries affected' },
    { label: 'BGP Alerts', status: 'operational', detail: 'No anomalies' },
  ]);

  // In production, fetch from real monitoring APIs
  useEffect(() => {
    // Placeholder for real API integration
  }, []);

  const overallStatus = statuses.some((s) => s.status === 'outage')
    ? 'outage'
    : statuses.some((s) => s.status === 'degraded')
    ? 'degraded'
    : 'operational';

  return (
    <div className="card h-full">
      <div className="card-header py-2">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-brand-400" />
          <h2 className="text-xs font-bold text-dark-100">Internet Health</h2>
        </div>
        <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded ${statusColors[overallStatus]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusDots[overallStatus]}`} />
          <span className="text-2xs font-semibold capitalize">{overallStatus}</span>
        </div>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {statuses.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between py-1"
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${statusDots[item.status]}`} />
              <span className="text-xs text-dark-300">{item.label}</span>
            </div>
            <span className="text-2xs text-dark-500">{item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
