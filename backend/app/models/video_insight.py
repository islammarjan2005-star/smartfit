from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class SavedVideoInsight(Base):
    """Model for storing extracted video insights."""
    __tablename__ = "saved_video_insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Source info (we store metadata, NOT the video itself)
    source_url = Column(String, nullable=True)  # Original URL if provided
    source_platform = Column(String, nullable=True)  # tiktok, reels, shorts, upload

    # Extracted content
    title = Column(String, nullable=True)
    summary = Column(Text, nullable=False)
    steps = Column(Text, nullable=True)  # JSON array of steps
    core_insight = Column(String, nullable=False)
    content_inspiration = Column(String, nullable=False)
    hooks = Column(Text, nullable=False)  # JSON array of hooks

    # Creator mode analysis (optional)
    creator_mode_enabled = Column(Boolean, default=False)
    hook_analysis = Column(Text, nullable=True)
    pacing_analysis = Column(Text, nullable=True)
    format_analysis = Column(Text, nullable=True)
    remix_ideas = Column(Text, nullable=True)

    # Original transcript for reference
    transcript = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="saved_insights")

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "source_url": self.source_url,
            "source_platform": self.source_platform,
            "title": self.title,
            "summary": self.summary,
            "steps": json.loads(self.steps) if self.steps else [],
            "core_insight": self.core_insight,
            "content_inspiration": self.content_inspiration,
            "hooks": json.loads(self.hooks) if self.hooks else [],
            "creator_mode_enabled": self.creator_mode_enabled,
            "hook_analysis": self.hook_analysis,
            "pacing_analysis": self.pacing_analysis,
            "format_analysis": self.format_analysis,
            "remix_ideas": self.remix_ideas,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
