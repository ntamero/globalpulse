import os
import hashlib
import logging
from typing import Optional

import httpx

from app.data import cache

logger = logging.getLogger(__name__)

# Google Cloud Translation API (free tier)
GOOGLE_TRANSLATE_API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY", "")
GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"

# LibreTranslate fallback
LIBRETRANSLATE_URL = os.getenv(
    "LIBRETRANSLATE_URL", "https://libretranslate.com/translate"
)
LIBRETRANSLATE_API_KEY = os.getenv("LIBRETRANSLATE_API_KEY", "")

# Supported languages
SUPPORTED_LANGUAGES = {
    "en": "English",
    "tr": "Turkish",
    "ar": "Arabic",
    "fa": "Persian",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "pt": "Portuguese",
    "zh": "Chinese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "hi": "Hindi",
}

# Translation cache TTL: 24 hours
TRANSLATION_CACHE_TTL = 86400


def _cache_key(text: str, target_lang: str) -> str:
    """Generate a deterministic cache key for a translation."""
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    return f"translate:{target_lang}:{text_hash}"


async def _translate_google(
    text: str, target_lang: str, source_lang: str = "en"
) -> Optional[str]:
    """Translate text using Google Cloud Translation API."""
    if not GOOGLE_TRANSLATE_API_KEY:
        return None

    params = {
        "q": text,
        "target": target_lang,
        "source": source_lang,
        "key": GOOGLE_TRANSLATE_API_KEY,
        "format": "text",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(GOOGLE_TRANSLATE_URL, data=params)
            resp.raise_for_status()
            data = resp.json()
            translations = data.get("data", {}).get("translations", [])
            if translations:
                return translations[0].get("translatedText", "")
    except httpx.HTTPStatusError as e:
        logger.warning(f"Google Translate HTTP error: {e.response.status_code}")
    except Exception as e:
        logger.warning(f"Google Translate error: {e}")

    return None


async def _translate_libretranslate(
    text: str, target_lang: str, source_lang: str = "en"
) -> Optional[str]:
    """Translate text using LibreTranslate API as fallback."""
    payload = {
        "q": text,
        "source": source_lang,
        "target": target_lang,
        "format": "text",
    }
    if LIBRETRANSLATE_API_KEY:
        payload["api_key"] = LIBRETRANSLATE_API_KEY

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(LIBRETRANSLATE_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("translatedText", "")
    except httpx.HTTPStatusError as e:
        logger.warning(f"LibreTranslate HTTP error: {e.response.status_code}")
    except Exception as e:
        logger.warning(f"LibreTranslate error: {e}")

    return None


async def translate_text(
    text: str,
    target_lang: str,
    source_lang: str = "en",
) -> str:
    """
    Translate text to the target language.

    Uses a two-tier strategy:
    1. Check Redis cache
    2. Try Google Cloud Translation API
    3. Fallback to LibreTranslate

    Args:
        text: The text to translate.
        target_lang: Target language code (e.g., "tr", "ar", "fr").
        source_lang: Source language code. Defaults to "en".

    Returns:
        Translated text, or the original text if translation fails.
    """
    if not text or not text.strip():
        return text

    if target_lang == source_lang:
        return text

    if target_lang not in SUPPORTED_LANGUAGES:
        logger.warning(f"Unsupported target language: {target_lang}")
        return text

    # Check cache
    key = _cache_key(text, target_lang)
    cached = await cache.cache_get(key)
    if cached:
        return cached

    # Try Google Translate first
    result = await _translate_google(text, target_lang, source_lang)

    # Fallback to LibreTranslate
    if result is None:
        result = await _translate_libretranslate(text, target_lang, source_lang)

    # If both fail, return original text
    if result is None:
        logger.warning(
            f"Translation failed for target_lang={target_lang}, "
            f"returning original text"
        )
        return text

    # Cache the translation
    await cache.cache_set(key, result, ttl=TRANSLATION_CACHE_TTL)

    return result


async def translate_batch(
    texts: list[str],
    target_lang: str,
    source_lang: str = "en",
) -> list[str]:
    """
    Translate a batch of texts to the target language.

    Processes items individually with caching. For Google Translate,
    each item is sent separately to stay within free tier limits.

    Args:
        texts: List of texts to translate.
        target_lang: Target language code.
        source_lang: Source language code. Defaults to "en".

    Returns:
        List of translated texts (same order as input).
    """
    results = []
    for text in texts:
        translated = await translate_text(text, target_lang, source_lang)
        results.append(translated)
    return results


def get_supported_languages() -> dict[str, str]:
    """Return a mapping of supported language codes to their names."""
    return SUPPORTED_LANGUAGES.copy()
