import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from app.streams.tv_channels import get_tv_channels, TV_CHANNELS
from app.streams.radio_stations import get_radio_stations, RADIO_STATIONS
from app.streams.webcams import get_webcams, fetch_windy_webcams, WEBCAMS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/streams", tags=["streams"])


@router.get("")
async def list_all_streams(
    region: Optional[str] = Query(None, description="Filter by region"),
    language: Optional[str] = Query(None, description="Filter by language"),
):
    """List all streams across all types."""
    tv = get_tv_channels(region=region, language=language)
    radio = get_radio_stations(region=region, language=language)
    webcams = get_webcams(region=region)

    return {
        "tv": tv,
        "radio": radio,
        "webcams": webcams,
        "total": len(tv) + len(radio) + len(webcams),
    }


@router.get("/tv")
async def list_tv_channels(
    region: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
):
    """List live TV news channels."""
    channels = get_tv_channels(region=region, language=language)
    return {
        "channels": channels,
        "total": len(channels),
    }


@router.get("/radio")
async def list_radio_stations(
    region: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    """List internet radio stations."""
    stations = get_radio_stations(
        region=region, language=language, category=category
    )
    return {
        "stations": stations,
        "total": len(stations),
    }


@router.get("/webcams")
async def list_webcams(
    region: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    """List public webcam feeds."""
    cams = get_webcams(region=region, category=category)
    return {
        "webcams": cams,
        "total": len(cams),
    }


@router.get("/webcams/nearby")
async def nearby_webcams(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: int = Query(50, ge=1, le=500),
    limit: int = Query(10, ge=1, le=50),
):
    """Fetch nearby webcams from the Windy API."""
    cams = await fetch_windy_webcams(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        limit=limit,
    )
    return {
        "webcams": cams,
        "total": len(cams),
        "center": {"latitude": latitude, "longitude": longitude},
        "radius_km": radius_km,
    }


@router.get("/{stream_type}/{region}")
async def streams_by_type_and_region(
    stream_type: str,
    region: str,
    language: Optional[str] = Query(None),
):
    """Get streams filtered by type (tv/radio/webcam) and region."""
    if stream_type == "tv":
        items = get_tv_channels(region=region, language=language)
        return {"type": "tv", "region": region, "items": items, "total": len(items)}
    elif stream_type == "radio":
        items = get_radio_stations(region=region, language=language)
        return {"type": "radio", "region": region, "items": items, "total": len(items)}
    elif stream_type == "webcam":
        items = get_webcams(region=region)
        return {"type": "webcam", "region": region, "items": items, "total": len(items)}
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stream_type '{stream_type}'. Use: tv, radio, webcam",
        )


@router.get("/stats")
async def stream_stats():
    """Return statistics about available streams."""
    tv_regions: dict[str, int] = {}
    for ch in TV_CHANNELS:
        r = ch["region"]
        tv_regions[r] = tv_regions.get(r, 0) + 1

    radio_regions: dict[str, int] = {}
    for st in RADIO_STATIONS:
        r = st["region"]
        radio_regions[r] = radio_regions.get(r, 0) + 1

    webcam_regions: dict[str, int] = {}
    for cam in WEBCAMS:
        r = cam["region"]
        webcam_regions[r] = webcam_regions.get(r, 0) + 1

    return {
        "totals": {
            "tv": len(TV_CHANNELS),
            "radio": len(RADIO_STATIONS),
            "webcams": len(WEBCAMS),
        },
        "by_region": {
            "tv": tv_regions,
            "radio": radio_regions,
            "webcams": webcam_regions,
        },
    }
