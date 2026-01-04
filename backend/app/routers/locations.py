from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.outfit_log import Location, OutfitLog
from app.schemas.outfit_log import LocationCreate, LocationResponse
from app.services.auth import get_current_user
from app.services.suggestion_engine import OutfitSuggestionEngine

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("", response_model=List[LocationResponse])
async def get_locations(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all saved locations."""
    query = db.query(Location).filter(Location.user_id == current_user.id)

    if category:
        query = query.filter(Location.category == category)

    locations = query.order_by(desc(Location.visit_count)).all()
    return locations


@router.post("", response_model=LocationResponse)
async def create_location(
    location_data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new saved location."""
    location = Location(
        user_id=current_user.id,
        name=location_data.name,
        category=location_data.category,
        address=location_data.address,
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        dress_code=location_data.dress_code,
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific location."""
    location = db.query(Location).filter(
        Location.id == location_id,
        Location.user_id == current_user.id
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    return location


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a location."""
    location = db.query(Location).filter(
        Location.id == location_id,
        Location.user_id == current_user.id
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    for key, value in location_data.model_dump().items():
        setattr(location, key, value)

    db.commit()
    db.refresh(location)
    return location


@router.delete("/{location_id}")
async def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a location."""
    location = db.query(Location).filter(
        Location.id == location_id,
        Location.user_id == current_user.id
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    db.delete(location)
    db.commit()
    return {"message": "Location deleted successfully"}


@router.get("/{location_id}/history")
async def get_location_history(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get outfit history for a specific location."""
    location = db.query(Location).filter(
        Location.id == location_id,
        Location.user_id == current_user.id
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    logs = db.query(OutfitLog).filter(
        OutfitLog.user_id == current_user.id,
        OutfitLog.location_id == location_id
    ).order_by(desc(OutfitLog.date)).all()

    # Aggregate outfit usage
    outfit_counts = {}
    for log in logs:
        if log.outfit_id:
            if log.outfit_id not in outfit_counts:
                outfit_counts[log.outfit_id] = {
                    "outfit_id": log.outfit_id,
                    "outfit_name": log.outfit.name if log.outfit else None,
                    "count": 0,
                    "last_worn": log.date,
                }
            outfit_counts[log.outfit_id]["count"] += 1

    return {
        "location": location.name,
        "total_visits": len(logs),
        "outfits_worn": list(outfit_counts.values()),
        "recent_visits": [
            {
                "date": log.date.isoformat(),
                "outfit_id": log.outfit_id,
                "occasion": log.occasion,
            }
            for log in logs[:10]
        ],
    }


@router.get("/{location_id}/repeat-analysis")
async def analyze_repeat_outfits(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze how often the same outfit is worn to a location."""
    engine = OutfitSuggestionEngine(db, current_user.id)
    return engine.get_repeat_wear_analysis(location_id)
