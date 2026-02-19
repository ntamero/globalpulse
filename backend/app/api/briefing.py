import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.database import get_db
from app.data.models import AIBriefing
from app.data import cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["briefing"])


@router.get("/briefing")
async def get_latest_briefing(
    db: AsyncSession = Depends(get_db),
):
    """Get the latest AI-generated briefing (no API key required)."""
    # Try cache
    cached = await cache.cache_get_json("briefing:hourly:latest")
    if cached:
        return cached

    # Fetch from database
    stmt = (
        select(AIBriefing)
        .order_by(AIBriefing.generated_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    briefing = result.scalar_one_or_none()

    if not briefing:
        # Return a default briefing structure so frontend can render
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


@router.get("/markets")
async def get_market_data():
    """Get market data (mock data for now, can be integrated with real APIs)."""
    # In production, integrate with a financial data API
    # For now, return mock market data
    return [
        {"symbol": "SPX", "name": "S&P 500", "price": 5218.42, "change": 23.56, "change_percent": 0.45},
        {"symbol": "NDX", "name": "NASDAQ", "price": 16340.87, "change": -45.23, "change_percent": -0.28},
        {"symbol": "CL", "name": "Oil (WTI)", "price": 78.34, "change": 1.87, "change_percent": 2.44},
        {"symbol": "GC", "name": "Gold", "price": 2348.60, "change": 12.30, "change_percent": 0.53},
        {"symbol": "BTC", "name": "Bitcoin", "price": 67234.00, "change": -1234.00, "change_percent": -1.80},
    ]
