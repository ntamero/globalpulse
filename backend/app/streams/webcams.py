"""
Registry of public webcam feeds.

Includes EarthCam embeds, Windy.com weather webcams, and other public
live camera feeds from around the world. Useful for real-time visual
verification during news events.
"""

import os
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

WINDY_API_KEY = os.getenv("WINDY_API_KEY", "")
WINDY_WEBCAMS_URL = "https://api.windy.com/webcams/api/v3/webcams"

WEBCAMS: list[dict] = [
    # --- Major Cities ---
    {
        "name": "Times Square, New York",
        "embed_url": "https://www.earthcam.com/cams/newyork/timessquare/index.php",
        "url": "https://www.earthcam.com/usa/newyork/timessquare/",
        "region": "americas",
        "country": "United States",
        "city": "New York",
        "latitude": 40.758,
        "longitude": -73.986,
        "category": "city",
    },
    {
        "name": "Abbey Road, London",
        "embed_url": "https://www.earthcam.com/world/england/london/abbeyroad/index.php",
        "url": "https://www.earthcam.com/world/england/london/abbeyroad/",
        "region": "europe",
        "country": "United Kingdom",
        "city": "London",
        "latitude": 51.532,
        "longitude": -0.178,
        "category": "city",
    },
    {
        "name": "Shibuya Crossing, Tokyo",
        "embed_url": "https://www.youtube.com/embed/1O7CPazPbi4?autoplay=1",
        "url": "https://www.youtube.com/watch?v=1O7CPazPbi4",
        "region": "asia",
        "country": "Japan",
        "city": "Tokyo",
        "latitude": 35.659,
        "longitude": 139.700,
        "category": "city",
    },
    {
        "name": "Eiffel Tower, Paris",
        "embed_url": "https://www.youtube.com/embed/hSiVnVgfk7s?autoplay=1",
        "url": "https://www.youtube.com/watch?v=hSiVnVgfk7s",
        "region": "europe",
        "country": "France",
        "city": "Paris",
        "latitude": 48.858,
        "longitude": 2.295,
        "category": "city",
    },
    {
        "name": "Piazza San Marco, Venice",
        "embed_url": "https://www.youtube.com/embed/vPwLfTHaOCI?autoplay=1",
        "url": "https://www.youtube.com/watch?v=vPwLfTHaOCI",
        "region": "europe",
        "country": "Italy",
        "city": "Venice",
        "latitude": 45.434,
        "longitude": 12.338,
        "category": "city",
    },
    {
        "name": "Brandenburg Gate, Berlin",
        "embed_url": "https://www.youtube.com/embed/EB7sAO4pBEY?autoplay=1",
        "url": "https://www.youtube.com/watch?v=EB7sAO4pBEY",
        "region": "europe",
        "country": "Germany",
        "city": "Berlin",
        "latitude": 52.516,
        "longitude": 13.378,
        "category": "city",
    },
    {
        "name": "Sydney Harbour",
        "embed_url": "https://www.youtube.com/embed/TfLkfcrEhkA?autoplay=1",
        "url": "https://www.youtube.com/watch?v=TfLkfcrEhkA",
        "region": "asia",
        "country": "Australia",
        "city": "Sydney",
        "latitude": -33.857,
        "longitude": 151.215,
        "category": "city",
    },
    {
        "name": "Dubai Skyline",
        "embed_url": "https://www.youtube.com/embed/LZ_G8ORWPEQ?autoplay=1",
        "url": "https://www.youtube.com/watch?v=LZ_G8ORWPEQ",
        "region": "middle_east",
        "country": "UAE",
        "city": "Dubai",
        "latitude": 25.197,
        "longitude": 55.274,
        "category": "city",
    },
    {
        "name": "Red Square, Moscow",
        "embed_url": "https://www.youtube.com/embed/eR1DD7gdMgc?autoplay=1",
        "url": "https://www.youtube.com/watch?v=eR1DD7gdMgc",
        "region": "europe",
        "country": "Russia",
        "city": "Moscow",
        "latitude": 55.754,
        "longitude": 37.621,
        "category": "city",
    },
    {
        "name": "Table Mountain, Cape Town",
        "embed_url": "https://www.youtube.com/embed/Jzgy8B8xNXs?autoplay=1",
        "url": "https://www.youtube.com/watch?v=Jzgy8B8xNXs",
        "region": "africa",
        "country": "South Africa",
        "city": "Cape Town",
        "latitude": -33.963,
        "longitude": 18.403,
        "category": "nature",
    },
    # --- Border / Conflict Areas ---
    {
        "name": "Trstenik Border Crossing (Croatia/Serbia)",
        "embed_url": "https://www.youtube.com/embed/2K_3GeG7pso?autoplay=1",
        "url": "https://www.youtube.com/watch?v=2K_3GeG7pso",
        "region": "europe",
        "country": "Croatia",
        "city": "Trstenik",
        "latitude": 45.265,
        "longitude": 19.220,
        "category": "border",
    },
    # --- Nature / Weather ---
    {
        "name": "Mount Fuji, Japan",
        "embed_url": "https://www.youtube.com/embed/SLGVkCOpheo?autoplay=1",
        "url": "https://www.youtube.com/watch?v=SLGVkCOpheo",
        "region": "asia",
        "country": "Japan",
        "city": "Fujikawaguchiko",
        "latitude": 35.361,
        "longitude": 138.728,
        "category": "nature",
    },
    {
        "name": "Yellowstone Old Faithful",
        "embed_url": "https://www.youtube.com/embed/wPJKncpmEvo?autoplay=1",
        "url": "https://www.youtube.com/watch?v=wPJKncpmEvo",
        "region": "americas",
        "country": "United States",
        "city": "Yellowstone",
        "latitude": 44.460,
        "longitude": -110.828,
        "category": "nature",
    },
    {
        "name": "Niagara Falls",
        "embed_url": "https://www.earthcam.com/usa/newyork/niagarafalls/index.php",
        "url": "https://www.earthcam.com/usa/newyork/niagarafalls/",
        "region": "americas",
        "country": "United States",
        "city": "Niagara Falls",
        "latitude": 43.077,
        "longitude": -79.075,
        "category": "nature",
    },
    # --- Transport / Ports ---
    {
        "name": "Port of Los Angeles",
        "embed_url": "https://www.youtube.com/embed/gF8Z0ORvlnE?autoplay=1",
        "url": "https://www.youtube.com/watch?v=gF8Z0ORvlnE",
        "region": "americas",
        "country": "United States",
        "city": "Los Angeles",
        "latitude": 33.740,
        "longitude": -118.271,
        "category": "transport",
    },
    {
        "name": "Bosphorus, Istanbul",
        "embed_url": "https://www.youtube.com/embed/s48wbDRZfD8?autoplay=1",
        "url": "https://www.youtube.com/watch?v=s48wbDRZfD8",
        "region": "middle_east",
        "country": "Turkey",
        "city": "Istanbul",
        "latitude": 41.119,
        "longitude": 29.076,
        "category": "transport",
    },
]


