'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Play, Eye, X, Flame, ChevronLeft, ChevronRight, Heart,
  Share2, MessageCircle, Bookmark, ChevronUp, ChevronDown,
} from 'lucide-react';

interface VideoShort {
  id: string;
  videoId: string;
  title: string;
  source: string;
  views: string;
  duration: string;
}

const SHORTS_DATA: VideoShort[] = [
  { id: '1', videoId: '9Auq9mYxFEE', title: 'Breaking: Major Global Headlines Today', source: 'Sky News', views: '2.4M', duration: '0:58' },
  { id: '2', videoId: 'GE_SfNVNyqo', title: 'World Crisis Update: What You Need to Know', source: 'DW News', views: '5.1M', duration: '0:47' },
  { id: '3', videoId: 'U30MYhpkSMc', title: 'Asia Pacific Security Alert', source: 'WION', views: '1.8M', duration: '0:52' },
  { id: '4', videoId: 'CV5Fooi6v9A', title: 'Middle East Tensions: Latest Developments', source: 'TRT World', views: '8.3M', duration: '0:39' },
  { id: '5', videoId: 'h3MuIUNCCzI', title: 'Europe Responds to New Policy Changes', source: 'France 24', views: '960K', duration: '0:55' },
  { id: '6', videoId: 'w_Ma8oQLmSM', title: 'US Political Analysis & Debate', source: 'ABC News', views: '3.7M', duration: '0:44' },
  { id: '7', videoId: 'pykpO5kQJ98', title: 'Tech Giants Face New Regulations', source: 'Euronews', views: '4.2M', duration: '0:36' },
  { id: '8', videoId: 'Es06MyOUVLk', title: 'India Economic Boom: Inside Story', source: 'India Today', views: '2.9M', duration: '0:51' },
  { id: '9', videoId: 'jL8uDJJBjMA', title: 'Humanitarian Crisis: Live Coverage', source: 'Al Jazeera', views: '1.5M', duration: '0:48' },
  { id: '10', videoId: 'MN8p-Eys4Vw', title: 'Climate Emergency: Latest Data', source: 'NDTV', views: '6.8M', duration: '0:42' },
  { id: '11', videoId: 'XWq5kBlakcQ', title: 'Southeast Asia Trade Summit', source: 'CNA', views: '1.1M', duration: '0:53' },
  { id: '12', videoId: 'dp8PhLsUcFE', title: 'Markets Crash: Expert Analysis', source: 'Bloomberg', views: '3.3M', duration: '0:59' },
];

const EMOJIS = ['🔥', '😮', '😢', '👏', '💯', '😡', '🙏', '💪'];

