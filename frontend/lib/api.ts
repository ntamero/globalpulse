const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface FetchOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cache?: RequestCache;
  revalidate?: number;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, headers = {}, signal, cache, revalidate } = options;

  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal,
  };

  if (cache) fetchOptions.cache = cache;
  if (revalidate !== undefined) fetchOptions.next = { revalidate };

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// --- Types ---

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  source_url?: string;
  url: string;
  category: string;
  published_at: string;
  image_url?: string;
  is_breaking?: boolean;
  sentiment?: number;
  region?: string;
}

export interface NewsResponse {
  items: NewsItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  severity: number;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
    name: string;
    country?: string;
  };
  sources: string[];
  is_developing?: boolean;
}

export interface EventsResponse {
  items: EventItem[];
  total: number;
}

export interface BriefingItem {
  title: string;
  description: string;
  likelihood: 'high' | 'medium' | 'low';
  impact: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

export interface Briefing {
  id: string;
  title: string;
  type: 'morning' | 'evening';
  date: string;
  summary: string;
  key_developments: string[];
  watch_items: BriefingItem[];
  generated_at: string;
}

export interface StreamChannel {
  id: string;
  name: string;
  type: 'tv' | 'radio' | 'webcam';
  url: string;
  embed_url?: string;
  thumbnail?: string;
  is_live: boolean;
  language: string;
  region?: string;
}

export interface MapEvent {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: string;
  severity: number;
  timestamp: string;
  description?: string;
}

export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
}

// --- API Functions ---

export async function fetchNews(params?: {
  category?: string;
  region?: string;
  page?: number;
  per_page?: number;
  q?: string;
}): Promise<NewsResponse> {
  return apiFetch<NewsResponse>('/news', { params, revalidate: 30 });
}

export async function fetchBreakingNews(): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>('/news/breaking', { revalidate: 15 });
}

export async function fetchEvents(params?: {
  category?: string;
  severity_min?: number;
  days?: number;
  region?: string;
}): Promise<EventsResponse> {
  return apiFetch<EventsResponse>('/events/timeline', { params, revalidate: 30 });
}

export async function fetchMapEvents(): Promise<MapEvent[]> {
  return apiFetch<MapEvent[]>('/events/map', { revalidate: 60 });
}

export async function fetchBriefing(): Promise<Briefing> {
  return apiFetch<Briefing>('/briefing', { revalidate: 300 });
}

export async function fetchStreams(type?: 'tv' | 'radio' | 'webcam'): Promise<StreamChannel[]> {
  return apiFetch<StreamChannel[]>('/streams/tv', { params: { type: type || '' }, revalidate: 120 });
}

export async function fetchMarketData(): Promise<MarketData[]> {
  return apiFetch<MarketData[]>('/markets', { revalidate: 60 });
}

// --- Mock Data Generators (used as fallbacks) ---

export function getMockBreakingNews(): NewsItem[] {
  return [
    {
      id: '1',
      title: 'UN Security Council calls emergency session on escalating Middle East tensions',
      source: 'Reuters',
      url: '#',
      category: 'diplomacy',
      published_at: new Date(Date.now() - 5 * 60000).toISOString(),
      is_breaking: true,
    },
    {
      id: '2',
      title: 'Major cyberattack disrupts banking systems across three European nations',
      source: 'BBC News',
      url: '#',
      category: 'internet',
      published_at: new Date(Date.now() - 12 * 60000).toISOString(),
      is_breaking: true,
    },
    {
      id: '3',
      title: 'Earthquake magnitude 6.8 strikes off the coast of Japan, tsunami warning issued',
      source: 'AP News',
      url: '#',
      category: 'humanitarian',
      published_at: new Date(Date.now() - 18 * 60000).toISOString(),
      is_breaking: true,
    },
    {
      id: '4',
      title: 'EU announces sweeping new sanctions package targeting energy sector',
      source: 'Al Jazeera',
      url: '#',
      category: 'sanctions',
      published_at: new Date(Date.now() - 25 * 60000).toISOString(),
      is_breaking: true,
    },
    {
      id: '5',
      title: 'Mass protests erupt in multiple capital cities demanding climate action',
      source: 'The Guardian',
      url: '#',
      category: 'protests',
      published_at: new Date(Date.now() - 33 * 60000).toISOString(),
      is_breaking: true,
    },
  ];
}

