from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.clothing import ClothingItemResponse


class OutfitCreate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    clothing_item_ids: List[int]
    occasion_tags: Optional[List[str]] = []
    season_tags: Optional[List[str]] = []
    is_favorite: bool = False


class OutfitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    clothing_item_ids: Optional[List[int]] = None
    occasion_tags: Optional[List[str]] = None
    season_tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None


class OutfitResponse(BaseModel):
    id: int
    name: Optional[str]
    description: Optional[str]
    occasion_tags: List[str]
    season_tags: List[str]
    image_path: Optional[str]
    style_score: Optional[float]
    ai_feedback: Optional[str]
    is_favorite: bool
    times_worn: int
    last_worn: Optional[datetime]
    created_at: datetime
    items: List[ClothingItemResponse]

    class Config:
        from_attributes = True


class OutfitSuggestion(BaseModel):
    """AI-generated outfit suggestion."""
    outfit: OutfitResponse
    reason: str
    confidence_score: float
    occasion_match: str
    weather_appropriate: bool


class OutfitSuggestionRequest(BaseModel):
    occasion: Optional[str] = None
    location_id: Optional[int] = None
    weather: Optional[str] = None
    exclude_recently_worn: bool = True
    exclude_worn_at_location: bool = True
