'use client';

import { useEffect, useState } from 'react';
import { Tv, Play, ChevronDown, Radio, Volume2 } from 'lucide-react';
import { getMockStreams, type StreamChannel } from '@/lib/api';

export default function LiveTV() {
  const [channels, setChannels] = useState<StreamChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function loadChannels() {
      try {
        const res = await fetch('/api/streams/tv');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.items || [];
          setChannels(list);
          if (list.length > 0) setActiveChannel(list[0]);
          return;
        }
      } catch {
        // fallback
      }
      const mock = getMockStreams();
      setChannels(mock);
      if (mock.length > 0) setActiveChannel(mock[0]);
    }
    loadChannels();
  }, []);

  return (
    <div className="border-t border-dark-700/50">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-dark-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv size={14} className="text-brand-400" />
          <h2 className="text-xs font-bold text-dark-100">Live TV</h2>
          <span className="flex items-center gap-1 bg-red-500/20 rounded px-1.5 py-0.5">
            <span className="live-dot" style={{ width: 5, height: 5 }} />
            <span className="text-red-400 text-2xs font-bold ml-0.5">LIVE</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Volume2 size={13} className="text-dark-500" />
        </div>
      </div>

      {/* Channel Selector */}
      <div className="px-3 py-1.5 border-b border-dark-700/30 relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-2 py-1 bg-dark-800 border border-dark-700 rounded text-xs text-dark-300 hover:border-dark-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Radio size={11} className="text-green-400" />
            <span>{activeChannel?.name || 'Select channel'}</span>
          </div>
          <ChevronDown size={12} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute left-3 right-3 top-full mt-0.5 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto scrollbar-dark animate-fade-in">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => {
                  setActiveChannel(ch);
                  setShowDropdown(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-dark-700 transition-colors ${
                  activeChannel?.id === ch.id ? 'text-brand-400 bg-brand-500/10' : 'text-dark-300'
                }`}
              >
                <Radio size={10} className={ch.is_live ? 'text-green-400' : 'text-dark-600'} />
                <span className="flex-1 text-left">{ch.name}</span>
                {ch.is_live && (
                  <span className="text-2xs text-green-400 font-medium">LIVE</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Player */}
      <div className="relative aspect-video bg-dark-950">
        {activeChannel?.embed_url ? (
          <iframe
            src={`${activeChannel.embed_url}?autoplay=0&mute=1`}
            title={activeChannel.name}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center">
              <Play size={20} className="text-dark-500 ml-0.5" />
            </div>
            <span className="text-xs text-dark-500">Select a channel to watch</span>
          </div>
        )}
      </div>

      {/* Quick Channel Buttons */}
      <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hidden">
        {channels.slice(0, 6).map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch)}
            className={`px-2 py-1 rounded text-2xs font-medium transition-colors flex-shrink-0 ${
              activeChannel?.id === ch.id
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-300'
            }`}
          >
            {ch.name.split(' ')[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
