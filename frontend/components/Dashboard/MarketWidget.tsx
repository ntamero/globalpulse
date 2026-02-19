'use client';

import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw, Activity } from 'lucide-react';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  updated_at?: string;
}

export default function MarketWidget() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({});
  const prevPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    async function loadMarkets() {
      try {
        const res = await fetch('/api/markets');
        if (res.ok) {
          const data = await res.json();
          const arr: MarketData[] = Array.isArray(data) ? data : [];

          // Detect price changes for flash animations
          const newFlash: Record<string, 'up' | 'down' | null> = {};
          arr.forEach((m) => {
            const prev = prevPricesRef.current[m.symbol];
            if (prev !== undefined && prev !== m.price) {
              newFlash[m.symbol] = m.price > prev ? 'up' : 'down';
            }
          });

          if (Object.keys(newFlash).length > 0) {
            setFlashMap(newFlash);
            setTimeout(() => setFlashMap({}), 1500);
          }

          // Store current prices for next comparison
          const priceMap: Record<string, number> = {};
          arr.forEach((m) => { priceMap[m.symbol] = m.price; });
          prevPricesRef.current = priceMap;

          setMarkets(arr);
          setLastUpdate(new Date());
          setIsLoading(false);
          return;
        }
      } catch {
        // fallback
      }
      setIsLoading(false);
    }
    loadMarkets();
    // Poll every 10 seconds for live feel
    const interval = setInterval(loadMarkets, 10000);
    return () => clearInterval(interval);
  }, []);

  function formatPrice(price: number): string {
    if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 100) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  return (
    <div className="card">
      <div className="card-header py-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-brand-400" />
          <h2 className="text-xs font-bold text-dark-100">Markets</h2>
          <span className="flex items-center gap-1 bg-green-500/10 rounded px-1.5 py-0.5">
            <Activity size={9} className="text-green-400" />
            <span className="text-2xs text-green-400 font-semibold">LIVE</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-2xs text-dark-600 font-mono">
              {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            className="text-dark-500 hover:text-dark-300 transition-colors"
            onClick={() => {
              setIsLoading(true);
              fetch('/api/markets').then(r => r.json()).then(data => {
                setMarkets(Array.isArray(data) ? data : []);
                setLastUpdate(new Date());
                setIsLoading(false);
              }).catch(() => setIsLoading(false));
            }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div className="px-3 py-2 flex items-center gap-3 overflow-x-auto scrollbar-hidden">
        {markets.map((m) => {
          const isPositive = m.change_percent >= 0;
          const flash = flashMap[m.symbol];
          return (
            <div
              key={m.symbol}
              className={`flex items-center gap-2 flex-shrink-0 pr-3 border-r border-dark-700/50 last:border-r-0 last:pr-0 transition-all duration-300 ${
                flash === 'up' ? 'bg-green-500/10 rounded' : flash === 'down' ? 'bg-red-500/10 rounded' : ''
              }`}
            >
              <div>
                <div className="text-2xs text-dark-500 font-medium">{m.name}</div>
                <div className={`text-xs font-bold font-mono transition-colors duration-300 ${
                  flash === 'up' ? 'text-green-400' : flash === 'down' ? 'text-red-400' : 'text-dark-200'
                }`}>
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
