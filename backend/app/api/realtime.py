"""
Real-time data proxy endpoints for GlobalPulse.
Adapted from WorldMonitor's open-source API layer.
These endpoints proxy publicly available OSINT data sources.
"""

import logging
import time
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/realtime", tags=["realtime"])

# ---------------------------------------------------------------------------
# In-memory cache with TTL
# ---------------------------------------------------------------------------
_cache: Dict[str, Dict[str, Any]] = {}


def _get_cached(key: str, ttl_seconds: int) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < ttl_seconds:
        return entry["data"]
    return None


def _set_cached(key: str, data: Any):
    _cache[key] = {"data": data, "ts": time.time()}


# ---------------------------------------------------------------------------
# GDELT Geo API - Global events with geolocation (NO API KEY NEEDED)
# ---------------------------------------------------------------------------
@router.get("/gdelt")
async def gdelt_events(
    query: str = Query("crisis OR conflict OR protest", max_length=200),
    timespan: str = Query("7d", regex="^(1d|7d|14d|30d)$"),
    maxrecords: int = Query(250, ge=1, le=500),
):
    """Proxy to GDELT GEO API for geolocated global events."""
    cache_key = f"gdelt:{query}:{timespan}:{maxrecords}"
    cached = _get_cached(cache_key, 300)  # 5 min cache
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.gdeltproject.org/api/v2/geo/geo",
                params={
                    "query": query,
                    "format": "geojson",
                    "maxrecords": maxrecords,
                    "timespan": timespan,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            _set_cached(cache_key, data)
            return data
    except Exception as e:
        logger.error(f"GDELT fetch error: {e}")
        return {"type": "FeatureCollection", "features": []}


# ---------------------------------------------------------------------------
# USGS Earthquakes - Real-time seismic data (NO API KEY NEEDED)
# ---------------------------------------------------------------------------
@router.get("/earthquakes")
async def earthquakes():
    """Real-time earthquake data from USGS (M4.5+ in last 24h)."""
    cache_key = "usgs:earthquakes:4.5_day"
    cached = _get_cached(cache_key, 300)  # 5 min cache
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson"
            )
            resp.raise_for_status()
            data = resp.json()
            _set_cached(cache_key, data)
            return data
    except Exception as e:
        logger.error(f"USGS fetch error: {e}")
        return {"type": "FeatureCollection", "features": []}


# ---------------------------------------------------------------------------
# UCDP Conflicts - Uppsala Conflict Data Program (NO API KEY NEEDED)
# ---------------------------------------------------------------------------
@router.get("/conflicts")
async def ucdp_conflicts():
    """UCDP conflict data - armed conflicts worldwide."""
    cache_key = "ucdp:conflicts:v2"
    cached = _get_cached(cache_key, 3600)  # 1 hour cache
    if cached:
        return cached

    try:
        all_conflicts = []
        page = 0
        total_pages = 1

        async with httpx.AsyncClient(timeout=20) as client:
            while page < total_pages and page < 5:  # max 5 pages
                resp = await client.get(
                    f"https://ucdpapi.pcr.uu.se/api/ucdpprioconflict/24.1",
                    params={"pagesize": 100, "page": page},
                )
                resp.raise_for_status()
                raw = resp.json()
                total_pages = raw.get("TotalPages", 1)
                conflicts = raw.get("Result", [])
                all_conflicts.extend(conflicts)
                page += 1

        # Process: keep most recent/highest intensity per location
        country_conflicts: Dict[str, dict] = {}
        for c in all_conflicts:
            name = c.get("location", "")
            year = int(c.get("year", 0) or 0)
            intensity = int(c.get("intensity_level", 0) or 0)

            entry = {
                "conflictId": c.get("conflict_id"),
                "location": name,
                "year": year,
                "intensityLevel": intensity,
                "typeOfConflict": c.get("type_of_conflict"),
                "sideA": c.get("side_a"),
                "sideB": c.get("side_b"),
                "region": c.get("region"),
            }

            existing = country_conflicts.get(name)
            if not existing or year > existing["year"] or (
                year == existing["year"] and intensity > existing["intensityLevel"]
            ):
                country_conflicts[name] = entry

        result = {
            "success": True,
            "count": len(country_conflicts),
            "conflicts": list(country_conflicts.values()),
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }
        _set_cached(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"UCDP fetch error: {e}")
        return {"success": False, "count": 0, "conflicts": []}


# ---------------------------------------------------------------------------
# Service Status - Real-time health of 30+ tech services (NO API KEY NEEDED)
# ---------------------------------------------------------------------------

