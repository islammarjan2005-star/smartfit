from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import shutil
import uuid
from pathlib import Path
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.outfit import Outfit
from app.models.outfit_log import OutfitLog, Location
from app.models.clothing import ClothingItem
from app.schemas.outfit_log import OutfitLogCreate, OutfitLogResponse, LocationResponse
from app.services.auth import get_current_user
from app.services.ai_analysis import AIAnalysisService
from app.config import settings

router = APIRouter(prefix="/logs", tags=["Outfit Logs"])


@router.get("", response_model=List[OutfitLogResponse])
async def get_outfit_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    location_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get outfit logs for the current user."""
    query = db.query(OutfitLog).filter(OutfitLog.user_id == current_user.id)

    if start_date:
        query = query.filter(OutfitLog.date >= start_date)
    if end_date:
        query = query.filter(OutfitLog.date <= end_date)
    if location_id:
        query = query.filter(OutfitLog.location_id == location_id)

    logs = query.order_by(desc(OutfitLog.date)).limit(limit).all()
    return logs


@router.post("", response_model=OutfitLogResponse)
async def create_outfit_log(
    log_data: OutfitLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log an outfit worn today."""
    # Verify outfit exists if provided
    if log_data.outfit_id:
        outfit = db.query(Outfit).filter(
            Outfit.id == log_data.outfit_id,
            Outfit.user_id == current_user.id
        ).first()
        if not outfit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Outfit not found"
            )
        # Update outfit stats
        outfit.times_worn += 1
        outfit.last_worn = log_data.date or datetime.utcnow()

        # Update individual item stats
        for outfit_item in outfit.items:
            item = outfit_item.clothing_item
            item.times_worn += 1
            item.last_worn = outfit.last_worn

    # Verify location exists if provided
    if log_data.location_id:
        location = db.query(Location).filter(
            Location.id == log_data.location_id,
            Location.user_id == current_user.id
        ).first()
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
        location.visit_count += 1

    # Create log
    log = OutfitLog(
        user_id=current_user.id,
        outfit_id=log_data.outfit_id,
        location_id=log_data.location_id,
        date=log_data.date or datetime.utcnow(),
        occasion=log_data.occasion,
        weather=log_data.weather,
        notes=log_data.notes,
        comfort_rating=log_data.comfort_rating,
        style_rating=log_data.style_rating,
        detected_location=log_data.detected_location,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.post("/quick", response_model=OutfitLogResponse)
async def quick_log_with_photo(
    file: UploadFile = File(...),
    location_id: Optional[int] = Form(None),
    occasion: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Quick log an outfit by taking a photo."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )

    # Save file
    file_ext = Path(file.filename).suffix or ".jpg"
    file_name = f"log_{uuid.uuid4()}{file_ext}"
    file_path = f"{settings.UPLOAD_DIR}/outfits/{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Optionally analyze the outfit photo
    analysis = await AIAnalysisService.analyze_outfit_image(file_path)

    # Update location visit count if provided
    if location_id:
        location = db.query(Location).filter(
            Location.id == location_id,
            Location.user_id == current_user.id
        ).first()
        if location:
            location.visit_count += 1

    # Create log
    log = OutfitLog(
        user_id=current_user.id,
        location_id=location_id,
        date=datetime.utcnow(),
        quick_photo_path=file_path,
        occasion=occasion or analysis.get("overall_style"),
        notes=notes or analysis.get("feedback"),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/calendar")
async def get_calendar_view(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get outfit logs organized by date for calendar view."""
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    logs = db.query(OutfitLog).filter(
        OutfitLog.user_id == current_user.id,
        OutfitLog.date >= start_date,
        OutfitLog.date < end_date
    ).all()

    # Organize by date
    calendar = {}
    for log in logs:
        date_str = log.date.strftime("%Y-%m-%d")
        if date_str not in calendar:
            calendar[date_str] = []
        calendar[date_str].append({
            "id": log.id,
            "outfit_id": log.outfit_id,
            "location": log.location.name if log.location else None,
            "occasion": log.occasion,
            "photo": log.quick_photo_path,
        })

    return calendar


@router.get("/stats")
async def get_outfit_stats(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get outfit wearing statistics."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    logs = db.query(OutfitLog).filter(
        OutfitLog.user_id == current_user.id,
        OutfitLog.date >= cutoff
    ).all()

    # Calculate stats
    total_logs = len(logs)
    unique_outfits = len(set(log.outfit_id for log in logs if log.outfit_id))
    locations_visited = len(set(log.location_id for log in logs if log.location_id))

    # Occasion breakdown
    occasions = {}
    for log in logs:
        if log.occasion:
            occasions[log.occasion] = occasions.get(log.occasion, 0) + 1

    # Day of week breakdown
    days_breakdown = {}
    for log in logs:
        day = log.date.strftime("%A")
        days_breakdown[day] = days_breakdown.get(day, 0) + 1

    return {
        "period_days": days,
        "total_logs": total_logs,
        "unique_outfits": unique_outfits,
        "locations_visited": locations_visited,
        "occasions": occasions,
        "by_day_of_week": days_breakdown,
        "avg_logs_per_day": round(total_logs / days, 2) if days > 0 else 0,
    }


@router.get("/{log_id}", response_model=OutfitLogResponse)
async def get_outfit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific outfit log."""
    log = db.query(OutfitLog).filter(
        OutfitLog.id == log_id,
        OutfitLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )

    return log


@router.delete("/{log_id}")
async def delete_outfit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an outfit log."""
    log = db.query(OutfitLog).filter(
        OutfitLog.id == log_id,
        OutfitLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )

    db.delete(log)
    db.commit()
    return {"message": "Log deleted successfully"}
