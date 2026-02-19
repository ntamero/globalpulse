# GlobalPulse

**Real-time global intelligence dashboard** — AI-powered news aggregation, geopolitical monitoring, and infrastructure tracking in a unified situational awareness interface.

[![GitHub stars](https://img.shields.io/github/stars/ntamero/globalpulse?style=social)](https://github.com/ntamero/globalpulse/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/ntamero/globalpulse?style=social)](https://github.com/ntamero/globalpulse/network/members)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Last commit](https://img.shields.io/github/last-commit/ntamero/globalpulse)](https://github.com/ntamero/globalpulse/commits/main)

<p align="center">
  <a href="http://46.62.167.252"><img src="https://img.shields.io/badge/Live_Dashboard-46.62.167.252-blue?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Dashboard"></a>
</p>

## Features

- 🌍 **35+ Data Layers** — Conflicts, military bases, nuclear facilities, undersea cables, protests, earthquakes, fires
- 📰 **150+ RSS News Feeds** — BBC, CNN, Reuters, Al Jazeera, Guardian, NPR, and more
- 📺 **Live TV Streams** — Bloomberg, Sky News, Euronews, DW, France24, Al Arabiya, Al Jazeera
- 🗺️ **Interactive 3D Globe** — deck.gl + MapLibre with WebGL rendering
- 📊 **Market Data** — Stocks, crypto, forex, commodities via Yahoo Finance and CoinGecko
- 🤖 **AI Analysis** — Groq/OpenRouter powered summarization and risk scoring
- 🌐 **13 Languages** — EN, FR, ES, DE, IT, PL, PT, NL, SV, RU, AR, ZH, JA, TR
- 📱 **PWA** — Installable progressive web app with offline map caching
- 🔒 **Self-Hosted** — Docker deployment on your own infrastructure

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Map**: deck.gl + MapLibre GL
- **AI**: Groq / OpenRouter (optional)
- **Deployment**: Docker + nginx + Express.js
- **Data**: 60+ API integrations (RSS, REST, WebSocket)

## Self-Hosted Deployment

```bash
# Clone the repository
git clone https://github.com/ntamero/globalpulse.git
cd globalpulse

# Configure environment (all keys optional)
cp .env.example .env

# Build and start
docker compose build
docker compose up -d
```

The dashboard will be available at `http://your-server:80`

## Environment Variables

All API keys are optional — the dashboard works without them, but corresponding features will be disabled.

| Key | Service | Free Tier |
|-----|---------|-----------|
| `GROQ_API_KEY` | AI Summarization | 14,400 req/day |
| `FINNHUB_API_KEY` | Stock Quotes | Yes |
| `EIA_API_KEY` | Oil/Energy Data | Yes |
| `FRED_API_KEY` | Economic Data | Yes |
| `ACLED_ACCESS_TOKEN` | Conflict Data | Researcher access |
| `CLOUDFLARE_API_TOKEN` | Internet Outages | Yes |
| `NASA_FIRMS_API_KEY` | Satellite Fires | Yes |

See `.env.example` for the full list.

## Architecture

```
┌─────────────────────────────────────────────┐
│                   nginx :80                  │
│              (reverse proxy + gzip)          │
├─────────────────────────────────────────────┤
│              Express.js :3000                │
│   ┌─────────────┬──────────────────────┐    │
│   │  Static SPA │   API Proxy Layer    │    │
│   │  (Vite build)│  48 RSS + 47 APIs   │    │
│   └─────────────┴──────────────────────┘    │
├─────────────────────────────────────────────┤
│         External Data Sources                │
│  Yahoo Finance · CoinGecko · USGS · GDELT   │
│  BBC · Reuters · CNN · Al Jazeera · ...     │
└─────────────────────────────────────────────┘
```

## Credits

Based on [World Monitor](https://github.com/koala73/worldmonitor) by Elie Habib (AGPL-3.0).
Customized and self-hosted by the GlobalPulse team.

## License

AGPL-3.0 — See [LICENSE](LICENSE) for details.
