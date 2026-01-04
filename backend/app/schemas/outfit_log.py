from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class LocationCreate(BaseModel):
    name: str
    category: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    dress_code: Optional[str] = None


class LocationResponse(BaseModel):
    id: int
    name: str
    category: Optional[str]
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    dress_code: Optional[str]
    visit_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class OutfitLogCreate(BaseModel):
    outfit_id: Optional[int] = None
    location_id: Optional[int] = None
    date: Optional[datetime] = None
    occasion: Optional[str] = None
    weather: Optional[str] = None
    notes: Optional[str] = None
    comfort_rating: Optional[int] = None
    style_rating: Optional[int] = None
    detected_location: Optional[str] = None


class OutfitLogResponse(BaseModel):
    id: int
    outfit_id: Optional[int]
    location_id: Optional[int]
    date: datetime
    quick_photo_path: Optional[str]
    occasion: Optional[str]
    weather: Optional[str]
    notes: Optional[str]
    comfort_rating: Optional[int]
    style_rating: Optional[int]
    detected_location: Optional[str]
    created_at: datetime
    location: Optional[LocationResponse]

    class Config:
        from_attributes = True


class OutfitStats(BaseModel):
    total_outfits: int
    total_items: int
    total_logs: int
    most_worn_items: List[dict]
    least_worn_items: List[dict]
    favorite_locations: List[dict]
    outfit_frequency: dict  # By occasion/location
    suggestions: List[str]  # AI-generated suggestions


class WearHistoryAtLocation(BaseModel):
    location: LocationResponse
    outfits_worn: List[dict]  # outfit + wear count
    last_visit: datetime
    total_visits: int
