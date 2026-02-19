'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Radio,
  MessageCircle,
  Repeat2,
  Heart,
  ExternalLink,
  CheckCircle2,
  Rss,
} from 'lucide-react';
import { getMockLiveFeed } from '@/lib/api';

interface FeedItem {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    verified: boolean;
  };
  content: string;
  timestamp: string;
  engagement: {
    replies: number;
    retweets: number;
    likes: number;
  };
  platform: 'twitter' | 'telegram' | 'rss';
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function LiveFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    // In production, this would connect to a WebSocket or poll
    setFeed(getMockLiveFeed());
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-dark-700/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-brand-400" />
          <h2 className="text-xs font-bold text-dark-100">Live Feed</h2>
          <span className="live-dot" />
        </div>
        <span className="text-2xs text-dark-500">Tracked Sources</span>
      </div>

      {/* Feed Items */}
      <div className="flex-1 overflow-y-auto scrollbar-dark">
        {feed.map((item, idx) => (
          <div
            key={item.id}
            className="px-3 py-3 border-b border-dark-700/30 hover:bg-dark-800/40 transition-colors animate-fade-in"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {/* Author Row */}
            <div className="flex items-center gap-2 mb-1.5">
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                <span className="text-2xs font-bold text-white">
                  {getInitials(item.author.name)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-dark-200 truncate">
                    {item.author.name}
                  </span>
                  {item.author.verified && (
                    <CheckCircle2 size={12} className="text-brand-400 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xs text-dark-500 truncate">
                    {item.author.handle}
                  </span>
                  <span className="text-2xs text-dark-600">
                    {formatDistanceToNowStrict(new Date(item.timestamp), {
                      addSuffix: false,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <p className="text-xs text-dark-300 leading-relaxed mb-2">
              {item.content}
            </p>

            {/* Engagement */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1 text-dark-500 hover:text-blue-400 transition-colors group">
                  <MessageCircle size={12} />
                  <span className="text-2xs">{formatCount(item.engagement.replies)}</span>
                </button>
                <button className="flex items-center gap-1 text-dark-500 hover:text-green-400 transition-colors group">
                  <Repeat2 size={12} />
                  <span className="text-2xs">{formatCount(item.engagement.retweets)}</span>
                </button>
                <button className="flex items-center gap-1 text-dark-500 hover:text-red-400 transition-colors group">
                  <Heart size={12} />
                  <span className="text-2xs">{formatCount(item.engagement.likes)}</span>
                </button>
              </div>
              <a
                href="#"
                className="flex items-center gap-1 text-2xs text-dark-500 hover:text-brand-400 transition-colors"
              >
                <ExternalLink size={10} />
                View on X
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-dark-700/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Rss size={11} className="text-dark-500" />
            <span className="text-2xs text-dark-500">
              {feed.length} posts from {new Set(feed.map((f) => f.author.handle)).size} sources
            </span>
          </div>
          <button className="text-2xs text-brand-400 hover:text-brand-300 transition-colors">
            View all
          </button>
        </div>
      </div>
    </div>
  );
}
