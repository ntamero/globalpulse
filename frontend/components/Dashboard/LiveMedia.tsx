'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Tv, Radio, Camera, Play, Volume2, VolumeX, Maximize2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MediaTab = 'tv' | 'radio' | 'cameras';

interface TVChannel {
  id: string;
  name: string;
  shortName: string;
  videoId: string;
  region: string;
}

interface RadioStation {
  id: string;
  name: string;
  shortName: string;
  streamUrl: string;
  genre: string;
}

interface CameraFeed {
  id: string;
  name: string;
  shortName: string;
  videoId: string;
  location: string;
}

// ---------------------------------------------------------------------------
// Hardcoded channel data
// ---------------------------------------------------------------------------

const TV_CHANNELS: TVChannel[] = [
  { id: 'aljazeera', name: 'Al Jazeera English', shortName: 'Al Jazeera', videoId: 'gCNeDWCI0vo', region: 'Middle East' },
  { id: 'france24', name: 'France 24 English', shortName: 'France 24', videoId: 'h3MuIUNCCzI', region: 'Europe' },
  { id: 'dw', name: 'DW News', shortName: 'DW News', videoId: 'GE_SfNVNyqo', region: 'Europe' },
  { id: 'wion', name: 'WION', shortName: 'WION', videoId: 'U30MYhpkSMc', region: 'Asia' },
  { id: 'trt', name: 'TRT World', shortName: 'TRT World', videoId: 'CV5Fooi6v9A', region: 'Middle East' },
  { id: 'sky', name: 'Sky News', shortName: 'Sky News', videoId: '9Auq9mYxFEE', region: 'Europe' },
  { id: 'euronews', name: 'Euronews', shortName: 'Euronews', videoId: 'pykpO5kQJ98', region: 'Europe' },
  { id: 'ndtv', name: 'NDTV 24x7', shortName: 'NDTV', videoId: 'MN8p-Eys4Vw', region: 'Asia' },
  { id: 'abc', name: 'ABC News Live', shortName: 'ABC News', videoId: 'w_Ma8oQLmSM', region: 'Americas' },
  { id: 'cna', name: 'CNA 24/7', shortName: 'CNA', videoId: 'XWq5kBlakcQ', region: 'Asia' },
];

