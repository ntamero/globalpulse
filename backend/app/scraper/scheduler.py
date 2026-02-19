import asyncio
import logging
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import delete

from app.scraper.rss_engine import rss_engine
from app.data.database import AsyncSessionLocal
from app.data.models import Article

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def fetch_priority_feeds() -> None:
    """Fetch only priority-1 feeds (breaking news) every 2 minutes."""
    try:
        count = await rss_engine.fetch_and_store(priority_filter=1)
        logger.info(f"Priority feed fetch complete: {count} new articles stored")
    except Exception as e:
        logger.error(f"Error in priority feed fetch: {e}")


async def fetch_all_feeds() -> None:
    """Fetch all feeds every 10 minutes."""
    try:
        count = await rss_engine.fetch_and_store(priority_filter=None)
        logger.info(f"Full feed fetch complete: {count} new articles stored")
    except Exception as e:
        logger.error(f"Error in full feed fetch: {e}")


async def generate_hourly_briefing() -> None:
    """Generate an AI briefing every hour."""
    try:
        from app.ai.briefing import generate_briefing
        await generate_briefing(period="hourly", hours_back=2)
        logger.info("Hourly AI briefing generated")
    except Exception as e:
        logger.error(f"Error generating hourly briefing: {e}")


async def generate_things_to_watch() -> None:
    """Generate 'Things to Watch' every 6 hours."""
    try:
        from app.ai.briefing import generate_briefing
        await generate_briefing(period="watch", hours_back=12)
        logger.info("Things to Watch generated")
    except Exception as e:
        logger.error(f"Error generating Things to Watch: {e}")


async def cleanup_old_articles() -> None:
    """Remove articles older than 30 days."""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        async with AsyncSessionLocal() as session:
            stmt = delete(Article).where(Article.scraped_at < cutoff)
            result = await session.execute(stmt)
            await session.commit()
            deleted = result.rowcount or 0
            logger.info(f"Cleanup: deleted {deleted} articles older than 30 days")
    except Exception as e:
        logger.error(f"Error in article cleanup: {e}")


def start_scheduler() -> None:
    """Configure and start the APScheduler."""
    # Every 2 minutes: fetch priority-1 feeds (breaking news)
    scheduler.add_job(
        fetch_priority_feeds,
        trigger=IntervalTrigger(minutes=2),
        id="fetch_priority_feeds",
        name="Fetch priority RSS feeds",
        replace_existing=True,
        max_instances=1,
    )

    # Every 10 minutes: fetch all feeds
    scheduler.add_job(
        fetch_all_feeds,
        trigger=IntervalTrigger(minutes=10),
        id="fetch_all_feeds",
        name="Fetch all RSS feeds",
        replace_existing=True,
        max_instances=1,
    )

    # Every 1 hour: generate AI briefing
    scheduler.add_job(
        generate_hourly_briefing,
        trigger=IntervalTrigger(hours=1),
        id="generate_hourly_briefing",
        name="Generate hourly AI briefing",
        replace_existing=True,
        max_instances=1,
    )

    # Every 6 hours: generate "Things to Watch"
    scheduler.add_job(
        generate_things_to_watch,
        trigger=IntervalTrigger(hours=6),
        id="generate_things_to_watch",
        name="Generate Things to Watch",
        replace_existing=True,
        max_instances=1,
    )

    # Every 24 hours: cleanup old articles
    scheduler.add_job(
        cleanup_old_articles,
        trigger=IntervalTrigger(hours=24),
        id="cleanup_old_articles",
        name="Cleanup old articles",
        replace_existing=True,
        max_instances=1,
    )

    scheduler.start()
    logger.info("Scheduler started with all jobs configured")


def stop_scheduler() -> None:
    """Shut down the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
