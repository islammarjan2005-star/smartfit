import json
import os
import tempfile
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth import get_current_user
from app.services.video_insight_service import VideoInsightService
from app.schemas.video_insight import (
    VideoInsightRequest,
    VideoInsightResponse,
    SaveInsightRequest,
    SavedInsightResponse,
    SavedInsightsList,
)
from app.models.video_insight import SavedVideoInsight
from app.models.user import User
from app.config import settings

router = APIRouter(prefix="/video-insights", tags=["Video Insights"])


@router.post("/analyze-url", response_model=VideoInsightResponse)
async def analyze_video_url(
    request: VideoInsightRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Analyze a video from URL (TikTok, Reels, Shorts).
    Extracts transcript and generates insights.
    """
    if not request.url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Detect platform
    platform = VideoInsightService.detect_platform(request.url)
    if not platform:
        raise HTTPException(
            status_code=400,
            detail="Unsupported URL. Please use TikTok, Instagram Reels, or YouTube Shorts links."
        )

    # Process the video
    result = await VideoInsightService.process_video_url(
        request.url,
        creator_mode=request.creator_mode
    )

    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    return VideoInsightResponse(
        summary=result.get("summary", ""),
        steps=result.get("steps", []),
        core_insight=result.get("core_insight", ""),
        content_inspiration=result.get("content_inspiration", ""),
        hooks=result.get("hooks", []),
        source_url=result.get("source_url"),
        source_platform=result.get("source_platform"),
        title=result.get("title"),
        creator_mode_enabled=result.get("creator_mode_enabled", False),
        hook_analysis=result.get("hook_analysis"),
        pacing_analysis=result.get("pacing_analysis"),
        format_analysis=result.get("format_analysis"),
        remix_ideas=result.get("remix_ideas"),
        transcript=result.get("transcript"),
        processing_time=result.get("processing_time"),
    )


@router.post("/analyze-upload", response_model=VideoInsightResponse)
async def analyze_video_upload(
    file: UploadFile = File(...),
    creator_mode: bool = Form(False),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze an uploaded video file.
    Supports MP4, MOV, WebM formats.
    """
    # Validate file type
    allowed_types = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Please upload MP4, MOV, or WebM."
        )

    # Check file size (max 100MB)
    max_size = 100 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 100MB."
        )

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        # Process the video
        result = await VideoInsightService.process_video_file(
            temp_path,
            creator_mode=creator_mode
        )

        if "error" in result:
            raise HTTPException(status_code=422, detail=result["error"])

        return VideoInsightResponse(
            summary=result.get("summary", ""),
            steps=result.get("steps", []),
            core_insight=result.get("core_insight", ""),
            content_inspiration=result.get("content_inspiration", ""),
            hooks=result.get("hooks", []),
            source_platform="upload",
            creator_mode_enabled=result.get("creator_mode_enabled", False),
            hook_analysis=result.get("hook_analysis"),
            pacing_analysis=result.get("pacing_analysis"),
            format_analysis=result.get("format_analysis"),
            remix_ideas=result.get("remix_ideas"),
            transcript=result.get("transcript"),
            processing_time=result.get("processing_time"),
        )
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/save", response_model=SavedInsightResponse)
async def save_insight(
    insight: SaveInsightRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Save extracted insights (text only, never the video).
    """
    saved_insight = SavedVideoInsight(
        user_id=current_user.id,
        source_url=insight.source_url,
        source_platform=insight.source_platform,
        title=insight.title,
        summary=insight.summary,
        steps=json.dumps(insight.steps),
        core_insight=insight.core_insight,
        content_inspiration=insight.content_inspiration,
        hooks=json.dumps(insight.hooks),
        creator_mode_enabled=insight.creator_mode_enabled,
        hook_analysis=insight.hook_analysis,
        pacing_analysis=insight.pacing_analysis,
        format_analysis=insight.format_analysis,
        remix_ideas=insight.remix_ideas,
        transcript=insight.transcript,
    )

    db.add(saved_insight)
    db.commit()
    db.refresh(saved_insight)

    return SavedInsightResponse(
        id=saved_insight.id,
        source_url=saved_insight.source_url,
        source_platform=saved_insight.source_platform,
        title=saved_insight.title,
        summary=saved_insight.summary,
        steps=json.loads(saved_insight.steps) if saved_insight.steps else [],
        core_insight=saved_insight.core_insight,
        content_inspiration=saved_insight.content_inspiration,
        hooks=json.loads(saved_insight.hooks) if saved_insight.hooks else [],
        creator_mode_enabled=saved_insight.creator_mode_enabled,
        hook_analysis=saved_insight.hook_analysis,
        pacing_analysis=saved_insight.pacing_analysis,
        format_analysis=saved_insight.format_analysis,
        remix_ideas=saved_insight.remix_ideas,
        created_at=saved_insight.created_at,
    )


@router.get("/saved", response_model=SavedInsightsList)
async def get_saved_insights(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all saved insights for the current user.
    """
    query = db.query(SavedVideoInsight).filter(
        SavedVideoInsight.user_id == current_user.id
    ).order_by(SavedVideoInsight.created_at.desc())

    total = query.count()
    items = query.offset(skip).limit(limit).all()

    return SavedInsightsList(
        items=[
            SavedInsightResponse(
                id=item.id,
                source_url=item.source_url,
                source_platform=item.source_platform,
                title=item.title,
                summary=item.summary,
                steps=json.loads(item.steps) if item.steps else [],
                core_insight=item.core_insight,
                content_inspiration=item.content_inspiration,
                hooks=json.loads(item.hooks) if item.hooks else [],
                creator_mode_enabled=item.creator_mode_enabled,
                hook_analysis=item.hook_analysis,
                pacing_analysis=item.pacing_analysis,
                format_analysis=item.format_analysis,
                remix_ideas=item.remix_ideas,
                created_at=item.created_at,
            )
            for item in items
        ],
        total=total,
    )


@router.get("/saved/{insight_id}", response_model=SavedInsightResponse)
async def get_saved_insight(
    insight_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific saved insight.
    """
    insight = db.query(SavedVideoInsight).filter(
        SavedVideoInsight.id == insight_id,
        SavedVideoInsight.user_id == current_user.id
    ).first()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    return SavedInsightResponse(
        id=insight.id,
        source_url=insight.source_url,
        source_platform=insight.source_platform,
        title=insight.title,
        summary=insight.summary,
        steps=json.loads(insight.steps) if insight.steps else [],
        core_insight=insight.core_insight,
        content_inspiration=insight.content_inspiration,
        hooks=json.loads(insight.hooks) if insight.hooks else [],
        creator_mode_enabled=insight.creator_mode_enabled,
        hook_analysis=insight.hook_analysis,
        pacing_analysis=insight.pacing_analysis,
        format_analysis=insight.format_analysis,
        remix_ideas=insight.remix_ideas,
        created_at=insight.created_at,
    )


@router.delete("/saved/{insight_id}")
async def delete_saved_insight(
    insight_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a saved insight.
    """
    insight = db.query(SavedVideoInsight).filter(
        SavedVideoInsight.id == insight_id,
        SavedVideoInsight.user_id == current_user.id
    ).first()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    db.delete(insight)
    db.commit()

    return {"message": "Insight deleted successfully"}