const RADIO_STATIONS: RadioStation[] = [
  { id: 'bbc', name: 'BBC World Service', shortName: 'BBC World', streamUrl: 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service', genre: 'News' },
  { id: 'npr', name: 'NPR News', shortName: 'NPR', streamUrl: 'https://npr-ice.streamguys1.com/live.mp3', genre: 'News' },
  { id: 'france-inter', name: 'France Inter', shortName: 'France Inter', streamUrl: 'http://direct.franceinter.fr/live/franceinter-midfi.mp3', genre: 'News / Culture' },
  { id: 'kusc', name: 'Classical KUSC', shortName: 'KUSC', streamUrl: 'https://kusc.streamguys1.com/kusc-128k.mp3', genre: 'Classical' },
];

const CAMERA_FEEDS: CameraFeed[] = [
  { id: 'timessquare', name: 'Times Square NYC', shortName: 'Times Sq', videoId: '1-iS7LArMPA', location: 'New York, USA' },
  { id: 'venicebeach', name: 'Venice Beach', shortName: 'Venice', videoId: 'ZeeJb1G7hQ8', location: 'Los Angeles, USA' },
  { id: 'tokyotower', name: 'Tokyo Tower', shortName: 'Tokyo', videoId: 'DjdUEyjx13s', location: 'Tokyo, Japan' },
];

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------

const TABS: { key: MediaTab; label: string; icon: typeof Tv }[] = [
  { key: 'tv', label: 'TV', icon: Tv },
  { key: 'radio', label: 'Radio', icon: Radio },
  { key: 'cameras', label: 'Cameras', icon: Camera },
];

// ---------------------------------------------------------------------------
// Helper: build YouTube embed URL
// ---------------------------------------------------------------------------

function ytEmbed(videoId: string, muted: boolean): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muted ? 1 : 0}&rel=0&modestbranding=1`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LiveMedia() {
  const [activeTab, setActiveTab] = useState<MediaTab>('tv');
  const [activeTVIndex, setActiveTVIndex] = useState(0);
  const [activeRadioIndex, setActiveRadioIndex] = useState(0);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); // force iframe reload on mute toggle

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelScrollRef = useRef<HTMLDivElement | null>(null);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const activeTV = TV_CHANNELS[activeTVIndex];
  const activeRadio = RADIO_STATIONS[activeRadioIndex];
  const activeCamera = CAMERA_FEEDS[activeCameraIndex];

  // -----------------------------------------------------------------------
  // Audio controls
  // -----------------------------------------------------------------------

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsRadioPlaying(false);
    }
  }, []);

  const playAudio = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.volume = 1;
      audioRef.current.play().then(() => {
        setIsRadioPlaying(true);
      }).catch(() => {
        setIsRadioPlaying(false);
      });
    }
  }, []);

  // Autoplay first radio station when switching to radio tab
  useEffect(() => {
    if (activeTab === 'radio') {
      playAudio(activeRadio.streamUrl);
    } else {
      stopAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Switch radio station
  useEffect(() => {
    if (activeTab === 'radio') {
      playAudio(activeRadio.streamUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRadioIndex]);

  // Force iframe remount on mute toggle for TV / Camera tabs
  useEffect(() => {
    if (activeTab !== 'radio') {
      setIframeKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // -----------------------------------------------------------------------
  // Tab switch handler
  // -----------------------------------------------------------------------

  const handleTabSwitch = (tab: MediaTab) => {
    setActiveTab(tab);
    // Reset mute state when switching to radio
    if (tab === 'radio') {
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderChannelButtons = () => {
    if (activeTab === 'tv') {
      return TV_CHANNELS.map((ch, idx) => (
        <button
          key={ch.id}
          onClick={() => setActiveTVIndex(idx)}
          className={`px-2.5 py-1 rounded text-2xs font-medium transition-all flex-shrink-0 whitespace-nowrap ${
            activeTVIndex === idx
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-300 hover:border-dark-600'
          }`}
        >
          {ch.shortName}
        </button>
      ));
    }

    if (activeTab === 'radio') {
      return RADIO_STATIONS.map((st, idx) => (
        <button
          key={st.id}
          onClick={() => setActiveRadioIndex(idx)}
          className={`px-2.5 py-1 rounded text-2xs font-medium transition-all flex-shrink-0 whitespace-nowrap ${
            activeRadioIndex === idx
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-300 hover:border-dark-600'
          }`}
        >
          {st.shortName}
        </button>
      ));
    }

    return CAMERA_FEEDS.map((cam, idx) => (
      <button
        key={cam.id}
        onClick={() => setActiveCameraIndex(idx)}
        className={`px-2.5 py-1 rounded text-2xs font-medium transition-all flex-shrink-0 whitespace-nowrap ${
          activeCameraIndex === idx
            ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
            : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-300 hover:border-dark-600'
        }`}
      >
        {cam.shortName}
      </button>
    ));
  };

  const renderPlayer = () => {
    // TV player
    if (activeTab === 'tv') {
      return (
        <iframe
          key={`tv-${activeTV.id}-${iframeKey}`}
          src={ytEmbed(activeTV.videoId, isMuted)}
          title={activeTV.name}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Radio player
    if (activeTab === 'radio') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-dark-900 via-dark-850 to-dark-950">
          {/* Animated radio visualizer */}
          <div className="relative">
            <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
              isRadioPlaying
                ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/20'
                : 'border-dark-600 bg-dark-800'
            }`}>
              <Radio size={32} className={`transition-colors duration-300 ${
                isRadioPlaying ? 'text-brand-400' : 'text-dark-500'
              }`} />
            </div>
            {isRadioPlaying && (
              <>
                <div className="absolute inset-0 rounded-full border border-brand-500/30 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute -inset-2 rounded-full border border-brand-500/10 animate-ping" style={{ animationDuration: '3s' }} />
              </>
            )}
          </div>

          {/* Station info */}
          <div className="text-center px-4">
            <p className="text-sm font-semibold text-dark-100">{activeRadio.name}</p>
            <p className="text-2xs text-dark-500 mt-0.5">{activeRadio.genre}</p>
          </div>

          {/* Play / Pause button */}
          <button
            onClick={() => {
              if (isRadioPlaying) {
                stopAudio();
              } else {
                playAudio(activeRadio.streamUrl);
              }
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isRadioPlaying
                ? 'bg-brand-500 hover:bg-brand-600 text-white'
                : 'bg-dark-700 hover:bg-dark-600 text-dark-300'
            }`}
          >
            {isRadioPlaying ? (
              <div className="flex items-center gap-0.5">
                <span className="w-0.5 h-3 bg-white rounded-full" />
                <span className="w-0.5 h-3 bg-white rounded-full" />
              </div>
            ) : (
              <Play size={18} className="ml-0.5" />
            )}
          </button>

          {/* Audio level bars (decorative) */}
          {isRadioPlaying && (
            <div className="flex items-end gap-0.5 h-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-brand-500/60 rounded-full"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animation: `pulse-live ${0.4 + Math.random() * 0.8}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Hidden audio element */}
          <audio ref={audioRef} preload="none" />
        </div>
      );
    }

    // Camera player
    return (
      <iframe
        key={`cam-${activeCamera.id}-${iframeKey}`}
        src={ytEmbed(activeCamera.videoId, isMuted)}
        title={activeCamera.name}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  };

  // -----------------------------------------------------------------------
  // Current label
  // -----------------------------------------------------------------------

  const currentLabel = activeTab === 'tv'
    ? activeTV.name
    : activeTab === 'radio'
      ? activeRadio.name
      : activeCamera.name;

  const currentSublabel = activeTab === 'tv'
    ? activeTV.region
    : activeTab === 'radio'
      ? activeRadio.genre
      : activeCamera.location;

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="border-t border-dark-700/50 flex flex-col">
      {/* ---- Header with tabs ---- */}
      <div className="px-3 py-2 border-b border-dark-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex items-center bg-dark-800 rounded-lg p-0.5 border border-dark-700/50">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleTabSwitch(key)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-2xs font-semibold transition-all ${
                  activeTab === key
                    ? 'bg-brand-500/20 text-brand-400 shadow-sm'
                    : 'text-dark-400 hover:text-dark-300'
                }`}
              >
                <Icon size={11} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Live badge */}
          <span className="flex items-center gap-1 bg-red-500/20 rounded px-1.5 py-0.5">
            <span className="live-dot" style={{ width: 5, height: 5 }} />
            <span className="text-red-400 text-2xs font-bold ml-0.5">LIVE</span>
          </span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 rounded hover:bg-dark-700/50 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX size={13} className="text-dark-500" />
            ) : (
              <Volume2 size={13} className="text-brand-400" />
            )}
          </button>
          <button
            className="p-1 rounded hover:bg-dark-700/50 transition-colors"
            title="Fullscreen"
            onClick={() => {
              const playerEl = document.querySelector('#livemedia-player iframe') as HTMLIFrameElement | null;
              if (playerEl) {
                playerEl.requestFullscreen?.();
              }
            }}
          >
            <Maximize2 size={13} className="text-dark-500" />
          </button>
        </div>
      </div>

      {/* ---- Now playing info ---- */}
      <div className="px-3 py-1.5 border-b border-dark-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {activeTab === 'tv' && <Tv size={11} className="text-green-400 flex-shrink-0" />}
          {activeTab === 'radio' && <Radio size={11} className="text-green-400 flex-shrink-0" />}
          {activeTab === 'cameras' && <Camera size={11} className="text-green-400 flex-shrink-0" />}
          <span className="text-xs text-dark-200 font-medium truncate">{currentLabel}</span>
          <span className="text-2xs text-dark-500 flex-shrink-0">{currentSublabel}</span>
        </div>
      </div>

      {/* ---- Player area ---- */}
      <div id="livemedia-player" className="relative aspect-video bg-dark-950">
        {renderPlayer()}
      </div>

      {/* ---- Channel selector (horizontal scroll) ---- */}
      <div
        ref={channelScrollRef}
        className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hidden border-t border-dark-700/30"
      >
        {renderChannelButtons()}
      </div>
    </div>
  );
}
