'use client';

import Header from '@/components/Layout/Header';
import BreakingTicker from '@/components/Dashboard/BreakingTicker';
import AIBriefing from '@/components/Dashboard/AIBriefing';
import LatestHeadlines from '@/components/Dashboard/LatestHeadlines';
import WorldMap from '@/components/Dashboard/WorldMap';
import EventsTimeline from '@/components/Dashboard/EventsTimeline';
import LiveFeed from '@/components/Dashboard/LiveFeed';
import LiveMedia from '@/components/Dashboard/LiveMedia';
import MarketWidget from '@/components/Dashboard/MarketWidget';
import InternetStatus from '@/components/Dashboard/InternetStatus';
import VideoShorts from '@/components/Dashboard/VideoShorts';
import GlobalChat from '@/components/Dashboard/GlobalChat';

export default function HomePage() {
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
