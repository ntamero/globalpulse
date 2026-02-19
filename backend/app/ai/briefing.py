import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from sqlalchemy import select

from app.data.database import AsyncSessionLocal
from app.data.models import Article, AIBriefing
from app.data import cache

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


async def _fetch_top_articles(hours_back: int, limit: int = 30) -> list[dict]:
    """Retrieve the most important articles from the last N hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    async with AsyncSessionLocal() as session:
        stmt = (
            select(Article)
            .where(Article.published_at >= cutoff)
            .order_by(Article.importance_score.desc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        articles = result.scalars().all()
        return [a.to_dict() for a in articles]


def _build_briefing_prompt(articles: list[dict], period: str) -> str:
    """Build the LLM prompt for generating a briefing."""
    article_summaries = []
    for i, a in enumerate(articles[:20], 1):
        summary = a.get("summary") or "No summary available."
        if len(summary) > 300:
            summary = summary[:300] + "..."
        article_summaries.append(
            f"{i}. [{a['region'].upper()}] [{a['category']}] "
            f"{a['title']}\n   Source: {a['source_name']}\n   {summary}"
        )

    articles_text = "\n\n".join(article_summaries)

    if period == "watch":
        return f"""You are a senior geopolitical intelligence analyst. Based on the following news articles from the last 12 hours, generate a "Things to Watch" analysis.

ARTICLES:
{articles_text}

Respond in valid JSON with this exact structure:
{{
  "content": "A 2-3 paragraph executive summary of the current global situation and key trends.",
  "things_to_watch": [
    {{
      "title": "Short title of the development to watch",
      "description": "2-3 sentence explanation of why this matters and what could happen next",
      "likelihood": "low|medium|high",
      "impact": "low|medium|high"
    }}
  ]
}}

Include 5-8 things to watch. Focus on developments that could escalate, shift geopolitical dynamics, or affect global markets. Be specific and analytical, not generic."""

    return f"""You are a senior news analyst producing a concise intelligence briefing. Based on the following top news articles, generate a structured briefing.

ARTICLES:
{articles_text}

Respond in valid JSON with this exact structure:
{{
  "content": "A concise 2-3 paragraph recap of the most significant global developments. Cover the top 5-7 stories, organized by significance. Be factual and analytical.",
  "things_to_watch": [
    {{
      "title": "Short title",
      "description": "Brief explanation of what to monitor",
      "likelihood": "low|medium|high",
      "impact": "low|medium|high"
    }}
  ]
}}

Include 3-5 things to watch. Be concise, factual, and avoid speculation beyond reasonable analysis."""


async def _call_groq(prompt: str) -> Optional[dict]:
    """Call the Groq API with the given prompt."""
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set, falling back to extractive summary")
        return None

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a senior intelligence analyst. Respond only with "
                    "valid JSON. Do not include markdown code fences."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 2000,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(GROQ_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
    except httpx.HTTPStatusError as e:
        logger.error(f"Groq API HTTP error: {e.response.status_code} - {e.response.text}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Groq response as JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"Groq API call failed: {e}")
        return None


def _extractive_fallback(articles: list[dict]) -> dict:
    """Create a fallback briefing from the top articles when AI is unavailable."""
    top = articles[:5]
    paragraphs = []
    things = []

    for a in top:
        title = a["title"]
        summary = a.get("summary") or ""
        source = a["source_name"]
        region = a["region"].replace("_", " ").title()

        if summary:
            short_summary = summary[:200].rsplit(" ", 1)[0] + "..."
        else:
            short_summary = "Details emerging."

        paragraphs.append(f"**{region}**: {title} ({source}) - {short_summary}")

        things.append({
            "title": title,
            "description": f"Reported by {source}. {short_summary}",
            "likelihood": "medium",
            "impact": "medium",
        })

    content = (
        "Here are the most significant global developments:\n\n"
        + "\n\n".join(paragraphs)
    )

    return {
        "content": content,
        "things_to_watch": things,
    }


async def generate_briefing(
    period: str = "hourly", hours_back: int = 2
) -> Optional[dict]:
    """Generate an AI briefing and store it in the database."""
    articles = await _fetch_top_articles(hours_back=hours_back)
    if not articles:
        logger.info("No articles found for briefing generation")
        return None

    # Try AI generation first
    prompt = _build_briefing_prompt(articles, period)
    result = await _call_groq(prompt)
    model_used = GROQ_MODEL

    # Fallback to extractive summary
    if result is None:
        result = _extractive_fallback(articles)
        model_used = "extractive_fallback"

    content = result.get("content", "No briefing content generated.")
    things_to_watch = result.get("things_to_watch", [])

    # Store in database
    briefing_data = {
        "period": period,
        "content": content,
        "things_to_watch": things_to_watch,
        "model_used": model_used,
    }

    try:
        async with AsyncSessionLocal() as session:
            briefing = AIBriefing(
                period=period,
                content=content,
                things_to_watch=things_to_watch,
                model_used=model_used,
            )
            session.add(briefing)
            await session.commit()
            await session.refresh(briefing)
            briefing_data["id"] = str(briefing.id)
            briefing_data["generated_at"] = briefing.generated_at.isoformat()
    except Exception as e:
        logger.error(f"Failed to store briefing: {e}")

    # Cache latest briefing
    try:
        cache_key = f"briefing:{period}:latest"
        await cache.cache_set_json(cache_key, briefing_data, ttl=7200)

        await cache.publish(
            "briefing_updates",
            {"type": "new_briefing", "period": period},
        )
    except Exception as e:
        logger.warning(f"Failed to cache briefing: {e}")

    logger.info(f"Briefing generated: period={period}, model={model_used}")
    return briefing_data


async def get_latest_briefing(period: str = "hourly") -> Optional[dict]:
    """Retrieve the latest briefing, from cache or database."""
    cache_key = f"briefing:{period}:latest"
    cached = await cache.cache_get_json(cache_key)
    if cached:
        return cached

    try:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(AIBriefing)
                .where(AIBriefing.period == period)
                .order_by(AIBriefing.generated_at.desc())
                .limit(1)
            )
            result = await session.execute(stmt)
            briefing = result.scalar_one_or_none()
            if briefing:
                data = briefing.to_dict()
                await cache.cache_set_json(cache_key, data, ttl=7200)
                return data
    except Exception as e:
        logger.error(f"Failed to fetch briefing from DB: {e}")

    return None