export function getMockHeadlines(): NewsItem[] {
  const categories = ['protests', 'sanctions', 'diplomacy', 'conflict', 'internet', 'economy', 'military', 'humanitarian'];
  return [
    { id: 'h1', title: 'EU foreign ministers to hold emergency summit on regional security framework', source: 'Reuters', url: '#', category: 'diplomacy', published_at: new Date(Date.now() - 8 * 60000).toISOString() },
    { id: 'h2', title: 'Internet disruptions reported across Central Asia following infrastructure damage', source: 'NetBlocks', url: '#', category: 'internet', published_at: new Date(Date.now() - 15 * 60000).toISOString() },
    { id: 'h3', title: 'Opposition groups call for nationwide strike amid rising cost of living', source: 'Al Jazeera', url: '#', category: 'protests', published_at: new Date(Date.now() - 23 * 60000).toISOString() },
    { id: 'h4', title: 'Central bank raises interest rates to 15-year high to combat inflation', source: 'Bloomberg', url: '#', category: 'economy', published_at: new Date(Date.now() - 31 * 60000).toISOString() },
    { id: 'h5', title: 'New sanctions target shipping networks linked to illicit oil trade', source: 'BBC News', url: '#', category: 'sanctions', published_at: new Date(Date.now() - 42 * 60000).toISOString() },
    { id: 'h6', title: 'Ceasefire negotiations stall as both sides accuse each other of violations', source: 'AP News', url: '#', category: 'conflict', published_at: new Date(Date.now() - 55 * 60000).toISOString() },
    { id: 'h7', title: 'Military exercises near disputed border raise tensions in the region', source: 'Jane\'s Defence', url: '#', category: 'military', published_at: new Date(Date.now() - 68 * 60000).toISOString() },
    { id: 'h8', title: 'Humanitarian corridor established for civilian evacuation from conflict zone', source: 'UNHCR', url: '#', category: 'humanitarian', published_at: new Date(Date.now() - 74 * 60000).toISOString() },
    { id: 'h9', title: 'Tech companies face new regulatory framework in sweeping digital markets act', source: 'TechCrunch', url: '#', category: 'economy', published_at: new Date(Date.now() - 90 * 60000).toISOString() },
    { id: 'h10', title: 'Mass detention of protesters reported following weekend demonstrations', source: 'Human Rights Watch', url: '#', category: 'protests', published_at: new Date(Date.now() - 105 * 60000).toISOString() },
    { id: 'h11', title: 'Diplomatic envoy arrives for high-stakes negotiations on nuclear agreement', source: 'The Guardian', url: '#', category: 'diplomacy', published_at: new Date(Date.now() - 120 * 60000).toISOString() },
  ];
}

export function getMockEvents(): EventItem[] {
  return [
    { id: 'e1', title: 'UN Emergency Session Called', description: 'Security Council convenes for emergency meeting on escalating regional conflict.', category: 'diplomacy', severity: 9, timestamp: new Date(Date.now() - 10 * 60000).toISOString(), sources: ['Reuters', 'AP'], is_developing: true, location: { lat: 40.749, lng: -73.968, name: 'New York', country: 'US' } },
    { id: 'e2', title: 'Banking Systems Cyberattack', description: 'Coordinated cyberattack disrupts major banking infrastructure across Europe.', category: 'internet', severity: 8, timestamp: new Date(Date.now() - 25 * 60000).toISOString(), sources: ['BBC', 'Reuters'], is_developing: true, location: { lat: 50.85, lng: 4.35, name: 'Brussels', country: 'BE' } },
    { id: 'e3', title: 'Earthquake Off Japan Coast', description: 'Magnitude 6.8 earthquake triggers tsunami warnings for coastal regions.', category: 'humanitarian', severity: 8, timestamp: new Date(Date.now() - 40 * 60000).toISOString(), sources: ['USGS', 'NHK'], is_developing: false, location: { lat: 38.5, lng: 142.5, name: 'Miyagi Coast', country: 'JP' } },
    { id: 'e4', title: 'EU Sanctions Package Announced', description: 'New comprehensive sanctions targeting energy sector exports.', category: 'sanctions', severity: 7, timestamp: new Date(Date.now() - 60 * 60000).toISOString(), sources: ['EU Council'], is_developing: false, location: { lat: 50.85, lng: 4.35, name: 'Brussels', country: 'BE' } },
    { id: 'e5', title: 'Climate Protests Escalate', description: 'Tens of thousands march in coordinated global climate action protests.', category: 'protests', severity: 6, timestamp: new Date(Date.now() - 90 * 60000).toISOString(), sources: ['Guardian', 'AFP'], is_developing: false, location: { lat: 48.856, lng: 2.352, name: 'Paris', country: 'FR' } },
    { id: 'e6', title: 'Central Bank Rate Decision', description: 'Interest rates raised to highest level in over a decade amid inflation concerns.', category: 'economy', severity: 6, timestamp: new Date(Date.now() - 120 * 60000).toISOString(), sources: ['Bloomberg', 'FT'], is_developing: false, location: { lat: 51.507, lng: -0.128, name: 'London', country: 'GB' } },
    { id: 'e7', title: 'Military Buildup Near Border', description: 'Satellite imagery reveals significant troop movements near disputed territory.', category: 'military', severity: 8, timestamp: new Date(Date.now() - 150 * 60000).toISOString(), sources: ['Jane\'s', 'Reuters'], is_developing: true, location: { lat: 36.2, lng: 37.15, name: 'Northern Border Region', country: 'SY' } },
    { id: 'e8', title: 'Ceasefire Negotiations Collapse', description: 'Peace talks break down as parties fail to agree on prisoner exchange terms.', category: 'conflict', severity: 7, timestamp: new Date(Date.now() - 180 * 60000).toISOString(), sources: ['Al Jazeera', 'AP'], is_developing: false, location: { lat: 46.95, lng: 31.99, name: 'Mykolaiv', country: 'UA' } },
  ];
}

