import os
import json
import logging
from typing import Optional, Any
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_pool


async def cache_get(key: str) -> Optional[str]:
    try:
        r = await get_redis()
        value = await r.get(key)
        return value
    except Exception as e:
        logger.warning(f"Redis cache_get error for key={key}: {e}")
        return None


async def cache_set(key: str, value: Any, ttl: int = 3600) -> bool:
    try:
        r = await get_redis()
        if not isinstance(value, str):
            value = json.dumps(value)
        await r.set(key, value, ex=ttl)
        return True
    except Exception as e:
        logger.warning(f"Redis cache_set error for key={key}: {e}")
        return False


async def cache_delete(key: str) -> bool:
    try:
        r = await get_redis()
        await r.delete(key)
        return True
    except Exception as e:
        logger.warning(f"Redis cache_delete error for key={key}: {e}")
        return False


async def cache_get_json(key: str) -> Optional[Any]:
    raw = await cache_get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw


async def cache_set_json(key: str, value: Any, ttl: int = 3600) -> bool:
    return await cache_set(key, json.dumps(value, default=str), ttl)


async def publish(channel: str, message: Any) -> bool:
    try:
        r = await get_redis()
        if not isinstance(message, str):
            message = json.dumps(message, default=str)
        await r.publish(channel, message)
        return True
    except Exception as e:
        logger.warning(f"Redis publish error for channel={channel}: {e}")
        return False


async def subscribe(channel: str):
    try:
        r = await get_redis()
        pubsub = r.pubsub()
        await pubsub.subscribe(channel)
        return pubsub
    except Exception as e:
        logger.warning(f"Redis subscribe error for channel={channel}: {e}")
        return None


async def close_redis() -> None:
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.close()
        _redis_pool = None
        logger.info("Redis connections closed")
