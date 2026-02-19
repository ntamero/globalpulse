'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import all dashboard components with { ssr: false }
// This eliminates ALL hydration mismatches by only rendering on the client
const Header = dynamic(() => import('@/components/Layout/Header'), { ssr: false });
const BreakingTicker = dynamic(() => import('@/components/Dashboard/BreakingTicker'), { ssr: false });
const AIBriefing = dynamic(() => import('@/components/Dashboard/AIBriefing'), { ssr: false });
const LatestHeadlines = dynamic(() => import('@/components/Dashboard/LatestHeadlines'), { ssr: false });
const WorldMap = dynamic(() => import('@/components/Dashboard/WorldMap'), { ssr: false });
const EventsTimeline = dynamic(() => import('@/components/Dashboard/EventsTimeline'), { ssr: false });
const LiveFeed = dynamic(() => import('@/components/Dashboard/LiveFeed'), { ssr: false });
const LiveMedia = dynamic(() => import('@/components/Dashboard/LiveMedia'), { ssr: false });
const MarketWidget = dynamic(() => import('@/components/Dashboard/MarketWidget'), { ssr: false });
const InternetStatus = dynamic(() => import('@/components/Dashboard/InternetStatus'), { ssr: false });
const VideoShorts = dynamic(() => import('@/components/Dashboard/VideoShorts'), { ssr: false });
const GlobalChat = dynamic(() => import('@/components/Dashboard/GlobalChat'), { ssr: false });
const AITechHub = dynamic(() => import('@/components/Dashboard/AITechHub'), { ssr: false });
const SportsHub = dynamic(() => import('@/components/Dashboard/SportsHub'), { ssr: false });

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show a minimal loading shell during SSR and first client render
  // This prevents ANY hydration mismatch since both server and client
  // render the same loading skeleton
  if (!mounted) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm text-dark-400 font-medium">Loading GlobalPulse...</div>
        </div>
      </div>
    );
  }

  return (
    <div id="top" className="min-h-screen bg-dark-900">
      <Header />
      <BreakingTicker />

      <main className="flex gap-0 lg:gap-1 w-full max-w-[1920px] mx-auto">
        {/* LEFT SIDEBAR - Live News Feed */}
        <aside className="hidden xl:block w-72 flex-shrink-0 min-h-[calc(100vh-7rem)] border-r border-dark-700/50">
          <div className="sticky top-0 h-[calc(100vh-7rem)] overflow-y-auto scrollbar-dark">
            <LiveFeed />
          </div>
        </aside>

        {/* CENTER - Main Content */}
        <div className="flex-1 min-w-0 px-2 lg:px-3 py-2 space-y-3">
          {/* Market Widget + Internet Status Row */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1">
              <MarketWidget />
            </div>
            <div className="sm:w-64 flex-shrink-0">
              <InternetStatus />
            </div>
          </div>

          {/* AI Briefing */}
          <div id="briefing">
            <AIBriefing />
          </div>

          {/* Video Shorts */}
          <VideoShorts />

          {/* AI & Tech Hub */}
          <div id="ai-tech">
            <AITechHub />
          </div>

          {/* Sports Center */}
          <div id="sports">
            <SportsHub />
          </div>

          {/* Latest Headlines */}
          <div id="headlines">
            <LatestHeadlines />
          </div>

          {/* World Map */}
          <div id="world-map">
            <WorldMap />
          </div>

          {/* Live Media (TV/Radio/Cameras) - also in center for mobile */}
          <div id="live-media" className="lg:hidden">
            <LiveMedia />
          </div>
        </div>

        {/* RIGHT SIDEBAR - Events Timeline + Live Media */}
        <aside className="hidden lg:block w-80 flex-shrink-0 min-h-[calc(100vh-7rem)] border-l border-dark-700/50">
          <div id="timeline" className="sticky top-0 h-[calc(100vh-7rem)] overflow-y-auto scrollbar-dark space-y-0">
            <EventsTimeline />
            <div id="live-media-desktop">
              <LiveMedia />
            </div>
          </div>
        </aside>
      </main>

      {/* Global Chat - Floating */}
      <GlobalChat />
    </div>
  );
}