export function getMockBriefing(): Briefing {
  const hour = new Date().getHours();
  const type = hour < 12 ? 'morning' : 'evening';
  return {
    id: 'briefing-1',
    title: type === 'morning' ? 'Morning Briefing' : 'Evening Briefing',
    type,
    date: new Date().toISOString(),
    summary: 'Diplomatic tensions dominate the global landscape today as the UN Security Council convenes an emergency session amid escalating regional conflicts. A coordinated cyberattack has disrupted banking systems across three European nations, raising concerns about critical infrastructure vulnerability. Meanwhile, a magnitude 6.8 earthquake off Japan has prompted tsunami warnings, and the EU has unveiled a new comprehensive sanctions package targeting energy exports.',
    key_developments: [
      'UN Security Council emergency session convened for the third time this month',
      'Coordinated banking cyberattack affects payment systems in Belgium, Netherlands, and Luxembourg',
      'EU sanctions package includes oil price cap mechanism and shipping restrictions',
      'Climate protests draw estimated 2 million participants across 40 countries',
    ],
    watch_items: [
      { title: 'Ceasefire Deadline', description: 'The 72-hour ceasefire window expires at midnight UTC. Both sides have reported violations, and mediators warn of potential escalation if terms are not renewed.', likelihood: 'high', impact: 'critical', category: 'conflict' },
      { title: 'Central Bank Policy Meeting', description: 'Three major central banks announce rate decisions this week. Markets expect a 50bp hike from the ECB, with potential ripple effects across emerging markets.', likelihood: 'medium', impact: 'high', category: 'economy' },
      { title: 'Internet Shutdown Risk', description: 'Authorities in two countries have signaled potential internet restrictions ahead of planned opposition rallies scheduled for the weekend.', likelihood: 'medium', impact: 'high', category: 'internet' },
      { title: 'Nuclear Talks Resumption', description: 'Diplomatic envoys are meeting in Vienna for a new round of nuclear agreement negotiations. Breakthrough remains unlikely but incremental progress is possible.', likelihood: 'low', impact: 'critical', category: 'diplomacy' },
    ],
    generated_at: new Date().toISOString(),
  };
}

