import os
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.database import get_db
from app.data.models import Article, Event, AIBriefing
from app.data import cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["public_api"])

# API key validation
VALID_API_KEYS: set[str] = set()
_api_keys_env = os.getenv("API_KEYS", "")
if _api_keys_env:
    VALID_API_KEYS = {k.strip() for k in _api_keys_env.split(",") if k.strip()}

# Rate limiting: requests per minute per API key
RATE_LIMIT_RPM = int(os.getenv("RATE_LIMIT_RPM", "60"))
RATE_LIMIT_WINDOW = 60  # seconds


async def _validate_api_key(request: Request) -> str:
    """Validate the API key from query params or headers."""
    api_key = request.query_params.get("api_key") or request.headers.get(
        "X-API-Key"
    )

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "API key required",
                "message": "Provide an API key via 'api_key' query parameter or 'X-API-Key' header.",
            },
        )

    # If no API keys are configured, accept any key (development mode)
    if VALID_API_KEYS and api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Invalid API key",
                "message": "The provided API key is not valid.",
            },
        )

    return api_key


async def _rate_limit(request: Request, api_key: str) -> None:
    """Check rate limiting for the given API key."""
    rate_key = f"ratelimit:{api_key}"

    try:
        current = await cache.cache_get(rate_key)
        if current is not None:
            count = int(current)
            if count >= RATE_LIMIT_RPM:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "message": f"Maximum {RATE_LIMIT_RPM} requests per minute.",
                        "retry_after": RATE_LIMIT_WINDOW,
                    },
                    headers={"Retry-After": str(RATE_LIMIT_WINDOW)},
                )
            await cache.cache_set(rate_key, str(count + 1), ttl=RATE_LIMIT_WINDOW)
        else:
            await cache.cache_set(rate_key, "1", ttl=RATE_LIMIT_WINDOW)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Rate limiting error (allowing request): {e}")


async def api_key_dependency(request: Request) -> str:
    """Combined API key validation and rate limiting dependency."""
    api_key = await _validate_api_key(request)
    await _rate_limit(request, api_key)
    return api_key


@router.get("/news")
async def public_news(
    region: Optional[str] = Query(None, description="Filter by region"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    since: Optional[str] = Query(None, description="ISO datetime filter"),
    api_key: str = Depends(api_key_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Public API: Retrieve news articles.

    Requires a valid API key. Rate limited to 60 requests/minute.
    """
    stmt = select(Article)

    if region:
        stmt = stmt.where(Article.region == region)
    if category:
        stmt = stmt.where(Article.category == category)
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            stmt = stmt.where(Article.published_at >= since_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format")

    stmt = (
        stmt.order_by(Article.importance_score.desc(), Article.published_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    articles = result.scalars().all()

    return {
        "status": "ok",
        "data": [a.to_dict() for a in articles],
        "meta": {
            "count": len(articles),
            "offset": offset,
            "limit": limit,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }


@router.get("/events")
async def public_events(
    region: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity_min: Optional[int] = Query(None, ge=1, le=10),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    hours: int = Query(24, ge=1, le=168),
    api_key: str = Depends(api_key_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Public API: Retrieve geopolitical events.

    Requires a valid API key. Rate limited to 60 requests/minute.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    stmt = select(Event).where(Event.timestamp >= cutoff)

    if region:
        stmt = stmt.where(Event.region == region)
    if category:
        stmt = stmt.where(Event.category == category)
    if severity_min is not None:
        stmt = stmt.where(Event.severity >= severity_min)

    stmt = (
        stmt.order_by(Event.severity.desc(), Event.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    events = result.scalars().all()

    return {
        "status": "ok",
        "data": [e.to_dict() for e in events],
        "meta": {
            "count": len(events),
            "offset": offset,
            "limit": limit,
            "hours": hours,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }


@router.get("/briefing")
async def public_briefing(
    period: str = Query("hourly", description="Briefing period: hourly, watch"),
    api_key: str = Depends(api_key_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Public API: Retrieve the latest AI-generated briefing.

    Requires a valid API key. Rate limited to 60 requests/minute.
    """
    # Try cache first
    cache_key = f"briefing:{period}:latest"
    cached = await cache.cache_get_json(cache_key)
    if cached:
        return {
            "status": "ok",
            "data": cached,
            "meta": {
                "cached": True,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        }

    # Fetch from database
    stmt = (
        select(AIBriefing)
        .where(AIBriefing.period == period)
        .order_by(AIBriefing.generated_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    briefing = result.scalar_one_or_none()

    if not briefing:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "No briefing found",
                "message": f"No briefing available for period '{period}'.",
            },
        )

    data = briefing.to_dict()

    # Cache it
    await cache.cache_set_json(cache_key, data, ttl=7200)

    return {
        "status": "ok",
        "data": data,
        "meta": {
            "cached": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }


@router.get("/status")
async def api_status():
    """
    Public API status endpoint (no API key required).
    Returns API version, available endpoints, and rate limit info.
    """
    return {
        "status": "ok",
        "version": "1.0.0",
        "endpoints": {
            "news": "/api/v1/news",
            "events": "/api/v1/events",
            "briefing": "/api/v1/briefing",
        },
        "rate_limit": {
            "requests_per_minute": RATE_LIMIT_RPM,
        },
        "authentication": {
            "method": "API Key",
            "header": "X-API-Key",
            "query_param": "api_key",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
