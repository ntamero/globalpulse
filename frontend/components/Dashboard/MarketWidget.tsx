'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react';
import { getMockMarketData, type MarketData } from '@/lib/api';

export default function MarketWidget() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMarkets() {
      try {
        const res = await fetch('/api/markets');
        if (res.ok) {
          const data = await res.json();
          setMarkets(Array.isArray(data) ? data : []);
          setIsLoading(false);
          return;
        }
      } catch {
        // fallback
      }
      setMarkets(getMockMarketData());
      setIsLoading(false);
    }
    loadMarkets();
    const interval = setInterval(loadMarkets, 60000);
    return () => clearInterval(interval);
  }, []);

  function formatPrice(price: number): string {
    if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 100) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className="card">
      <div className="card-header py-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-brand-400" />
          <h2 className="text-xs font-bold text-dark-100">Markets</h2>
        </div>
        <button className="text-dark-500 hover:text-dark-300 transition-colors">
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="px-3 py-2 flex items-center gap-3 overflow-x-auto scrollbar-hidden">
        {markets.map((m) => {
          const isPositive = m.change_percent >= 0;
          return (
            <div
              key={m.symbol}
              className="flex items-center gap-2 flex-shrink-0 pr-3 border-r border-dark-700/50 last:border-r-0 last:pr-0"
            >
              <div>
                <div className="text-2xs text-dark-500 font-medium">{m.name}</div>
                <div className="text-xs font-bold text-dark-200 font-mono">
                  {formatPrice(m.price)}
                </div>
              </div>
              <div
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-bold ${
                  isPositive
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {isPositive ? (
                  <TrendingUp size={10} />
                ) : (
                  <TrendingDown size={10} />
                )}
                {isPositive ? '+' : ''}
                {m.change_percent.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
