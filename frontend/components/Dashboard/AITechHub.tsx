'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, Sparkles, TrendingUp, ExternalLink, Clock, Zap, Bot, Cpu, ArrowRight } from 'lucide-react';

interface AINewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
  published_at: string;
  isNew?: boolean;
}

const CATEGORIES = ['All', 'AI Models', 'Prompts & Skills', 'Agents', 'Robotics', 'Startups', 'Research'];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'AI Models': { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  'Prompts & Skills': { bg: 'bg-green-500/15', text: 'text-green-400' },
  'Agents': { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  'Robotics': { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  'Startups': { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  'Research': { bg: 'bg-blue-500/15', text: 'text-blue-400' },
};

const TRENDING_TOPICS = [
  'GPT-5 Release', 'Claude 4 Opus', 'Gemini 2.5', 'Open Source LLMs', 'AI Regulation EU',
  'Neuralink V2', 'AI Chip Wars', 'Robot Workers', 'Sora Video AI', 'AI Code Agents',
  'Quantum Computing', 'AI Safety Summit', 'Apple AI', 'xAI Grok 3', 'DeepSeek R2',
  'AI in Healthcare', 'Autonomous Vehicles', 'AI Music Generation', 'Digital Twins', 'AGI Debate',
];

const MOCK_AI_NEWS: AINewsItem[] = [
  { id: 'ai1', title: 'OpenAI Announces GPT-5 with Native Multimodal Reasoning', summary: 'The new model demonstrates breakthrough capabilities in complex reasoning, visual understanding, and real-time audio processing with significantly reduced hallucination rates.', source: 'TechCrunch', url: '#', category: 'AI Models', published_at: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: 'ai2', title: 'Anthropic Publishes Constitutional AI Safety Breakthrough', summary: 'New research paper details a novel approach to AI alignment that significantly improves safety without sacrificing performance on key benchmarks.', source: 'MIT Tech Review', url: '#', category: 'Research', published_at: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: 'ai3', title: 'Meta Releases Open Source LLM Surpassing GPT-4 Turbo', summary: 'Llama 4 demonstrates superior performance across 15 major benchmarks while being fully open-source and optimizable for consumer hardware.', source: 'The Verge', url: '#', category: 'AI Models', published_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'ai4', title: 'Google DeepMind Unveils AI Agent That Writes & Deploys Software', summary: 'Project Mariner can autonomously write, test, debug, and deploy full-stack applications from natural language specifications.', source: 'Ars Technica', url: '#', category: 'Agents', published_at: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 'ai5', title: 'New AI Prompt Engineering Framework Doubles Output Quality', summary: 'Researchers discover systematic prompt patterns that consistently improve LLM outputs across coding, writing, and analysis tasks.', source: 'VentureBeat', url: '#', category: 'Prompts & Skills', published_at: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: 'ai6', title: 'Boston Dynamics Robot Learns Tasks from Single Video Demonstration', summary: 'New AI system enables humanoid robots to learn complex physical tasks by watching a single demonstration video, no coding required.', source: 'Wired', url: '#', category: 'Robotics', published_at: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'ai7', title: 'AI Startup Raises $2B to Build Personal AI Assistant', summary: 'Founded by former Google Brain researchers, the company aims to create an AI that manages your entire digital life across all devices.', source: 'TechCrunch', url: '#', category: 'Startups', published_at: new Date(Date.now() - 6 * 3600000).toISOString() },
  { id: 'ai8', title: 'EU Passes Comprehensive AI Act with Strict Enforcement Rules', summary: 'Landmark legislation establishes tiered risk categories for AI systems with heavy fines for non-compliance starting 2026.', source: 'Reuters', url: '#', category: 'Research', published_at: new Date(Date.now() - 7 * 3600000).toISOString() },
  { id: 'ai9', title: 'Claude AI Agents Can Now Browse Web and Execute Code Autonomously', summary: 'Anthropic releases agentic capabilities letting Claude perform multi-step tasks across web, files, and code environments.', source: 'The Verge', url: '#', category: 'Agents', published_at: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: 'ai10', title: 'NVIDIA Reveals Next-Gen AI Chip with 3x Performance Per Watt', summary: 'Blackwell Ultra architecture promises to dramatically reduce the cost of AI training and inference for enterprise customers.', source: 'Ars Technica', url: '#', category: 'Startups', published_at: new Date(Date.now() - 9 * 3600000).toISOString() },
  { id: 'ai11', title: 'Figure AI Robot Handles Warehouse Tasks Better Than Humans', summary: 'New benchmarks show Figure 02 humanoid completing pick-and-pack operations 40% faster with 99.7% accuracy rate.', source: 'Wired', url: '#', category: 'Robotics', published_at: new Date(Date.now() - 10 * 3600000).toISOString() },
  { id: 'ai12', title: 'Breakthrough: AI System Discovers New Antibiotic Compound', summary: 'MIT researchers use AI to identify a novel antibiotic effective against drug-resistant bacteria, potentially saving millions of lives.', source: 'MIT Tech Review', url: '#', category: 'Research', published_at: new Date(Date.now() - 12 * 3600000).toISOString() },
];

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AITechHub() {
  const [news, setNews] = useState<AINewsItem[]>(MOCK_AI_NEWS);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const tickerRef = useRef<HTMLDivElement>(null);

  // Fetch real AI/tech news from API
  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news?category=technology&limit=20');
      if (!res.ok) return;
      const data = await res.json();
      const articles = Array.isArray(data) ? data : Array.isArray(data?.articles) ? data.articles : [];
      if (articles.length > 0) {
        const normalized: AINewsItem[] = articles.map((a: any) => ({
          id: a.id || String(Math.random()),
          title: a.title || '',
          summary: a.summary || a.description || '',
          source: a.source || a.source_name || 'Unknown',
          url: a.url || a.source_url || '#',
          category: categorizeArticle(a.title || ''),
          published_at: a.published_at || a.scraped_at || new Date().toISOString(),
          isNew: (Date.now() - new Date(a.published_at || a.scraped_at || '').getTime()) < 30 * 60000,
        }));
        setNews(normalized);
      }
    } catch { /* keep mock data */ }
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 15000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const filtered = activeCategory === 'All' ? news : news.filter(n => n.category === activeCategory);
  const featured = filtered[0];
  const gridItems = filtered.slice(1, 7);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="card-header py-2.5">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-purple-400" />
          <h2 className="text-sm font-bold text-dark-100">AI & Tech Hub</h2>
          <span className="flex items-center gap-1 bg-purple-500/15 rounded px-1.5 py-0.5">
            <Sparkles size={9} className="text-purple-400" />
            <span className="text-2xs text-purple-400 font-semibold">LIVE</span>
          </span>
        </div>
        <span className="text-2xs text-dark-500">Updated {formatTime(lastUpdate.toISOString())}</span>
      </div>

      {/* Trending Topics Ticker */}
      <div className="border-b border-dark-700/50 overflow-hidden relative">
        <div className="flex items-center">
          <span className="bg-purple-500/20 text-purple-400 text-2xs font-bold px-2 py-1.5 flex-shrink-0 flex items-center gap-1 z-10">
            <TrendingUp size={10} /> TRENDING
          </span>
          <div className="overflow-hidden flex-1">
            <div ref={tickerRef} className="flex items-center gap-4 animate-scroll-slow whitespace-nowrap py-1.5 px-3">
              {[...TRENDING_TOPICS, ...TRENDING_TOPICS].map((topic, i) => (
                <span key={i} className="text-2xs text-dark-400 hover:text-purple-400 cursor-pointer transition-colors flex-shrink-0">
                  #{topic.replace(/\s+/g, '')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hidden border-b border-dark-700/30">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-full text-2xs font-medium transition-all flex-shrink-0 ${
              activeCategory === cat
                ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/40'
            }`}>{cat}</button>
        ))}
      </div>

      {/* Featured Article */}
      {featured && (
        <a href={featured.url} target="_blank" rel="noopener noreferrer"
          className="block px-3 py-3 border-b border-dark-700/50 hover:bg-dark-800/40 transition-colors group">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {CATEGORY_COLORS[featured.category] && (
                  <span className={`${CATEGORY_COLORS[featured.category].bg} ${CATEGORY_COLORS[featured.category].text} text-2xs font-semibold rounded px-1.5 py-0.5`}>
                    {featured.category}
                  </span>
                )}
                {featured.isNew && (
                  <span className="bg-red-500/20 text-red-400 text-2xs font-bold rounded px-1.5 py-0.5 animate-pulse">NEW</span>
                )}
              </div>
              <h3 className="text-sm font-bold text-dark-100 group-hover:text-brand-400 transition-colors leading-snug mb-1">
                {featured.title}
              </h3>
              <p className="text-xs text-dark-400 line-clamp-2 leading-relaxed mb-2">{featured.summary}</p>
              <div className="flex items-center gap-2 text-2xs text-dark-500">
                <span className="font-medium">{featured.source}</span>
                <span>·</span>
                <Clock size={9} />
                <span>{formatTime(featured.published_at)}</span>
              </div>
            </div>
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Bot size={28} className="text-purple-400/60" />
            </div>
          </div>
        </a>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-dark-700/30">
        {gridItems.map((item) => (
          <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
            className="block px-3 py-2.5 border-b border-dark-700/30 hover:bg-dark-800/40 transition-all group">
            <div className="flex items-center gap-2 mb-1">
              {CATEGORY_COLORS[item.category] && (
                <span className={`${CATEGORY_COLORS[item.category].bg} ${CATEGORY_COLORS[item.category].text} text-2xs font-semibold rounded px-1.5 py-0.5`}>
                  {item.category}
                </span>
              )}
              {item.isNew && <span className="bg-red-500/20 text-red-400 text-2xs font-bold rounded px-1 py-0.5">NEW</span>}
            </div>
            <h4 className="text-xs font-semibold text-dark-200 group-hover:text-brand-400 transition-colors leading-snug line-clamp-2 mb-1">
              {item.title}
            </h4>
            <div className="flex items-center gap-1.5 text-2xs text-dark-500">
              <span>{item.source}</span>
              <span>·</span>
              <span>{formatTime(item.published_at)}</span>
            </div>
          </a>
        ))}
      </div>

      {/* View All */}
      <div className="px-3 py-2 border-t border-dark-700/50 flex items-center justify-center">
        <button className="text-2xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition-colors">
          View All AI & Tech News <ArrowRight size={10} />
        </button>
      </div>

      <style jsx>{`
        @keyframes scroll-slow { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-scroll-slow { animation: scroll-slow 30s linear infinite; }
      `}</style>
    </div>
  );
}

function categorizeArticle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('gpt') || lower.includes('llm') || lower.includes('model') || lower.includes('claude') || lower.includes('gemini')) return 'AI Models';
  if (lower.includes('prompt') || lower.includes('skill')) return 'Prompts & Skills';
  if (lower.includes('agent') || lower.includes('autonom')) return 'Agents';
  if (lower.includes('robot') || lower.includes('humanoid')) return 'Robotics';
  if (lower.includes('startup') || lower.includes('raises') || lower.includes('funding') || lower.includes('chip') || lower.includes('nvidia')) return 'Startups';
  return 'Research';
}
