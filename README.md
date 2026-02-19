# GlobalPulse

**Real-Time World Intelligence Dashboard**

GlobalPulse is a self-hosted, AI-powered global news monitoring and OSINT dashboard. It aggregates 200+ news sources, provides AI-generated briefings, live TV/radio streams, interactive world maps, and event timelines — all in real-time.

## Features

- **200+ RSS Sources** — Real-time news from Reuters, BBC, Al Jazeera, CNN, and 200+ global sources
- **AI Briefings** — Hourly AI-generated intelligence summaries powered by Groq (Llama 3.3 70B)
- **Interactive World Map** — Event markers with severity scoring and category filtering
- **Events Timeline** — Filterable timeline with category badges (Conflict, Diplomacy, Economy, etc.)
- **Live TV & Radio** — 20+ live news channels (Al Jazeera, BBC, France 24, DW, etc.)
- **Breaking News Ticker** — Real-time scrolling breaking news banner
- **Auto-Translation** — Automatic UI translation based on visitor's language (13 languages)
- **SEO Optimized** — News sitemap, JSON-LD structured data, OpenGraph tags
- **Dark Mode** — Professional dark theme inspired by top OSINT dashboards
- **Public API** — Monetizable REST API with rate limiting

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Leaflet |
| Backend | Python FastAPI, SQLAlchemy, APScheduler |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| AI | Groq API (Llama 3.3 70B) |
| Proxy | Nginx |
| Deploy | Docker Compose |

## Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/globalpulse.git
cd globalpulse

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run
docker compose up -d

# Open
open http://localhost
```

## Requirements

- Docker & Docker Compose
- 4+ CPU cores, 4+ GB RAM
- Groq API key (free at groq.com)

## Screenshots

*Coming soon*

## License

MIT License - see [LICENSE](LICENSE)

## Contributing

Pull requests welcome! Please read our contributing guidelines first.

---

Built with intelligence by GlobalPulse Contributors
