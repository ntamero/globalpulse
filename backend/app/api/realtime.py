"""
Real-time data proxy endpoints for GlobalPulse.
Adapted from WorldMonitor's open-source API layer.
These endpoints proxy publicly available OSINT data sources.

Endpoints:
  - /api/realtime/gdelt          GDELT GEO events (no key)
  - /api/realtime/gdelt-news     GDELT Doc articles (no key)
  - /api/realtime/earthquakes    USGS seismic data (no key)
  - /api/realtime/conflicts      UCDP armed conflicts (no key)
  - /api/realtime/services       Statuspage.io health (no key)
  - /api/realtime/fires          NASA FIRMS fire detection (API key)
  - /api/realtime/acled          ACLED conflict events (API key)
  - /api/realtime/acled-protests ACLED protest data (API key)
  - /api/realtime/outages        Cloudflare Radar outages (API key)
  - /api/realtime/climate        Open-Meteo climate anomalies (no key)
"""

import logging
import os
import time
import asyncio
import csv
import io
import math
from datetime import datetime, timezone, timedelta
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
                    "https://ucdpapi.pcr.uu.se/api/ucdpprioconflict/24.1",
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


# ===========================================================================
# NEW ENDPOINTS - ACLED, NASA FIRMS, Cloudflare Radar, Climate
# ===========================================================================


# ---------------------------------------------------------------------------
# NASA FIRMS - Satellite Fire Detection (API KEY REQUIRED)
# Register free at: https://firms.modaps.eosdis.nasa.gov/api/area/
# ---------------------------------------------------------------------------
FIRMS_API_KEY = os.environ.get("NASA_FIRMS_API_KEY", "")
FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
FIRMS_SOURCE = "VIIRS_SNPP_NRT"

MONITORED_FIRE_REGIONS = {
    "Ukraine":      {"bbox": "22,44,40,53"},
    "Russia":       {"bbox": "20,50,180,82"},
    "Iran":         {"bbox": "44,25,63,40"},
    "Israel/Gaza":  {"bbox": "34,29,36,34"},
    "Syria":        {"bbox": "35,32,42,37"},
    "Taiwan":       {"bbox": "119,21,123,26"},
    "North Korea":  {"bbox": "124,37,131,43"},
    "Saudi Arabia": {"bbox": "34,16,56,32"},
    "Turkey":       {"bbox": "26,36,45,42"},
    "Myanmar":      {"bbox": "92,9,101,28"},
    "Sudan":        {"bbox": "21,3,39,23"},
    "Ethiopia":     {"bbox": "33,3,48,15"},
    "Amazon":       {"bbox": "-74,-16,-44,5"},
    "California":   {"bbox": "-125,32,-114,42"},
    "Australia":    {"bbox": "113,-44,154,-10"},
}


def _parse_confidence(c: str) -> int:
    """Map VIIRS confidence letters to numeric."""
    if c == "h":
        return 95
    if c == "n":
        return 50
    if c == "l":
        return 20
    try:
        return int(c)
    except (ValueError, TypeError):
        return 0


def _parse_firms_csv(csv_text: str) -> List[dict]:
    """Parse NASA FIRMS CSV response into list of fire points."""
    reader = csv.DictReader(io.StringIO(csv_text))
    results = []
    for row in reader:
        try:
            results.append({
                "lat": float(row.get("latitude", 0)),
                "lon": float(row.get("longitude", 0)),
                "brightness": float(row.get("bright_ti4", 0) or 0),
                "scan": float(row.get("scan", 0) or 0),
                "track": float(row.get("track", 0) or 0),
                "acq_date": row.get("acq_date", ""),
                "acq_time": row.get("acq_time", ""),
                "satellite": row.get("satellite", ""),
                "confidence": _parse_confidence(row.get("confidence", "l")),
                "frp": float(row.get("frp", 0) or 0),
                "daynight": row.get("daynight", ""),
            })
        except (ValueError, TypeError):
            continue
    return results


