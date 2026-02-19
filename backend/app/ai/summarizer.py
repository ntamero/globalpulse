import re
import logging
from typing import Optional

from app.ai.classifier import extract_entities, COUNTRY_COORDINATES

logger = logging.getLogger(__name__)

# Sentence boundary pattern
SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


def clean_summary(raw_summary: str) -> str:
    """Clean an RSS-provided summary: strip HTML, normalize whitespace."""
    if not raw_summary:
        return ""
    # Remove HTML tags
    text = re.sub(r"<[^>]+>", "", raw_summary)
    # Remove "Continue reading" / "Read more" suffixes
    text = re.sub(
        r"\s*(Continue reading|Read more|Click here|\.{3,})\s*$",
        "",
        text,
        flags=re.IGNORECASE,
    )
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Truncate overly long summaries
    if len(text) > 1000:
        text = text[:1000].rsplit(" ", 1)[0] + "..."
    return text


def extract_first_sentences(text: str, count: int = 3) -> str:
    """Extract the first N sentences from a block of text."""
    if not text:
        return ""
    sentences = SENTENCE_SPLIT.split(text)
    selected = sentences[:count]
    result = " ".join(s.strip() for s in selected if s.strip())
    if len(result) > 800:
        result = result[:800].rsplit(" ", 1)[0] + "..."
    return result


def summarize_article(
    title: str,
    summary: Optional[str] = None,
    full_text: Optional[str] = None,
) -> dict:
    """
    Produce a clean summary and extract key entities from an article.

    Priority:
    1. If an RSS summary exists, clean and use it
    2. If full text is available, extract the first 2-3 sentences
    3. Use the title as a minimal summary

    Returns:
        {
            "summary": str,
            "entities": list[str],
            "countries": list[str],
            "word_count": int,
        }
    """
    # Determine best available summary text
    if summary and len(summary.strip()) > 30:
        clean = clean_summary(summary)
    elif full_text and len(full_text.strip()) > 50:
        clean = extract_first_sentences(full_text, count=3)
    else:
        clean = title

    # Extract entities from title + summary
    combined_text = f"{title} {clean}"
    entities = extract_entities(combined_text)

    # Extract country mentions specifically
    countries = []
    for country_name in COUNTRY_COORDINATES:
        pattern = r"\b" + re.escape(country_name) + r"\b"
        if re.search(pattern, combined_text):
            countries.append(country_name)

    word_count = len(clean.split())

    return {
        "summary": clean,
        "entities": entities,
        "countries": countries,
        "word_count": word_count,
    }


def generate_headline_summary(articles: list[dict], max_articles: int = 5) -> str:
    """
    Generate a quick headline summary from a list of articles.
    Used for notification text and quick updates.
    """
    if not articles:
        return "No recent articles available."

    lines = []
    for article in articles[:max_articles]:
        title = article.get("title", "Untitled")
        source = article.get("source_name", "Unknown")
        region = article.get("region", "world").replace("_", " ").title()
        lines.append(f"[{region}] {title} ({source})")

    return "\n".join(lines)
