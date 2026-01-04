from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.models.clothing import ClothingCategory, ClothingColor


class ClothingItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: ClothingCategory
    subcategory: Optional[str] = None
    primary_color: Optional[ClothingColor] = None
    secondary_color: Optional[ClothingColor] = None
    pattern: Optional[str] = None
    brand: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    occasion_tags: Optional[List[str]] = []
    season_tags: Optional[List[str]] = []


class ClothingItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ClothingCategory] = None
    subcategory: Optional[str] = None
    primary_color: Optional[ClothingColor] = None
    secondary_color: Optional[ClothingColor] = None
    pattern: Optional[str] = None
    brand: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    occasion_tags: Optional[List[str]] = None
    season_tags: Optional[List[str]] = None


class ClothingItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: ClothingCategory
    subcategory: Optional[str]
    primary_color: Optional[ClothingColor]
    secondary_color: Optional[ClothingColor]
    pattern: Optional[str]
    brand: Optional[str]
    size: Optional[str]
    material: Optional[str]
    occasion_tags: List[str]
    season_tags: List[str]
    image_path: Optional[str]
    thumbnail_path: Optional[str]
    ai_description: Optional[str]
    style_score: Optional[float]
    times_worn: int
    last_worn: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_lists(cls, obj):
        return cls(
            id=obj.id,
            name=obj.name,
            description=obj.description,
            category=obj.category,
            subcategory=obj.subcategory,
            primary_color=obj.primary_color,
            secondary_color=obj.secondary_color,
            pattern=obj.pattern,
            brand=obj.brand,
            size=obj.size,
            material=obj.material,
            occasion_tags=obj.occasion_tags.split(",") if obj.occasion_tags else [],
            season_tags=obj.season_tags.split(",") if obj.season_tags else [],
            image_path=obj.image_path,
            thumbnail_path=obj.thumbnail_path,
            ai_description=obj.ai_description,
            style_score=obj.style_score,
            times_worn=obj.times_worn,
            last_worn=obj.last_worn,
            created_at=obj.created_at,
        )


class ClothingItemList(BaseModel):
    items: List[ClothingItemResponse]
    total: int
    categories: dict  # Count by category


class AIAnalysisResult(BaseModel):
    category: ClothingCategory
    subcategory: str
    primary_color: ClothingColor
    secondary_color: Optional[ClothingColor]
    pattern: str
    description: str
    occasion_tags: List[str]
    season_tags: List[str]
    style_score: float
