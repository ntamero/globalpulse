import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Float, Integer, Boolean, DateTime, JSON, Index, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from app.data.database import Base


class StreamType(str, enum.Enum):
    TV = "tv"
    RADIO = "radio"
    WEBCAM = "webcam"


class Article(Base):
    __tablename__ = "articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(1024), nullable=False)
    summary = Column(Text, nullable=True)
    source_name = Column(String(256), nullable=False)
    source_url = Column(String(2048), nullable=True)
    url = Column(String(2048), nullable=False, unique=True)
    region = Column(String(64), nullable=False, default="world", index=True)
    category = Column(String(64), nullable=False, default="general", index=True)
    published_at = Column(DateTime(timezone=True), nullable=True, index=True)
    scraped_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    importance_score = Column(Float, nullable=False, default=0.0)
    image_url = Column(String(2048), nullable=True)
    language = Column(String(10), nullable=False, default="en")
    translated_titles = Column(JSON, nullable=True, default=dict)
    translated_summaries = Column(JSON, nullable=True, default=dict)

    __table_args__ = (
        Index("ix_articles_region_category", "region", "category"),
        Index("ix_articles_published_at_desc", published_at.desc()),
        Index("ix_articles_importance_score_desc", importance_score.desc()),
        Index("ix_articles_scraped_at_desc", scraped_at.desc()),
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "title": self.title,
            "summary": self.summary,
            "source_name": self.source_name,
            "source_url": self.source_url,
            "url": self.url,
            "region": self.region,
            "category": self.category,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
            "importance_score": self.importance_score,
            "image_url": self.image_url,
            "language": self.language,
            "translated_titles": self.translated_titles or {},
            "translated_summaries": self.translated_summaries or {},
        }


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(1024), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), nullable=False, default="other", index=True)
    region = Column(String(64), nullable=False, default="world", index=True)
    country = Column(String(128), nullable=True)
    city = Column(String(256), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    severity = Column(Integer, nullable=False, default=1)
    timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    source_articles = Column(JSON, nullable=True, default=list)

    __table_args__ = (
        Index("ix_events_region_category", "region", "category"),
        Index("ix_events_timestamp_desc", timestamp.desc()),
        Index("ix_events_severity_desc", severity.desc()),
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "region": self.region,
            "country": self.country,
            "city": self.city,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "source_articles": self.source_articles or [],
        }


class AIBriefing(Base):
    __tablename__ = "ai_briefings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    period = Column(String(32), nullable=False, index=True)
    content = Column(Text, nullable=False)
    things_to_watch = Column(JSON, nullable=True, default=list)
    generated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    model_used = Column(String(128), nullable=True)

    __table_args__ = (
        Index("ix_ai_briefings_generated_at_desc", generated_at.desc()),
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "period": self.period,
            "content": self.content,
            "things_to_watch": self.things_to_watch or [],
            "generated_at": self.generated_at.isoformat() if self.generated_at else None,
            "model_used": self.model_used,
        }


class Stream(Base):
    __tablename__ = "streams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(256), nullable=False)
    stream_type = Column(
        Enum(StreamType, name="stream_type_enum"),
        nullable=False,
        index=True,
    )
    url = Column(String(2048), nullable=True)
    embed_url = Column(String(2048), nullable=True)
    region = Column(String(64), nullable=False, default="world", index=True)
    country = Column(String(128), nullable=True)
    language = Column(String(10), nullable=False, default="en")
    is_live = Column(Boolean, nullable=False, default=True)
    thumbnail_url = Column(String(2048), nullable=True)
    category = Column(String(64), nullable=False, default="news", index=True)

    __table_args__ = (
        Index("ix_streams_type_region", "stream_type", "region"),
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "name": self.name,
            "stream_type": self.stream_type.value if self.stream_type else None,
            "url": self.url,
            "embed_url": self.embed_url,
            "region": self.region,
            "country": self.country,
            "language": self.language,
            "is_live": self.is_live,
            "thumbnail_url": self.thumbnail_url,
            "category": self.category,
        }
