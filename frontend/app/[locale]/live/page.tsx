'use client';

import { useState, useEffect } from 'react';
import { Tv, Radio, Camera, Play, Signal, ExternalLink, ChevronRight } from 'lucide-react';
import Header from '@/components/Layout/Header';
import { getMockStreams, type StreamChannel } from '@/lib/api';

const tabs = [
  { key: 'tv', label: 'TV', icon: Tv },
  { key: 'radio', label: 'Radio', icon: Radio },
  { key: 'webcam', label: 'Webcams', icon: Camera },
] as const;

export default function LivePage() {
  const [channels, setChannels] = useState<StreamChannel[]>([]);
  const [activeTab, setActiveTab] = useState<'tv' | 'radio' | 'webcam'>('tv');
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null);

  useEffect(() => {
    async function loadChannels() {
      try {
        const res = await fetch(`/api/streams/tv?type=${activeTab}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.items || [];
          setChannels(list);
          return;
        }
      } catch {
        // fallback
      }
      const mock = getMockStreams().filter(
        (s) => s.type === activeTab || activeTab === 'tv'
      );
      setChannels(mock);
    }
    loadChannels();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-dark-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-3">
              <Tv className="text-brand-400" />
              Live TV & Radio
              <span className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 rounded-lg px-2.5 py-1">
                <span className="live-dot" />
                <span className="text-red-400 text-xs font-bold ml-1">LIVE</span>
              </span>
            </h1>
            <p className="text-sm text-dark-400 mt-1">
              Watch live news channels from around the world
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-dark-800 border border-dark-700 rounded-lg p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setActiveChannel(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Player */}
        {activeChannel && (
          <div className="mb-6 card overflow-hidden">
            <div className="aspect-video bg-dark-950 relative">
              {activeChannel.embed_url ? (
                <iframe
                  src={`${activeChannel.embed_url}?autoplay=1&mute=0`}
                  title={activeChannel.name}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-dark-500">Stream not available</span>
                </div>
              )}
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-dark-100">{activeChannel.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Signal size={12} /> Live
                  </span>
                  <span className="text-xs text-dark-500">{activeChannel.language?.toUpperCase()}</span>
                  {activeChannel.region && (
                    <span className="text-xs text-dark-500">{activeChannel.region}</span>
                  )}
                </div>
              </div>
              {activeChannel.url && (
                <a
                  href={activeChannel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
                >
                  <ExternalLink size={12} />
                  Open source
                </a>
              )}
            </div>
          </div>
        )}

        {/* Channel Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel)}
              className={`card group hover:border-brand-500/50 transition-all text-left ${
                activeChannel?.id === channel.id ? 'border-brand-500/50 glow-blue' : ''
              }`}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-dark-950 relative overflow-hidden">
                {channel.thumbnail ? (
                  <img
                    src={channel.thumbnail}
                    alt={channel.name}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
                    <Tv size={32} className="text-dark-600" />
                  </div>
                )}

                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-dark-900/40">
                  <div className="w-12 h-12 rounded-full bg-brand-500/90 flex items-center justify-center shadow-lg">
                    <Play size={20} className="text-white ml-0.5" />
                  </div>
                </div>

                {/* Live Badge */}
                {channel.is_live && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 rounded px-1.5 py-0.5">
                    <span className="live-dot" style={{ width: 5, height: 5 }} />
                    <span className="text-white text-2xs font-bold ml-0.5">LIVE</span>
                  </div>
                )}
              </div>

              {/* Channel Info */}
              <div className="p-3">
                <h3 className="text-sm font-semibold text-dark-200 group-hover:text-brand-400 transition-colors">
                  {channel.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xs text-dark-500">{channel.language?.toUpperCase()}</span>
                  {channel.region && (
                    <>
                      <span className="text-dark-700">|</span>
                      <span className="text-2xs text-dark-500">{channel.region}</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {channels.length === 0 && (
          <div className="text-center py-16">
            <Tv size={48} className="mx-auto text-dark-600 mb-4" />
            <h3 className="text-lg font-semibold text-dark-400">No channels available</h3>
            <p className="text-sm text-dark-500 mt-1">
              Check back later for live streams
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
