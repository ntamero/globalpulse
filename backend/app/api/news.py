import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.database import get_db
from app.data.models import Article
from app.data import cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("")
async def list_articles(
    region: Optional[str] = Query(None, description="Filter by region"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, ge=1, le=200, description="Number of articles"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    since: Optional[str] = Query(
        None, description="ISO datetime: return articles published after this time"
    ),
    language: Optional[str] = Query(None, description="Filter by language code"),
    db: AsyncSession = Depends(get_db),
):
    """List articles with optional filtering and pagination."""
    # Try cache for unfiltered first page
    if not region and not category and not since and not language and offset == 0 and limit <= 50:
        cached = await cache.cache_get_json("latest_articles")
        if cached:
            return {
                "articles": cached,
                "total": len(cached),
                "offset": 0,
                "limit": limit,
                "cached": True,
            }

    stmt = select(Article)

    if region:
        stmt = stmt.where(Article.region == region)
    if category:
        stmt = stmt.where(Article.category == category)
    if language:
        stmt = stmt.where(Article.language == language)
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            stmt = stmt.where(Article.published_at >= since_dt)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid 'since' datetime format. Use ISO 8601.",
            )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Fetch page
    stmt = (
        stmt.order_by(Article.importance_score.desc(), Article.published_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    articles = result.scalars().all()

    return {
        "articles": [a.to_dict() for a in articles],
        "total": total,
        "offset": offset,
        "limit": limit,
        "cached": False,
    }


@router.get("/breaking")
async def breaking_news(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest breaking / highest-importance articles from the last 6 hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=6)

    stmt = (
        select(Article)
        .where(Article.published_at >= cutoff)
        .where(Article.importance_score >= 5.0)
        .order_by(Article.importance_score.desc(), Article.published_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    articles = result.scalars().all()

    return {
        "articles": [a.to_dict() for a in articles],
        "count": len(articles),
    }


@router.get("/search")
async def search_articles(
    q: str = Query(..., min_length=2, max_length=200, description="Search query"),
    region: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Full-text search across article titles and summaries."""
    search_pattern = f"%{q}%"

    stmt = select(Article).where(
        or_(
            Article.title.ilike(search_pattern),
            Article.summary.ilike(search_pattern),
        )
    )

    if region:
        stmt = stmt.where(Article.region == region)
    if category:
        stmt = stmt.where(Article.category == category)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = (
        stmt.order_by(Article.importance_score.desc(), Article.published_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    articles = result.scalars().all()

    return {
        "query": q,
        "articles": [a.to_dict() for a in articles],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/regions")
async def list_regions(db: AsyncSession = Depends(get_db)):
    """List all available regions with article counts."""
    stmt = (
        select(Article.region, func.count(Article.id).label("count"))
        .group_by(Article.region)
        .order_by(func.count(Article.id).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return {
        "regions": [{"region": row[0], "count": row[1]} for row in rows]
    }


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all available categories with article counts."""
    stmt = (
        select(Article.category, func.count(Article.id).label("count"))
        .group_by(Article.category)
        .order_by(func.count(Article.id).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return {
        "categories": [{"category": row[0], "count": row[1]} for row in rows]
    }


@router.get("/{article_id}")
async def get_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single article by ID."""
    stmt = select(Article).where(Article.id == article_id)
    result = await db.execute(stmt)
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    return article.to_dict()