@router.get("/fires")
async def nasa_fires(
    region: Optional[str] = Query(None, description="Specific region name"),
    days: int = Query(1, ge=1, le=5),
):
    """NASA FIRMS satellite fire detection data for monitored conflict regions."""
    if not FIRMS_API_KEY:
        return {
            "configured": False,
            "regions": {},
            "totalCount": 0,
            "reason": "NASA_FIRMS_API_KEY not configured. Register free at https://firms.modaps.eosdis.nasa.gov/api/area/",
            "source": FIRMS_SOURCE,
            "days": days,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    cache_key = f"firms:{region or 'all'}:{days}"
    cached = _get_cached(cache_key, 600)  # 10 min cache
    if cached:
        return cached

    # Determine regions to fetch
    if region:
        if region not in MONITORED_FIRE_REGIONS:
            return {"error": f"Unknown region: {region}. Available: {list(MONITORED_FIRE_REGIONS.keys())}"}
        regions = {region: MONITORED_FIRE_REGIONS[region]}
    else:
        regions = MONITORED_FIRE_REGIONS

    all_fires: Dict[str, List[dict]] = {}
    total_count = 0

    async def fetch_region(name: str, bbox: str) -> tuple:
        url = f"{FIRMS_BASE}/{FIRMS_API_KEY}/{FIRMS_SOURCE}/{bbox}/{days}"
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(url, headers={"Accept": "text/csv"})
                if resp.status_code != 200:
                    logger.warning(f"FIRMS {resp.status_code} for {name}")
                    return name, []
                fires = _parse_firms_csv(resp.text)
                return name, fires
        except Exception as e:
            logger.error(f"FIRMS fetch error for {name}: {e}")
            return name, []

    tasks = [fetch_region(name, info["bbox"]) for name, info in regions.items()]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for r in results:
        if isinstance(r, tuple):
            name, fires = r
            all_fires[name] = fires
            total_count += len(fires)

    result = {
        "configured": True,
        "regions": all_fires,
        "totalCount": total_count,
        "source": FIRMS_SOURCE,
        "days": days,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _set_cached(cache_key, result)
    return result


# ---------------------------------------------------------------------------
# ACLED - Armed Conflict Location & Event Data (API KEY REQUIRED)
# Register free at: https://acleddata.com/acleddatanew/wp-content/uploads/2021/11/ACLED_Access_API.pdf
# ---------------------------------------------------------------------------
ACLED_ACCESS_TOKEN = os.environ.get("ACLED_ACCESS_TOKEN", "")
ACLED_EMAIL = os.environ.get("ACLED_EMAIL", "")


@router.get("/acled")
async def acled_conflicts(
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(500, ge=1, le=2000),
):
    """ACLED conflict events - battles, explosions, violence against civilians (last N days)."""
    if not ACLED_ACCESS_TOKEN:
        return {
            "configured": False,
            "data": [],
            "count": 0,
            "reason": "ACLED_ACCESS_TOKEN not configured. Register free at https://acleddata.com/",
        }

    cache_key = f"acled:conflict:{days}:{limit}"
    cached = _get_cached(cache_key, 600)  # 10 min cache
    if cached:
        return cached

    try:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

        params = {
            "key": ACLED_ACCESS_TOKEN,
            "email": ACLED_EMAIL,
            "event_type": "Battles|Explosions/Remote violence|Violence against civilians",
            "event_date": f"{start_date}|{end_date}",
            "event_date_where": "BETWEEN",
            "limit": str(limit),
        }

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                "https://api.acleddata.com/acled/read",
                params=params,
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            raw = resp.json()

        events = raw.get("data", [])
        sanitized = []
        for e in events:
            try:
                sanitized.append({
                    "event_id": e.get("event_id_cnty", ""),
                    "event_date": e.get("event_date", ""),
                    "event_type": e.get("event_type", ""),
                    "sub_event_type": e.get("sub_event_type", ""),
                    "actor1": e.get("actor1", ""),
                    "actor2": e.get("actor2", ""),
                    "country": e.get("country", ""),
                    "admin1": e.get("admin1", ""),
                    "location": e.get("location", ""),
                    "latitude": float(e.get("latitude", 0) or 0),
                    "longitude": float(e.get("longitude", 0) or 0),
                    "fatalities": int(e.get("fatalities", 0) or 0),
                    "notes": (e.get("notes", "") or "")[:500],
                    "source": e.get("source", ""),
                })
            except (ValueError, TypeError):
                continue

        result = {
            "configured": True,
            "success": True,
            "count": len(sanitized),
            "data": sanitized,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }
        _set_cached(cache_key, result)
        return result

    except Exception as e:
        logger.error(f"ACLED conflict fetch error: {e}")
        return {"configured": True, "success": False, "data": [], "count": 0, "error": str(e)}


@router.get("/acled-protests")
async def acled_protests(
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(500, ge=1, le=2000),
):
    """ACLED protest events worldwide (last N days)."""
    if not ACLED_ACCESS_TOKEN:
        return {
            "configured": False,
            "data": [],
            "count": 0,
            "reason": "ACLED_ACCESS_TOKEN not configured.",
        }

    cache_key = f"acled:protests:{days}:{limit}"
    cached = _get_cached(cache_key, 600)  # 10 min cache
    if cached:
        return cached

    try:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

        params = {
            "key": ACLED_ACCESS_TOKEN,
            "email": ACLED_EMAIL,
            "event_type": "Protests",
            "event_date": f"{start_date}|{end_date}",
            "event_date_where": "BETWEEN",
            "limit": str(limit),
        }

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                "https://api.acleddata.com/acled/read",
                params=params,
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            raw = resp.json()

        events = raw.get("data", [])
        sanitized = []
        for e in events:
            try:
                sanitized.append({
                    "event_id": e.get("event_id_cnty", ""),
                    "event_date": e.get("event_date", ""),
                    "event_type": e.get("event_type", ""),
                    "sub_event_type": e.get("sub_event_type", ""),
                    "actor1": e.get("actor1", ""),
                    "country": e.get("country", ""),
                    "admin1": e.get("admin1", ""),
                    "location": e.get("location", ""),
                    "latitude": float(e.get("latitude", 0) or 0),
                    "longitude": float(e.get("longitude", 0) or 0),
                    "fatalities": int(e.get("fatalities", 0) or 0),
                    "notes": (e.get("notes", "") or "")[:500],
                    "source": e.get("source", ""),
                })
            except (ValueError, TypeError):
                continue

        result = {
            "configured": True,
            "success": True,
            "count": len(sanitized),
            "data": sanitized,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }
        _set_cached(cache_key, result)
        return result

    except Exception as e:
        logger.error(f"ACLED protests fetch error: {e}")
        return {"configured": True, "success": False, "data": [], "count": 0, "error": str(e)}


# ---------------------------------------------------------------------------
# Cloudflare Radar - Internet Outage Annotations (API KEY REQUIRED)
# Register free at: https://developers.cloudflare.com/radar/
# ---------------------------------------------------------------------------
CLOUDFLARE_API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")


@router.get("/outages")
async def cloudflare_outages(
    dateRange: str = Query("7d", regex="^(1d|7d|14d|30d)$"),
    limit: int = Query(50, ge=1, le=100),
):
    """Cloudflare Radar internet outage annotations worldwide."""
    if not CLOUDFLARE_API_TOKEN:
        return {
            "configured": False,
            "success": True,
            "result": {"annotations": []},
            "reason": "CLOUDFLARE_API_TOKEN not configured. Get free at https://developers.cloudflare.com/radar/",
        }

    cache_key = f"cf-outages:{dateRange}:{limit}"
    cached = _get_cached(cache_key, 120)  # 2 min cache
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://api.cloudflare.com/client/v4/radar/annotations/outages",
                params={"dateRange": dateRange, "limit": limit},
                headers={"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"},
            )
            if resp.status_code != 200:
                logger.warning(f"Cloudflare Radar HTTP {resp.status_code}")
                return {"configured": True, "success": False, "result": {"annotations": []}}
            data = resp.json()
            _set_cached(cache_key, data)
            return data

    except Exception as e:
        logger.error(f"Cloudflare Radar fetch error: {e}")
        return {"configured": True, "success": True, "result": {"annotations": []}}


# ---------------------------------------------------------------------------
# Open-Meteo Climate Anomalies - Temperature & Precipitation (NO API KEY)
# ---------------------------------------------------------------------------
MONITORED_CLIMATE_ZONES = [
    {"name": "Ukraine", "lat": 48.4, "lon": 31.2},
    {"name": "Middle East", "lat": 33.0, "lon": 44.0},
    {"name": "Sahel", "lat": 14.0, "lon": 0.0},
    {"name": "Horn of Africa", "lat": 8.0, "lon": 42.0},
    {"name": "South Asia", "lat": 25.0, "lon": 78.0},
    {"name": "California", "lat": 36.8, "lon": -119.4},
    {"name": "Amazon", "lat": -3.4, "lon": -60.0},
    {"name": "Australia", "lat": -25.0, "lon": 134.0},
    {"name": "Mediterranean", "lat": 38.0, "lon": 20.0},
    {"name": "Taiwan Strait", "lat": 24.0, "lon": 120.0},
    {"name": "Myanmar", "lat": 19.8, "lon": 96.7},
    {"name": "Central Africa", "lat": 4.0, "lon": 22.0},
    {"name": "Southern Africa", "lat": -25.0, "lon": 28.0},
    {"name": "Central Asia", "lat": 42.0, "lon": 65.0},
    {"name": "Caribbean", "lat": 19.0, "lon": -72.0},
]


def _classify_climate_severity(temp_delta: float, precip_delta: float) -> str:
    abs_temp = abs(temp_delta)
    abs_precip = abs(precip_delta)
    if abs_temp >= 5 or abs_precip >= 80:
        return "extreme"
    if abs_temp >= 3 or abs_precip >= 40:
        return "moderate"
    return "normal"


def _classify_climate_type(temp_delta: float, precip_delta: float) -> str:
    if temp_delta > 3:
        return "warm"
    if temp_delta < -3:
        return "cold"
    if precip_delta > 40:
        return "wet"
    if precip_delta < -40:
        return "dry"
    if temp_delta > 0:
        return "warm"
    return "cold"


@router.get("/climate")
async def climate_anomalies():
    """Climate anomalies for 15 monitored global zones (Open-Meteo archive, no API key)."""
    cache_key = "climate:anomalies:v1"
    cached = _get_cached(cache_key, 21600)  # 6 hour cache
    if cached:
        return cached

    end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    async def fetch_zone(zone: dict) -> Optional[dict]:
        try:
            params = {
                "latitude": str(zone["lat"]),
                "longitude": str(zone["lon"]),
                "start_date": start_date,
                "end_date": end_date,
                "daily": "temperature_2m_mean,precipitation_sum",
                "timezone": "UTC",
            }
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://archive-api.open-meteo.com/v1/archive",
                    params=params,
                    headers={"Accept": "application/json"},
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()

            temps = [t for t in (data.get("daily", {}).get("temperature_2m_mean", [])) if t is not None]
            precips = [p for p in (data.get("daily", {}).get("precipitation_sum", [])) if p is not None]

            if len(temps) < 14:
                return None

            def avg(arr):
                return sum(arr) / len(arr) if arr else 0

            last7_temps = temps[-7:]
            baseline_temps = temps[:-7]
            last7_precips = precips[-7:]
            baseline_precips = precips[:-7]

            temp_delta = avg(last7_temps) - avg(baseline_temps)
            precip_delta = avg(last7_precips) - avg(baseline_precips)

            return {
                "zone": zone["name"],
                "lat": zone["lat"],
                "lon": zone["lon"],
                "tempDelta": round(temp_delta, 1),
                "precipDelta": round(precip_delta, 1),
                "severity": _classify_climate_severity(temp_delta, precip_delta),
                "type": _classify_climate_type(temp_delta, precip_delta),
                "period": f"{start_date} to {end_date}",
            }
        except Exception as e:
            logger.debug(f"Climate fetch error for {zone['name']}: {e}")
            return None

    results = await asyncio.gather(
        *[fetch_zone(z) for z in MONITORED_CLIMATE_ZONES],
        return_exceptions=True,
    )

    anomalies = [r for r in results if isinstance(r, dict)]

    result = {
        "success": True,
        "anomalies": anomalies,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _set_cached(cache_key, result)
    return result
