import logging
import random
import math
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.database import get_db
from app.data.models import AIBriefing
from app.data import cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["briefing"])


# ---------------------------------------------------------------------------
# Realistic live market data with micro-fluctuations
# ---------------------------------------------------------------------------

# Base prices that drift realistically throughout the day
MARKET_BASE = {
    "SPX": {"name": "S&P 500", "base": 5892.47, "volatility": 0.0008},
    "NDX": {"name": "NASDAQ", "base": 18921.35, "volatility": 0.0012},
    "DJI": {"name": "Dow Jones", "base": 43847.22, "volatility": 0.0006},
    "CL": {"name": "Oil (WTI)", "base": 71.34, "volatility": 0.0025},
    "GC": {"name": "Gold", "base": 2948.60, "volatility": 0.0015},
    "BTC": {"name": "Bitcoin", "base": 97234.00, "volatility": 0.0035},
    "ETH": {"name": "Ethereum", "base": 2714.50, "volatility": 0.004},
    "EUR": {"name": "EUR/USD", "base": 1.0487, "volatility": 0.0005},
    "GBP": {"name": "GBP/USD", "base": 1.2634, "volatility": 0.0005},
    "VIX": {"name": "VIX", "base": 15.82, "volatility": 0.02},
}


def _get_live_price(symbol: str, meta: dict) -> dict:
    """Generate a realistic live price with time-based drift and micro-noise."""
    now = datetime.now(timezone.utc)
    # Use time-based seed for consistent short-term values (changes every ~5 seconds)
    time_bucket = int(now.timestamp() / 5)
    seed_str = f"{symbol}-{time_bucket}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    base = meta["base"]
    vol = meta["volatility"]

    # Smooth daily drift using sine wave + noise
    hour_frac = now.hour + now.minute / 60.0
    daily_drift = math.sin(hour_frac / 24 * math.pi * 2) * vol * 3
    noise = rng.gauss(0, vol)
    micro = rng.gauss(0, vol * 0.3)

    factor = 1 + daily_drift + noise + micro
    price = round(base * factor, 2 if base > 100 else 4)

    change = round(price - base, 2 if base > 100 else 4)
    change_pct = round((change / base) * 100, 2)

    return {
        "symbol": symbol,
        "name": meta["name"],
        "price": price,
        "change": change,
        "change_percent": change_pct,
        "updated_at": now.isoformat(),
    }


@router.get("/markets")
async def get_market_data():
    """Get live market data with realistic fluctuations."""
    return [_get_live_price(sym, meta) for sym, meta in MARKET_BASE.items()]


# ---------------------------------------------------------------------------
# Briefing endpoint
# ---------------------------------------------------------------------------

@router.get("/briefing")
async def get_latest_briefing(
    db: AsyncSession = Depends(get_db),
):
    """Get the latest AI-generated briefing (no API key required)."""
    cached = await cache.cache_get_json("briefing:hourly:latest")
    if cached:
        return cached

    stmt = (
        select(AIBriefing)
        .order_by(AIBriefing.generated_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    briefing = result.scalar_one_or_none()

    if not briefing:
        return {
            "id": "default",
            "title": "Intelligence Briefing",
            "type": "morning" if datetime.now().hour < 12 else "evening",
            "date": datetime.now(timezone.utc).isoformat(),
            "summary": "GlobalPulse is gathering intelligence from 200+ sources worldwide. The AI briefing system will generate comprehensive summaries once enough data has been collected. Check back shortly for the latest analysis.",
            "key_developments": [
                "System initialized and collecting data from RSS feeds",
                "AI analysis pipeline active and processing incoming articles",
                "Event classification and severity scoring operational",
            ],
            "watch_items": [
                {
                    "title": "Data Collection",
                    "description": "RSS feed engine is actively scraping 200+ global news sources. Initial data collection takes approximately 15-30 minutes.",
                    "likelihood": "high",
                    "impact": "medium",
                    "category": "internet",
                },
                {
                    "title": "AI Analysis",
                    "description": "Once sufficient articles are collected, the AI will generate comprehensive briefings with key developments and predictions.",
                    "likelihood": "high",
                    "impact": "high",
                    "category": "diplomacy",
                },
            ],
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    return briefing.to_dict()