export default function VideoShorts() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    SHORTS_DATA.forEach(v => { counts[v.id] = Math.floor(Math.random() * 50000) + 1000; });
    return counts;
  });
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [showEmoji, setShowEmoji] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const emojiIdRef = useRef(0);

  const selectedVideo = selectedIndex !== null ? SHORTS_DATA[selectedIndex] : null;

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -384 : 384, behavior: 'smooth' });
  }, []);

  const openPlayer = useCallback((index: number) => {
    setSelectedIndex(index);
    document.body.style.overflow = 'hidden';
  }, []);

  const closePlayer = useCallback(() => {
    setSelectedIndex(null);
    setShowEmoji(false);
    document.body.style.overflow = '';
  }, []);

  const goNext = useCallback(() => {
    setSelectedIndex(prev => prev !== null && prev < SHORTS_DATA.length - 1 ? prev + 1 : prev);
  }, []);

  const goPrev = useCallback(() => {
    setSelectedIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') closePlayer();
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, closePlayer, goNext, goPrev]);

  const toggleLike = (id: string) => {
    setLikes(prev => {
      const isLiked = !prev[id];
      setLikeCounts(c => ({ ...c, [id]: c[id] + (isLiked ? 1 : -1) }));
      return { ...prev, [id]: isLiked };
    });
  };

  const addFloatingEmoji = (emoji: string) => {
    const id = ++emojiIdRef.current;
    const x = Math.random() * 60 + 20;
    setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 2000);
  };

  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  return (
    <>
      {/* Horizontal Scroll Row */}
      <div className="border-t border-dark-700/50">
        <div className="px-3 py-2.5 border-b border-dark-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-orange-400" />
            <h2 className="text-xs font-bold text-dark-100">Trending Shorts</h2>
            <span className="bg-orange-500/15 text-orange-400 text-2xs font-semibold rounded px-1.5 py-0.5">{SHORTS_DATA.length} clips</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => scroll('left')} disabled={!canScrollLeft}
              className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors disabled:opacity-30"><ChevronLeft size={14} /></button>
            <button onClick={() => scroll('right')} disabled={!canScrollRight}
              className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>

        <div className="relative">
          {canScrollLeft && <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-dark-900/80 to-transparent z-10 pointer-events-none" />}
          <div ref={scrollRef} className="flex gap-2 px-3 py-3 overflow-x-auto scrollbar-hidden snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
            {SHORTS_DATA.map((video, idx) => (
              <button key={video.id} onClick={() => openPlayer(idx)}
                className="group relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.05] hover:z-10 hover:shadow-lg hover:shadow-black/40 snap-start focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                style={{ width: 120, height: 200 }}>
                <div className="absolute inset-0 bg-dark-800 bg-cover bg-center"
                  style={{ backgroundImage: `url(https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg)` }} />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                <div className="absolute top-1.5 right-1.5 bg-black/75 backdrop-blur-sm text-white text-2xs font-medium rounded px-1 py-0.5">{video.duration}</div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110 border border-white/20">
                    <Play size={16} className="text-white ml-0.5" fill="white" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pb-2 px-2">
                  <p className="text-white text-2xs font-medium leading-tight line-clamp-2 mb-1">{video.title}</p>
                  <div className="flex items-center gap-1 text-dark-300">
                    <Eye size={9} /><span className="text-2xs">{video.views}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {canScrollRight && <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-dark-900/80 to-transparent z-10 pointer-events-none" />}
        </div>
      </div>

      {/* TikTok-style Fullscreen Player */}
      {selectedVideo && selectedIndex !== null && (
        <div className="fixed inset-0 z-[9998] bg-black flex items-center justify-center" role="dialog" aria-modal="true">
          {/* Close button */}
          <button onClick={closePlayer}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-50 text-white/70 text-sm font-medium bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
            {selectedIndex + 1} / {SHORTS_DATA.length}
          </div>

          {/* Main content area */}
          <div className="relative flex items-center justify-center h-full w-full max-w-[500px]">
            {/* Video */}
            <div className="relative w-full" style={{ aspectRatio: '9/16', maxHeight: '90vh' }}>
              <iframe
                key={selectedVideo.videoId}
                src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1&rel=0&modestbranding=1`}
                title={selectedVideo.title}
                className="w-full h-full rounded-xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />

              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 rounded-b-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-500/90 text-white text-2xs font-bold px-2 py-0.5 rounded">NEWS</span>
                  <span className="text-white/60 text-xs">{selectedVideo.source}</span>
                </div>
                <h3 className="text-white font-semibold text-sm leading-snug mb-1">{selectedVideo.title}</h3>
                <div className="flex items-center gap-2 text-white/50 text-xs">
                  <Eye size={12} /><span>{selectedVideo.views} views</span>
                </div>
              </div>

              {/* Floating emojis */}
              {floatingEmojis.map(fe => (
                <div key={fe.id} className="absolute bottom-20 text-2xl pointer-events-none animate-bounce"
                  style={{ left: `${fe.x}%`, animation: 'floatUp 2s ease-out forwards' }}>
                  {fe.emoji}
                </div>
              ))}
            </div>

            {/* Right sidebar actions */}
            <div className="absolute right-[-60px] bottom-20 flex flex-col items-center gap-5">
              {/* Like */}
              <button onClick={() => toggleLike(selectedVideo.id)} className="flex flex-col items-center gap-1 group">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  likes[selectedVideo.id] ? 'bg-red-500 scale-110' : 'bg-white/10 hover:bg-white/20'
                }`}>
                  <Heart size={22} className={likes[selectedVideo.id] ? 'text-white fill-white' : 'text-white'} />
                </div>
                <span className="text-white text-2xs font-medium">{formatCount(likeCounts[selectedVideo.id] || 0)}</span>
              </button>

              {/* Comment */}
              <button className="flex flex-col items-center gap-1 group">
                <div className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                  <MessageCircle size={22} className="text-white" />
                </div>
                <span className="text-white text-2xs font-medium">{Math.floor(Math.random() * 999) + 100}</span>
              </button>

              {/* Share */}
              <button className="flex flex-col items-center gap-1 group"
                onClick={() => navigator.clipboard?.writeText(`https://youtube.com/watch?v=${selectedVideo.videoId}`)}>
                <div className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                  <Share2 size={20} className="text-white" />
                </div>
                <span className="text-white text-2xs font-medium">Share</span>
              </button>

              {/* Bookmark */}
              <button onClick={() => setSaved(p => ({ ...p, [selectedVideo.id]: !p[selectedVideo.id] }))}
                className="flex flex-col items-center gap-1 group">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  saved[selectedVideo.id] ? 'bg-yellow-500' : 'bg-white/10 hover:bg-white/20'
                }`}>
                  <Bookmark size={20} className={saved[selectedVideo.id] ? 'text-white fill-white' : 'text-white'} />
                </div>
                <span className="text-white text-2xs font-medium">Save</span>
              </button>

              {/* Emoji */}
              <div className="relative">
                <button onClick={() => setShowEmoji(!showEmoji)} className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-xl">🔥</div>
                </button>
                {showEmoji && (
                  <div className="absolute right-14 bottom-0 bg-dark-800/95 backdrop-blur-lg rounded-xl p-2 flex gap-1 border border-dark-600/50 shadow-xl animate-fade-in">
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => { addFloatingEmoji(e); setShowEmoji(false); }}
                        className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-lg transition-all hover:scale-125">{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation arrows */}
          <button onClick={goPrev} disabled={selectedIndex === 0}
            className="absolute left-1/2 top-4 -translate-x-[250px] z-40 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-20 transition-all hidden md:flex">
            <ChevronUp size={20} />
          </button>
          <button onClick={goNext} disabled={selectedIndex === SHORTS_DATA.length - 1}
            className="absolute left-1/2 bottom-4 -translate-x-[250px] z-40 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-20 transition-all hidden md:flex">
            <ChevronDown size={20} />
          </button>
        </div>
      )}

      {/* Floating emoji animation keyframes */}
      <style jsx global>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-150px) scale(1.5); }
        }
      `}</style>
    </>
  );
}
