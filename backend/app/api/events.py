import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.database import get_db
from app.data.models import Event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
async def list_events(
    region: Optional[str] = Query(None, description="Filter by region"),
    category: Optional[str] = Query(None, description="Filter by category"),
    severity_min: Optional[int] = Query(
        None, ge=1, le=10, description="Minimum severity (1-10)"
    ),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    since: Optional[str] = Query(None, description="ISO datetime filter"),
    db: AsyncSession = Depends(get_db),
):
    """List events with optional filtering."""
    stmt = select(Event)

    if region:
        stmt = stmt.where(Event.region == region)
    if category:
        stmt = stmt.where(Event.category == category)
    if severity_min is not None:
        stmt = stmt.where(Event.severity >= severity_min)
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            stmt = stmt.where(Event.timestamp >= since_dt)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid 'since' datetime format. Use ISO 8601.",
            )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = (
        stmt.order_by(Event.severity.desc(), Event.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    events = result.scalars().all()

    return {
        "events": [e.to_dict() for e in events],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/timeline")
async def events_timeline(
    hours: int = Query(48, ge=1, le=168, description="Hours of history"),
    region: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """
    Get events for a timeline view, grouped by time periods.
    Returns events from the last N hours ordered chronologically.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    stmt = select(Event).where(Event.timestamp >= cutoff)

    if region:
        stmt = stmt.where(Event.region == region)
    if category:
        stmt = stmt.where(Event.category == category)

    stmt = stmt.order_by(Event.timestamp.desc()).limit(limit)
    result = await db.execute(stmt)
    events = result.scalars().all()

    # Group by hour for timeline rendering
    timeline: dict[str, list[dict]] = {}
    for event in events:
        hour_key = event.timestamp.strftime("%Y-%m-%dT%H:00:00Z")
        if hour_key not in timeline:
            timeline[hour_key] = []
        timeline[hour_key].append(event.to_dict())

    return {
        "timeline": timeline,
        "total_events": len(events),
        "hours": hours,
        "period_start": cutoff.isoformat(),
        "period_end": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/map")
async def events_map(
    hours: int = Query(24, ge=1, le=168, description="Hours of history"),
    region: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity_min: Optional[int] = Query(None, ge=1, le=10),
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """
    Get events with coordinates for map plotting.
    Only returns events that have latitude and longitude set.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    stmt = (
        select(Event)
        .where(Event.timestamp >= cutoff)
        .where(Event.latitude.isnot(None))
        .where(Event.longitude.isnot(None))
    )

    if region:
        stmt = stmt.where(Event.region == region)
    if category:
        stmt = stmt.where(Event.category == category)
    if severity_min is not None:
        stmt = stmt.where(Event.severity >= severity_min)

    stmt = stmt.order_by(Event.severity.desc(), Event.timestamp.desc()).limit(limit)
    result = await db.execute(stmt)
    events = result.scalars().all()

    # Format for map markers
    markers = []
    for event in events:
        markers.append({
            "id": str(event.id),
            "title": event.title,
            "description": event.description,
            "category": event.category,
            "severity": event.severity,
            "latitude": event.latitude,
            "longitude": event.longitude,
            "country": event.country,
            "city": event.city,
            "timestamp": event.timestamp.isoformat() if event.timestamp else None,
        })

    # Summary statistics
    category_counts: dict[str, int] = {}
    severity_sum = 0
    for m in markers:
        cat = m["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1
        severity_sum += m["severity"]

    avg_severity = round(severity_sum / len(markers), 1) if markers else 0

    return {
        "markers": markers,
        "total": len(markers),
        "hours": hours,
        "summary": {
            "category_breakdown": category_counts,
            "average_severity": avg_severity,
        },
    }


@router.get("/{event_id}")
async def get_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single event by ID."""
    stmt = select(Event).where(Event.id == event_id)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return event.to_dict()
