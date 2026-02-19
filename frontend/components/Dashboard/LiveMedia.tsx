'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Tv, Radio, Camera, Play, Volume2, VolumeX, Maximize2, Filter } from 'lucide-react';

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
// TV Channels - 20 verified 24/7 YouTube Live streams
// ---------------------------------------------------------------------------
const TV_CHANNELS: TVChannel[] = [
  // Americas
  { id: 'abc', name: 'ABC News Live', shortName: 'ABC News', videoId: 'w_Ma8oQLmSM', region: 'Americas' },
  { id: 'fox', name: 'Fox News', shortName: 'Fox News', videoId: 'hBa0EDYdPC0', region: 'Americas' },
  { id: 'bloomberg', name: 'Bloomberg TV', shortName: 'Bloomberg', videoId: 'dp8PhLsUcFE', region: 'Americas' },
  // Europe
  { id: 'france24', name: 'France 24 English', shortName: 'France 24', videoId: 'h3MuIUNCCzI', region: 'Europe' },
  { id: 'dw', name: 'DW News', shortName: 'DW News', videoId: 'GE_SfNVNyqo', region: 'Europe' },
  { id: 'sky', name: 'Sky News', shortName: 'Sky News', videoId: '9Auq9mYxFEE', region: 'Europe' },
  { id: 'euronews', name: 'Euronews', shortName: 'Euronews', videoId: 'pykpO5kQJ98', region: 'Europe' },
  { id: 'rt', name: 'RT News', shortName: 'RT', videoId: 'V1YNKZ86728', region: 'Europe' },
  // Middle East
  { id: 'aljazeera', name: 'Al Jazeera English', shortName: 'Al Jazeera', videoId: 'jL8uDJJBjMA', region: 'Middle East' },
  { id: 'trt', name: 'TRT World', shortName: 'TRT World', videoId: 'CV5Fooi6v9A', region: 'Middle East' },
  { id: 'i24', name: 'i24 News English', shortName: 'i24 News', videoId: 'sVEXBXbKsHw', region: 'Middle East' },
  // Asia
  { id: 'wion', name: 'WION', shortName: 'WION', videoId: 'U30MYhpkSMc', region: 'Asia' },
  { id: 'ndtv', name: 'NDTV 24x7', shortName: 'NDTV', videoId: 'MN8p-Eys4Vw', region: 'Asia' },
  { id: 'cna', name: 'CNA 24/7', shortName: 'CNA', videoId: 'XWq5kBlakcQ', region: 'Asia' },
  { id: 'cnn18', name: 'CNN News 18', shortName: 'CNN18', videoId: 'dbR4bMTyP0g', region: 'Asia' },
  { id: 'indiatoday', name: 'India Today', shortName: 'India Today', videoId: 'Es06MyOUVLk', region: 'Asia' },
  { id: 'nhk', name: 'NHK World', shortName: 'NHK', videoId: 'f0lYkdA-Nh4', region: 'Asia' },
  { id: 'arirang', name: 'Arirang TV', shortName: 'Arirang', videoId: 's3_SUn9LPbI', region: 'Asia' },
  { id: 'cgtn', name: 'CGTN', shortName: 'CGTN', videoId: '0eKLYoIGhtE', region: 'Asia' },
  // Africa/Other
  { id: 'abcau', name: 'ABC Australia', shortName: 'ABC AU', videoId: 'mBTSGp4TJOQ', region: 'Other' },
];

const TV_REGIONS = ['All', 'Americas', 'Europe', 'Middle East', 'Asia', 'Other'];

