'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Brain,
  TrendingUp,
  AlertCircle,
  Eye,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { getMockBriefing, type Briefing } from '@/lib/api';

const impactColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const likelihoodColors: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

const categoryIcons: Record<string, string> = {
  conflict: 'text-red-400',
  economy: 'text-green-400',
  internet: 'text-cyan-400',
  diplomacy: 'text-blue-400',
  protests: 'text-orange-400',
  sanctions: 'text-purple-400',
};

export default function AIBriefing() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    async function loadBriefing() {
      try {
        const res = await fetch('/api/briefing');
        if (res.ok) {
          const data = await res.json();
          setBriefing(data);
          return;
        }
      } catch {
        // fallback
      }
      setBriefing(getMockBriefing());
    }
    loadBriefing();
  }, []);

  if (!briefing) {
    return (
      <div className="card animate-pulse">
        <div className="card-header">
          <div className="h-4 w-40 bg-dark-700 rounded" />
        </div>
        <div className="card-body space-y-3">
          <div className="h-3 w-full bg-dark-700 rounded" />
          <div className="h-3 w-3/4 bg-dark-700 rounded" />
          <div className="h-3 w-5/6 bg-dark-700 rounded" />
        </div>
      </div>
    );
  }

  const [hour, setHour] = useState(12);
  useEffect(() => { setHour(new Date().getHours()); }, []);

  return (
    <div className="card glow-blue">
      {/* Header */}
      <div className="card-header bg-gradient-to-r from-brand-500/10 to-cyan-500/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center">
            <Brain size={15} className="text-brand-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-dark-100">
                {hour < 12 ? 'Morning' : 'Evening'} Briefing
              </h2>
              <span className="flex items-center gap-1 text-2xs text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">
                <Sparkles size={10} />
                AI Generated
              </span>
            </div>
            <p className="text-2xs text-dark-500 mt-0.5">
              {(() => { try { const d = new Date(briefing.date); return isNaN(d.getTime()) ? '' : format(d, 'EEEE, MMMM d, yyyy - HH:mm z'); } catch { return ''; } })()}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-dark-500 hover:text-dark-300 transition-colors"
        >
          <ChevronRight
            size={16}
            className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
      </div>

      {expanded && (
        <div className="card-body space-y-4">
          {/* Summary */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={13} className="text-brand-400" />
              <h3 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">
                Recap
              </h3>
            </div>
            <p className="text-sm text-dark-300 leading-relaxed">
              {briefing.summary}
            </p>
          </div>

          {/* Key Developments */}
          {briefing.key_developments && briefing.key_developments.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50">
              <ul className="space-y-1.5">
                {briefing.key_developments.map((dev, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-dark-300">
                    <span className="text-brand-400 font-mono text-2xs mt-0.5 flex-shrink-0">
                      [{String(i + 1).padStart(2, '0')}]
                    </span>
                    {dev}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Things to Watch */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Eye size={13} className="text-yellow-400" />
              <h3 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">
                Things to Watch
              </h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {briefing.watch_items.map((item, i) => (
                <div
                  key={i}
                  className="bg-dark-800/60 border border-dark-700/50 rounded-lg p-3 hover:border-dark-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle
                        size={13}
                        className={categoryIcons[item.category] || 'text-dark-400'}
                      />
                      <span className="text-xs font-semibold text-dark-200">{item.title}</span>
                    </div>
                    <span className="text-2xs font-bold text-dark-500 flex-shrink-0">
                      #{i + 1}
                    </span>
                  </div>
                  <p className="text-2xs text-dark-400 leading-relaxed mb-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`badge text-2xs ${likelihoodColors[item.likelihood] || ''}`}
                    >
                      {item.likelihood} prob.
                    </span>
                    <span
                      className={`badge text-2xs border ${impactColors[item.impact] || ''}`}
                    >
                      {item.impact} impact
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
