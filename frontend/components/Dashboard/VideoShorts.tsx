'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Eye, X, Flame, ChevronLeft, ChevronRight } from 'lucide-react';

interface VideoShort {
  id: string;
  videoId: string;
  title: string;
  views: string;
  duration: string;
  thumbnailIndex: number;
}

const SHORTS_DATA: VideoShort[] = [
  {
    id: '1',
    videoId: 'short_un_summit_2026',
    title: 'UN Emergency Summit on Climate Crisis Draws Record Attendance',
    views: '2.4M',
    duration: '0:58',
    thumbnailIndex: 1,
  },
  {
    id: '2',
    videoId: 'short_earthquake_japan',
    title: 'Massive 7.2 Earthquake Hits Southern Japan: First Footage',
    views: '5.1M',
    duration: '0:47',
    thumbnailIndex: 2,
  },
  {
    id: '3',
    videoId: 'short_ai_regulation',
    title: 'EU Passes Landmark AI Regulation Bill - What It Means',
    views: '1.8M',
    duration: '0:52',
    thumbnailIndex: 3,
  },
  {
    id: '4',
    videoId: 'short_space_launch',
    title: 'SpaceX Starship Completes First Orbital Cargo Mission',
    views: '8.3M',
    duration: '0:39',
    thumbnailIndex: 4,
  },
  {
    id: '5',
    videoId: 'short_protest_nairobi',
    title: 'Thousands March in Nairobi Over Rising Cost of Living',
    views: '960K',
    duration: '0:55',
    thumbnailIndex: 5,
  },
  {
    id: '6',
    videoId: 'short_arctic_ice',
    title: 'Arctic Ice Shelf Collapse Captured on Satellite - Timelapse',
    views: '3.7M',
    duration: '0:44',
    thumbnailIndex: 6,
  },
  {
    id: '7',
    videoId: 'short_ceasefire_talks',
    title: 'Breaking: Ceasefire Agreement Reached After 72-Hour Talks',
    views: '4.2M',
    duration: '0:36',
    thumbnailIndex: 7,
  },
  {
    id: '8',
    videoId: 'short_flood_brazil',
    title: 'Catastrophic Flooding in Southern Brazil Displaces Millions',
    views: '2.9M',
    duration: '0:51',
    thumbnailIndex: 8,
  },
  {
    id: '9',
    videoId: 'short_tech_summit',
    title: 'World Leaders Gather for Global Tech & Security Summit',
    views: '1.1M',
    duration: '0:48',
    thumbnailIndex: 9,
  },
  {
    id: '10',
    videoId: 'short_refugee_crisis',
    title: 'UNHCR Reports Record 130 Million Displaced People Worldwide',
    views: '1.5M',
    duration: '0:59',
    thumbnailIndex: 10,
  },
  {
    id: '11',
    videoId: 'short_solar_eclipse',
    title: 'Stunning Total Solar Eclipse Visible Across Southeast Asia',
    views: '6.8M',
    duration: '0:42',
    thumbnailIndex: 11,
  },
  {
    id: '12',
    videoId: 'short_currency_crash',
    title: 'Global Markets Tumble as Major Currency Faces Historic Crash',
    views: '3.3M',
    duration: '0:53',
    thumbnailIndex: 12,
  },
];

export default function VideoShorts() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoShort | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
    const cardWidth = 128; // 120px card + 8px gap
    const scrollAmount = cardWidth * 3;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  const openModal = useCallback((video: VideoShort) => {
    setSelectedVideo(video);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setSelectedVideo(null);
    document.body.style.overflow = '';
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedVideo) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideo, closeModal]);

  return (
    <>
      <div className="border-t border-dark-700/50">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-dark-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-orange-400" />
            <h2 className="text-xs font-bold text-dark-100">Trending Shorts</h2>
            <span className="bg-orange-500/15 text-orange-400 text-2xs font-semibold rounded px-1.5 py-0.5">
              {SHORTS_DATA.length} clips
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable video row */}
        <div className="relative group/container">
          {/* Left fade edge */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-dark-900/80 to-transparent z-10 pointer-events-none" />
          )}

          <div
            ref={scrollRef}
            className="flex gap-2 px-3 py-3 overflow-x-auto scrollbar-hidden snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {SHORTS_DATA.map((video) => (
              <button
                key={video.id}
                onClick={() => openModal(video)}
                className="group relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.05] hover:z-10 hover:shadow-lg hover:shadow-black/40 snap-start focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-1 focus:ring-offset-dark-900"
                style={{ width: 120, height: 200 }}
                aria-label={`Play: ${video.title}`}
              >
                {/* Thumbnail */}
                <div
                  className="absolute inset-0 bg-dark-800 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(https://picsum.photos/120/200?random=${video.thumbnailIndex})`,
                  }}
                />

                {/* Dark overlay on hover */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />

                {/* Duration badge - top right */}
                <div className="absolute top-1.5 right-1.5 bg-black/75 backdrop-blur-sm text-white text-2xs font-medium rounded px-1 py-0.5 leading-none">
                  {video.duration}
                </div>

                {/* Play button overlay - center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110 border border-white/20">
                    <Play size={16} className="text-white ml-0.5" fill="white" />
                  </div>
                </div>

                {/* Bottom gradient with title and views */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pb-2 px-2">
                  <p className="text-white text-2xs font-medium leading-tight line-clamp-2 mb-1">
                    {video.title}
                  </p>
                  <div className="flex items-center gap-1 text-dark-300">
                    <Eye size={9} />
                    <span className="text-2xs">{video.views}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Right fade edge */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-dark-900/80 to-transparent z-10 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={selectedVideo.title}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal content */}
          <div className="relative z-10 w-full flex flex-col items-center" style={{ maxWidth: 360 }}>
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute -top-2 -right-2 z-20 w-8 h-8 rounded-full bg-dark-800 border border-dark-600 flex items-center justify-center text-dark-300 hover:text-white hover:bg-dark-700 transition-colors shadow-lg"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Video embed (9:16 portrait) */}
            <div
              className="w-full bg-black rounded-lg overflow-hidden shadow-2xl"
              style={{ aspectRatio: '9/16', maxHeight: '80vh' }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1&rel=0`}
                title={selectedVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Title below video */}
            <div className="w-full mt-3 px-1">
              <h3 className="text-sm font-semibold text-dark-100 leading-snug">
                {selectedVideo.title}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 text-dark-400">
                <div className="flex items-center gap-1">
                  <Eye size={12} />
                  <span className="text-xs">{selectedVideo.views} views</span>
                </div>
                <span className="text-dark-600">|</span>
                <a
                  href={`https://www.youtube.com/watch?v=${selectedVideo.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Open on YouTube
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