// ---------------------------------------------------------------------------
// Radio Stations - 10 real streams
// ---------------------------------------------------------------------------
const RADIO_STATIONS: RadioStation[] = [
  { id: 'bbc', name: 'BBC World Service', shortName: 'BBC World', streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service', genre: 'News' },
  { id: 'npr', name: 'NPR News', shortName: 'NPR', streamUrl: 'https://npr-ice.streamguys1.com/live.mp3', genre: 'News' },
  { id: 'france-inter', name: 'France Inter', shortName: 'Fr Inter', streamUrl: 'https://direct.franceinter.fr/live/franceinter-midfi.mp3', genre: 'News' },
  { id: 'dw-radio', name: 'Deutsche Welle Radio', shortName: 'DW Radio', streamUrl: 'https://dw-media-world.akamaized.net/dw_radio/0001/mp3/DW_Radio_en.mp3', genre: 'News' },
  { id: 'rfi', name: 'Radio France Intl', shortName: 'RFI', streamUrl: 'https://rfiafrique48k.ice.infomaniak.ch/rfiafrique-48k.mp3', genre: 'News' },
  { id: 'kusc', name: 'Classical KUSC', shortName: 'KUSC', streamUrl: 'https://kusc.streamguys1.com/kusc-128k.mp3', genre: 'Classical' },
  { id: 'kexp', name: 'KEXP Seattle', shortName: 'KEXP', streamUrl: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3', genre: 'Indie' },
  { id: 'soma-groove', name: 'SomaFM Groove Salad', shortName: 'Groove', streamUrl: 'https://ice4.somafm.com/groovesalad-128-mp3', genre: 'Ambient' },
  { id: 'soma-defcon', name: 'SomaFM DEF CON', shortName: 'DEF CON', streamUrl: 'https://ice4.somafm.com/defcon-128-mp3', genre: 'Electronic' },
  { id: 'jazz24', name: 'Jazz24', shortName: 'Jazz24', streamUrl: 'https://live.wostreaming.net/direct/ppm-jazz24aac-ibc1', genre: 'Jazz' },
];

// ---------------------------------------------------------------------------
// Camera Feeds - 12 real YouTube webcams
// ---------------------------------------------------------------------------
const CAMERA_FEEDS: CameraFeed[] = [
  { id: 'timessquare', name: 'Times Square NYC', shortName: 'Times Sq', videoId: '1-iS7LArMPA', location: 'New York, USA' },
  { id: 'tokyotower', name: 'Tokyo Tower', shortName: 'Tokyo', videoId: 'DjdUEyjx13s', location: 'Tokyo, Japan' },
  { id: 'jackson', name: 'Jackson Hole', shortName: 'Jackson', videoId: 'psfFJR3vZ78', location: 'Wyoming, USA' },
  { id: 'iss', name: 'ISS Earth View', shortName: 'ISS Live', videoId: '86YLFOog4GM', location: 'Space' },
  { id: 'shibuya', name: 'Shibuya Crossing', shortName: 'Shibuya', videoId: '_9AlSEmjo_g', location: 'Tokyo, Japan' },
  { id: 'dublin', name: 'Dublin City', shortName: 'Dublin', videoId: 'Y2WFNdOjGys', location: 'Dublin, Ireland' },
  { id: 'venice', name: 'Venice Grand Canal', shortName: 'Venice', videoId: 'hCMF2JZkIkE', location: 'Venice, Italy' },
  { id: 'miami', name: 'Miami Beach', shortName: 'Miami', videoId: '_cSHxqFPHSA', location: 'Miami, USA' },
  { id: 'niagara', name: 'Niagara Falls', shortName: 'Niagara', videoId: '_cPmQyxhNfU', location: 'Ontario, Canada' },
  { id: 'nyharbor', name: 'New York Harbor', shortName: 'NY Harbor', videoId: 'sLyPg4Dwq6Y', location: 'New York, USA' },
  { id: 'paris', name: 'Paris Eiffel Tower', shortName: 'Paris', videoId: 'U5o9b2RU2Mw', location: 'Paris, France' },
  { id: 'amsterdam', name: 'Amsterdam Canal', shortName: 'Amsterdam', videoId: '8tLOuKYGaOY', location: 'Amsterdam, NL' },
];

const TABS: { key: MediaTab; label: string; icon: typeof Tv }[] = [
  { key: 'tv', label: 'TV', icon: Tv },
  { key: 'radio', label: 'Radio', icon: Radio },
  { key: 'cameras', label: 'Cameras', icon: Camera },
];

function ytEmbed(videoId: string, muted: boolean): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muted ? 1 : 0}&rel=0&modestbranding=1`;
}

export default function LiveMedia() {
  const [activeTab, setActiveTab] = useState<MediaTab>('tv');
  const [activeTVIndex, setActiveTVIndex] = useState(0);
  const [activeRadioIndex, setActiveRadioIndex] = useState(0);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [tvRegionFilter, setTvRegionFilter] = useState('All');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredTVChannels = tvRegionFilter === 'All'
    ? TV_CHANNELS
    : TV_CHANNELS.filter(ch => ch.region === tvRegionFilter);

  const activeTV = filteredTVChannels[activeTVIndex] || TV_CHANNELS[0];
  const activeRadio = RADIO_STATIONS[activeRadioIndex];
  const activeCamera = CAMERA_FEEDS[activeCameraIndex];

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
      audioRef.current.play().then(() => setIsRadioPlaying(true)).catch(() => setIsRadioPlaying(false));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'radio') {
      playAudio(activeRadio.streamUrl);
    } else {
      stopAudio();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'radio') {
      playAudio(activeRadio.streamUrl);
    }
  }, [activeRadioIndex]);

  useEffect(() => {
    if (activeTab !== 'radio') setIframeKey(k => k + 1);
  }, [isMuted]);

  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  // Reset index when filter changes
  useEffect(() => {
    setActiveTVIndex(0);
  }, [tvRegionFilter]);

  const handleTabSwitch = (tab: MediaTab) => {
    setActiveTab(tab);
    if (tab === 'radio') setIsMuted(false);
    else setIsMuted(true);
  };

  const renderChannelButtons = () => {
    if (activeTab === 'tv') {
      return filteredTVChannels.map((ch, idx) => (
        <button key={ch.id} onClick={() => setActiveTVIndex(idx)}
          className={`px-2.5 py-1 rounded text-2xs font-medium transition-all flex-shrink-0 whitespace-nowrap ${
            activeTVIndex === idx
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-300 hover:border-dark-600'
          }`}>{ch.shortName}</button>
      ));
    }
    if (activeTab === 'radio') {
      return RADIO_STATIONS.map((st, idx) => (
        <button key={st.id} onClick={() => setActiveRadioIndex(idx)}
          className={`px-2.5 py-1 rounded text-2xs font-medium transition-all flex-shrink-0 whitespace-nowrap ${
            activeRadioIndex === idx
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-300 hover:border-dark-600'
          }`}>{st.shortName}</button>
      ));
    }
    return CAMERA_FEEDS.map((cam, idx) => (
      <button key={cam.id} onClick={() => setActiveCameraIndex(idx)}
        className={`px-2.5 py-1 rounded text-2xs font-medium transition-all flex-shrink-0 whitespace-nowrap ${
          activeCameraIndex === idx
            ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
            : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-300 hover:border-dark-600'
        }`}>{cam.shortName}</button>
    ));
  };

  const renderPlayer = () => {
    if (activeTab === 'tv') {
      return (
        <iframe key={`tv-${activeTV.id}-${iframeKey}`} src={ytEmbed(activeTV.videoId, isMuted)}
          title={activeTV.name} className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      );
    }
    if (activeTab === 'radio') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-dark-900 via-dark-850 to-dark-950">
          <div className="relative">
            <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
              isRadioPlaying ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/20' : 'border-dark-600 bg-dark-800'
            }`}>
              <Radio size={32} className={isRadioPlaying ? 'text-brand-400' : 'text-dark-500'} />
            </div>
            {isRadioPlaying && (
              <>
                <div className="absolute inset-0 rounded-full border border-brand-500/30 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute -inset-2 rounded-full border border-brand-500/10 animate-ping" style={{ animationDuration: '3s' }} />
              </>
            )}
          </div>
          <div className="text-center px-4">
            <p className="text-sm font-semibold text-dark-100">{activeRadio.name}</p>
            <p className="text-2xs text-dark-500 mt-0.5">{activeRadio.genre}</p>
          </div>
          <button onClick={() => { if (isRadioPlaying) stopAudio(); else playAudio(activeRadio.streamUrl); }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isRadioPlaying ? 'bg-brand-500 hover:bg-brand-600 text-white' : 'bg-dark-700 hover:bg-dark-600 text-dark-300'
            }`}>
            {isRadioPlaying ? (
              <div className="flex items-center gap-0.5"><span className="w-0.5 h-3 bg-white rounded-full" /><span className="w-0.5 h-3 bg-white rounded-full" /></div>
            ) : (<Play size={18} className="ml-0.5" />)}
          </button>
          {isRadioPlaying && (
            <div className="flex items-end gap-0.5 h-4">
              {[...Array(16)].map((_, i) => (
                <div key={i} className="w-1 bg-brand-500/60 rounded-full"
                  style={{ height: `${Math.random() * 100}%`, animation: `pulse-live ${0.3 + Math.random() * 0.6}s ease-in-out infinite alternate`, animationDelay: `${i * 0.04}s` }} />
              ))}
            </div>
          )}
          <audio ref={audioRef} preload="none" />
        </div>
      );
    }
    return (
      <iframe key={`cam-${activeCamera.id}-${iframeKey}`} src={ytEmbed(activeCamera.videoId, isMuted)}
        title={activeCamera.name} className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    );
  };

  const currentLabel = activeTab === 'tv' ? activeTV.name : activeTab === 'radio' ? activeRadio.name : activeCamera.name;
  const currentSublabel = activeTab === 'tv' ? activeTV.region : activeTab === 'radio' ? activeRadio.genre : activeCamera.location;

  return (
    <div className="border-t border-dark-700/50 flex flex-col">
      {/* Header with tabs */}
      <div className="px-3 py-2 border-b border-dark-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-dark-800 rounded-lg p-0.5 border border-dark-700/50">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => handleTabSwitch(key)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-2xs font-semibold transition-all ${
                  activeTab === key ? 'bg-brand-500/20 text-brand-400 shadow-sm' : 'text-dark-400 hover:text-dark-300'
                }`}>
                <Icon size={11} /><span>{label}</span>
              </button>
            ))}
          </div>
          <span className="flex items-center gap-1 bg-red-500/20 rounded px-1.5 py-0.5">
            <span className="live-dot" style={{ width: 5, height: 5 }} />
            <span className="text-red-400 text-2xs font-bold ml-0.5">LIVE</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setIsMuted(!isMuted)} className="p-1 rounded hover:bg-dark-700/50 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? <VolumeX size={13} className="text-dark-500" /> : <Volume2 size={13} className="text-brand-400" />}
          </button>
          <button className="p-1 rounded hover:bg-dark-700/50 transition-colors" title="Fullscreen"
            onClick={() => { const el = document.querySelector('#livemedia-player iframe') as HTMLIFrameElement; el?.requestFullscreen?.(); }}>
            <Maximize2 size={13} className="text-dark-500" />
          </button>
        </div>
      </div>

      {/* Region filter for TV */}
      {activeTab === 'tv' && (
        <div className="px-3 py-1.5 border-b border-dark-700/30 flex items-center gap-1 overflow-x-auto scrollbar-hidden">
          <Filter size={10} className="text-dark-500 flex-shrink-0" />
          {TV_REGIONS.map(region => (
            <button key={region} onClick={() => setTvRegionFilter(region)}
              className={`px-2 py-0.5 rounded-full text-2xs font-medium transition-all flex-shrink-0 ${
                tvRegionFilter === region
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-dark-500 hover:text-dark-300'
              }`}>{region}</button>
          ))}
        </div>
      )}

      {/* Now playing */}
      <div className="px-3 py-1.5 border-b border-dark-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {activeTab === 'tv' && <Tv size={11} className="text-green-400 flex-shrink-0" />}
          {activeTab === 'radio' && <Radio size={11} className="text-green-400 flex-shrink-0" />}
          {activeTab === 'cameras' && <Camera size={11} className="text-green-400 flex-shrink-0" />}
          <span className="text-xs text-dark-200 font-medium truncate">{currentLabel}</span>
          <span className="text-2xs text-dark-500 flex-shrink-0">{currentSublabel}</span>
        </div>
      </div>

      {/* Player */}
      <div id="livemedia-player" className="relative aspect-video bg-dark-950">
        {renderPlayer()}
      </div>

      {/* Channel selector */}
      <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hidden border-t border-dark-700/30">
        {renderChannelButtons()}
      </div>
    </div>
  );
}