async def fetch_windy_webcams(
    latitude: float,
    longitude: float,
    radius_km: int = 50,
    limit: int = 10,
) -> list[dict]:
    """
    Fetch nearby webcams from the Windy API.

    Requires WINDY_API_KEY to be set.

    Args:
        latitude: Center latitude.
        longitude: Center longitude.
        radius_km: Search radius in kilometers.
        limit: Maximum number of webcams to return.

    Returns:
        List of webcam dicts with name, embed_url, coordinates, etc.
    """
    if not WINDY_API_KEY:
        logger.debug("WINDY_API_KEY not set, skipping Windy webcam fetch")
        return []

    headers = {"x-windy-api-key": WINDY_API_KEY}
    params = {
        "nearby": f"{latitude},{longitude},{radius_km}",
        "limit": limit,
        "include": "urls,location,player",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                WINDY_WEBCAMS_URL, headers=headers, params=params
            )
            resp.raise_for_status()
            data = resp.json()

        webcams = []
        for cam in data.get("webcams", []):
            location = cam.get("location", {})
            player = cam.get("player", {})
            urls = cam.get("urls", {})

            webcams.append({
                "name": cam.get("title", "Unknown webcam"),
                "embed_url": player.get("day", {}).get("embed", ""),
                "url": urls.get("detail", ""),
                "region": "world",
                "country": location.get("country", ""),
                "city": location.get("city", ""),
                "latitude": location.get("latitude"),
                "longitude": location.get("longitude"),
                "category": "webcam",
            })

        return webcams

    except Exception as e:
        logger.warning(f"Windy API error: {e}")
        return []


def get_webcams(
    region: Optional[str] = None,
    category: Optional[str] = None,
) -> list[dict]:
    """
    Return webcams from the static registry, optionally filtered.
    """
    cams = WEBCAMS
    if region:
        cams = [c for c in cams if c["region"] == region]
    if category:
        cams = [c for c in cams if c["category"] == category]
    return cams
