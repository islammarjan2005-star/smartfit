from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.schemas.outfit import OutfitSuggestionRequest
from app.services.auth import get_current_user
from app.services.suggestion_engine import OutfitSuggestionEngine

router = APIRouter(prefix="/suggestions", tags=["AI Suggestions"])


@router.post("")
async def get_outfit_suggestions(
    request: OutfitSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-powered outfit suggestions based on context."""
    engine = OutfitSuggestionEngine(db, current_user.id)

    suggestions = engine.suggest_outfits(
        occasion=request.occasion,
        location_id=request.location_id,
        weather=request.weather,
        exclude_recently_worn=request.exclude_recently_worn,
        exclude_worn_at_location=request.exclude_worn_at_location,
    )

    return {
        "suggestions": suggestions,
        "context": {
            "occasion": request.occasion,
            "location_id": request.location_id,
            "weather": request.weather,
        },
    }


@router.get("/for-location/{location_id}")
async def get_suggestions_for_location(
    location_id: int,
    avoid_repeats: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get outfit suggestions specifically for a location."""
    engine = OutfitSuggestionEngine(db, current_user.id)

    suggestions = engine.suggest_outfits(
        location_id=location_id,
        exclude_worn_at_location=avoid_repeats,
    )

    return {"suggestions": suggestions}


@router.get("/wardrobe-insights")
async def get_wardrobe_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI insights about your wardrobe."""
    engine = OutfitSuggestionEngine(db, current_user.id)
    return engine.get_wardrobe_insights()


@router.get("/purchase-suggestions")
async def get_purchase_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get suggestions for new items to purchase based on wardrobe gaps."""
    engine = OutfitSuggestionEngine(db, current_user.id)
    suggestions = engine.suggest_new_purchases()

    return {
        "suggestions": suggestions,
        "note": "These suggestions are based on gaps in your current wardrobe that could expand your outfit options.",
    }


@router.get("/new-combinations")
async def suggest_new_combinations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suggest new outfit combinations you haven't tried."""
    engine = OutfitSuggestionEngine(db, current_user.id)

    # Get all items and find untried combinations
    suggestions = engine.suggest_outfits(
        exclude_recently_worn=False,
        limit=10,
    )

    # Filter to combinations that haven't been saved as outfits
    # (This is a simplified version - could be enhanced to track tried combinations)

    return {
        "new_combinations": suggestions,
        "tip": "Try these outfit combinations you may not have considered!",
    }


@router.get("/weather/{weather}")
async def get_weather_appropriate(
    weather: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get outfit suggestions based on weather conditions."""
    engine = OutfitSuggestionEngine(db, current_user.id)

    suggestions = engine.suggest_outfits(
        weather=weather,
        exclude_recently_worn=True,
    )

    return {
        "weather": weather,
        "suggestions": suggestions,
    }