export function getMockStreams(): StreamChannel[] {
  return [
    { id: 's1', name: 'Al Jazeera English', type: 'tv', url: 'https://www.youtube.com/watch?v=gCNeDWCI0vo', embed_url: 'https://www.youtube.com/embed/gCNeDWCI0vo', thumbnail: 'https://i.ytimg.com/vi/gCNeDWCI0vo/hqdefault.jpg', is_live: true, language: 'en', region: 'Middle East' },
    { id: 's2', name: 'France 24 English', type: 'tv', url: 'https://www.youtube.com/watch?v=h3MuIUNCCzI', embed_url: 'https://www.youtube.com/embed/h3MuIUNCCzI', thumbnail: 'https://i.ytimg.com/vi/h3MuIUNCCzI/hqdefault.jpg', is_live: true, language: 'en', region: 'Europe' },
    { id: 's3', name: 'DW News', type: 'tv', url: 'https://www.youtube.com/watch?v=GE_SfNVNyqo', embed_url: 'https://www.youtube.com/embed/GE_SfNVNyqo', thumbnail: 'https://i.ytimg.com/vi/GE_SfNVNyqo/hqdefault.jpg', is_live: true, language: 'en', region: 'Europe' },
    { id: 's4', name: 'WION', type: 'tv', url: 'https://www.youtube.com/watch?v=U30MYhpkSMc', embed_url: 'https://www.youtube.com/embed/U30MYhpkSMc', thumbnail: 'https://i.ytimg.com/vi/U30MYhpkSMc/hqdefault.jpg', is_live: true, language: 'en', region: 'Asia' },
    { id: 's5', name: 'TRT World', type: 'tv', url: 'https://www.youtube.com/watch?v=CV5Fooi6v9A', embed_url: 'https://www.youtube.com/embed/CV5Fooi6v9A', thumbnail: 'https://i.ytimg.com/vi/CV5Fooi6v9A/hqdefault.jpg', is_live: true, language: 'en', region: 'Middle East' },
    { id: 's6', name: 'Sky News', type: 'tv', url: 'https://www.youtube.com/watch?v=9Auq9mYxFEE', embed_url: 'https://www.youtube.com/embed/9Auq9mYxFEE', thumbnail: 'https://i.ytimg.com/vi/9Auq9mYxFEE/hqdefault.jpg', is_live: true, language: 'en', region: 'Europe' },
  ];
}

export function getMockLiveFeed() {
  return [
    {
      id: 'lf1',
      author: { name: 'Christiane Amanpour', handle: '@aaborjin', avatar: '', verified: true },
      content: 'BREAKING: Sources confirm UN Security Council emergency session will address the escalating situation. Multiple draft resolutions under discussion. Full coverage ahead.',
      timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
      engagement: { replies: 234, retweets: 1893, likes: 5621 },
      platform: 'twitter' as const,
    },
    {
      id: 'lf2',
      author: { name: 'BBC Breaking', handle: '@BBCBreaking', avatar: '', verified: true },
      content: 'Major cyberattack on European banking systems - Belgium, Netherlands and Luxembourg affected. Authorities investigating suspected state-sponsored operation.',
      timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
      engagement: { replies: 892, retweets: 12400, likes: 18200 },
      platform: 'twitter' as const,
    },
    {
      id: 'lf3',
      author: { name: 'OSINT Aggregator', handle: '@OSINTech', avatar: '', verified: false },
      content: 'Satellite imagery from this morning shows significant military vehicle movements along the northern border. Estimated 200+ armored vehicles repositioned in last 48 hours.',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      engagement: { replies: 156, retweets: 3421, likes: 7823 },
      platform: 'twitter' as const,
    },
    {
      id: 'lf4',
      author: { name: 'Reuters', handle: '@Reuters', avatar: '', verified: true },
      content: 'EU foreign policy chief says new sanctions package "sends unmistakable signal" - includes oil price cap, shipping restrictions, and expanded entity listings.',
      timestamp: new Date(Date.now() - 22 * 60000).toISOString(),
      engagement: { replies: 445, retweets: 6732, likes: 11500 },
      platform: 'twitter' as const,
    },
    {
      id: 'lf5',
      author: { name: 'Conflict Monitor', handle: '@ConflictTracker', avatar: '', verified: false },
      content: 'Ceasefire deadline approaches with both sides reporting violations in the last 12 hours. Mediators conducting shuttle diplomacy. Next 24 hours critical.',
      timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
      engagement: { replies: 89, retweets: 1567, likes: 3200 },
      platform: 'twitter' as const,
    },
    {
      id: 'lf6',
      author: { name: 'NetBlocks', handle: '@netblocks', avatar: '', verified: true },
      content: 'Confirmed: Internet disruptions detected across Central Asia. Network data shows significant drop in connectivity affecting multiple providers since 14:00 UTC.',
      timestamp: new Date(Date.now() - 48 * 60000).toISOString(),
      engagement: { replies: 203, retweets: 4521, likes: 8900 },
      platform: 'twitter' as const,
    },
  ];
}

export function getMockMarketData(): MarketData[] {
  return [
    { symbol: 'SPX', name: 'S&P 500', price: 5218.42, change: 23.56, change_percent: 0.45 },
    { symbol: 'NDX', name: 'NASDAQ', price: 16340.87, change: -45.23, change_percent: -0.28 },
    { symbol: 'CL', name: 'Oil (WTI)', price: 78.34, change: 1.87, change_percent: 2.44 },
    { symbol: 'GC', name: 'Gold', price: 2348.60, change: 12.30, change_percent: 0.53 },
    { symbol: 'BTC', name: 'Bitcoin', price: 67234.00, change: -1234.00, change_percent: -1.80 },
  ];
}
