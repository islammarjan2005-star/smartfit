from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class VideoInsightRequest(BaseModel):
    """Request schema for analyzing a video."""
    url: Optional[str] = None  # Video URL (TikTok, Reels, Shorts)
    creator_mode: bool = False  # Enable creator analysis


class VideoInsightResponse(BaseModel):
    """Response schema for video analysis results."""
    # Main content
    summary: str
    steps: List[str]
    core_insight: str
    content_inspiration: str
    hooks: List[str]

    # Source info
    source_url: Optional[str] = None
    source_platform: Optional[str] = None
    title: Optional[str] = None

    # Creator mode (optional)
    creator_mode_enabled: bool = False
    hook_analysis: Optional[str] = None
    pacing_analysis: Optional[str] = None
    format_analysis: Optional[str] = None
    remix_ideas: Optional[str] = None

    # Metadata
    transcript: Optional[str] = None
    processing_time: Optional[float] = None


class SaveInsightRequest(BaseModel):
    """Request to save an insight."""
    source_url: Optional[str] = None
    source_platform: Optional[str] = None
    title: Optional[str] = None
    summary: str
    steps: List[str]
    core_insight: str
    content_inspiration: str
    hooks: List[str]
    creator_mode_enabled: bool = False
    hook_analysis: Optional[str] = None
    pacing_analysis: Optional[str] = None
    format_analysis: Optional[str] = None
    remix_ideas: Optional[str] = None
    transcript: Optional[str] = None


class SavedInsightResponse(BaseModel):
    """Response schema for saved insights."""
    id: int
    source_url: Optional[str]
    source_platform: Optional[str]
    title: Optional[str]
    summary: str
    steps: List[str]
    core_insight: str
    content_inspiration: str
    hooks: List[str]
    creator_mode_enabled: bool
    hook_analysis: Optional[str]
    pacing_analysis: Optional[str]
    format_analysis: Optional[str]
    remix_ideas: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SavedInsightsList(BaseModel):
    """List of saved insights."""
    items: List[SavedInsightResponse]
    total: int