SERVICES = [
    # Cloud
    {"id": "cloudflare", "name": "Cloudflare", "url": "https://www.cloudflarestatus.com/api/v2/status.json", "category": "cloud"},
    {"id": "vercel", "name": "Vercel", "url": "https://www.vercel-status.com/api/v2/status.json", "category": "cloud"},
    {"id": "netlify", "name": "Netlify", "url": "https://www.netlifystatus.com/api/v2/status.json", "category": "cloud"},
    {"id": "digitalocean", "name": "DigitalOcean", "url": "https://status.digitalocean.com/api/v2/status.json", "category": "cloud"},
    {"id": "render", "name": "Render", "url": "https://status.render.com/api/v2/status.json", "category": "cloud"},
    # Dev
    {"id": "github", "name": "GitHub", "url": "https://www.githubstatus.com/api/v2/status.json", "category": "dev"},
    {"id": "npm", "name": "npm", "url": "https://status.npmjs.org/api/v2/status.json", "category": "dev"},
    {"id": "circleci", "name": "CircleCI", "url": "https://status.circleci.com/api/v2/status.json", "category": "dev"},
    # Communication
    {"id": "discord", "name": "Discord", "url": "https://discordstatus.com/api/v2/status.json", "category": "comm"},
    {"id": "zoom", "name": "Zoom", "url": "https://www.zoomstatus.com/api/v2/status.json", "category": "comm"},
    {"id": "notion", "name": "Notion", "url": "https://www.notion-status.com/api/v2/status.json", "category": "comm"},
    # AI
    {"id": "openai", "name": "OpenAI", "url": "https://status.openai.com/api/v2/status.json", "category": "ai"},
    # SaaS
    {"id": "stripe", "name": "Stripe", "url": "https://status.stripe.com/api/v2/status.json", "category": "saas"},
    {"id": "twilio", "name": "Twilio", "url": "https://status.twilio.com/api/v2/status.json", "category": "saas"},
    {"id": "datadog", "name": "Datadog", "url": "https://status.datadoghq.com/api/v2/status.json", "category": "saas"},
    {"id": "sentry", "name": "Sentry", "url": "https://status.sentry.io/api/v2/status.json", "category": "saas"},
    {"id": "supabase", "name": "Supabase", "url": "https://status.supabase.com/api/v2/status.json", "category": "saas"},
]


def _normalize_status(indicator: str) -> str:
    val = (indicator or "").lower()
    if val in ("none", "operational") or "operational" in val:
        return "operational"
    if val in ("minor", "degraded_performance", "partial_outage") or "degraded" in val:
        return "degraded"
    if val in ("major", "major_outage", "critical") or "outage" in val:
        return "outage"
    return "unknown"


async def _check_service(client: httpx.AsyncClient, service: dict) -> dict:
    try:
        resp = await client.get(service["url"], timeout=8)
        if resp.status_code != 200:
            return {**service, "status": "unknown", "description": f"HTTP {resp.status_code}"}

        text = resp.text
        if text.startswith("<!") or text.startswith("<html"):
            return {**service, "status": "unknown", "description": "Blocked"}

        import json as json_mod
        data = json_mod.loads(text)
        indicator = data.get("status", {}).get("indicator", "")
        description = data.get("status", {}).get("description", "")
        return {
            "id": service["id"],
            "name": service["name"],
            "category": service["category"],
            "status": _normalize_status(indicator),
            "description": description or "Status available",
        }
    except Exception:
        return {
            "id": service["id"],
            "name": service["name"],
            "category": service["category"],
            "status": "unknown",
            "description": "Check failed",
        }


@router.get("/services")
async def service_status(category: str = Query("all")):
    """Real-time health check for 30+ tech services."""
    cache_key = f"services:{category}"
    cached = _get_cached(cache_key, 60)  # 1 min cache
    if cached:
        return cached

    services_to_check = SERVICES
    if category != "all":
        services_to_check = [s for s in SERVICES if s["category"] == category]

    async with httpx.AsyncClient(
        headers={"Accept": "application/json", "User-Agent": "GlobalPulse/1.0"},
        follow_redirects=True,
    ) as client:
        results = await asyncio.gather(
            *[_check_service(client, s) for s in services_to_check],
            return_exceptions=True,
        )

    services = []
    for r in results:
        if isinstance(r, dict):
            services.append(r)

    # Sort: outages first
    order = {"outage": 0, "degraded": 1, "unknown": 2, "operational": 3}
    services.sort(key=lambda s: order.get(s.get("status", "unknown"), 9))

    summary = {
        "operational": sum(1 for s in services if s.get("status") == "operational"),
        "degraded": sum(1 for s in services if s.get("status") == "degraded"),
        "outage": sum(1 for s in services if s.get("status") == "outage"),
        "unknown": sum(1 for s in services if s.get("status") == "unknown"),
    }

    result = {
        "success": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "services": services,
    }
    _set_cached(cache_key, result)
    return result


# ---------------------------------------------------------------------------
# GDELT Doc API - Latest news articles by topic (NO API KEY NEEDED)
# ---------------------------------------------------------------------------
@router.get("/gdelt-news")
async def gdelt_news(
    query: str = Query("world news", max_length=200),
    maxrecords: int = Query(50, ge=1, le=250),
    timespan: str = Query("24h"),
):
    """Fetch latest news articles from GDELT DOC API."""
    cache_key = f"gdelt-news:{query}:{maxrecords}:{timespan}"
    cached = _get_cached(cache_key, 300)
    if cached:
        return cached

    try:
        # Convert timespan format
        ts_map = {"1h": "60", "6h": "360", "12h": "720", "24h": "1440", "48h": "2880", "7d": "10080"}
        ts_min = ts_map.get(timespan, "1440")

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params={
                    "query": query,
                    "mode": "artlist",
                    "format": "json",
                    "maxrecords": maxrecords,
                    "timespan": f"{ts_min}min",
                    "sort": "datedesc",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            _set_cached(cache_key, data)
            return data
    except Exception as e:
        logger.error(f"GDELT news fetch error: {e}")
        return {"articles": []}
