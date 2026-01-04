from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import uuid
from pathlib import Path
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.clothing import ClothingItem, ClothingCategory, ClothingColor
from app.schemas.clothing import (
    ClothingItemCreate,
    ClothingItemUpdate,
    ClothingItemResponse,
    ClothingItemList,
)
from app.services.auth import get_current_user
from app.services.ai_analysis import AIAnalysisService
from app.config import settings

router = APIRouter(prefix="/clothing", tags=["Clothing Items"])


@router.get("", response_model=ClothingItemList)
async def get_clothing_items(
    category: Optional[ClothingCategory] = None,
    color: Optional[ClothingColor] = None,
    occasion: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all clothing items for the current user."""
    query = db.query(ClothingItem).filter(ClothingItem.user_id == current_user.id)

    if category:
        query = query.filter(ClothingItem.category == category)
    if color:
        query = query.filter(ClothingItem.primary_color == color)
    if occasion:
        query = query.filter(ClothingItem.occasion_tags.contains(occasion))

    items = query.all()

    # Convert to response format
    response_items = [ClothingItemResponse.from_orm_with_lists(item) for item in items]

    # Count by category
    categories = {}
    for item in items:
        cat = item.category.value if item.category else "unknown"
        categories[cat] = categories.get(cat, 0) + 1

    return ClothingItemList(items=response_items, total=len(items), categories=categories)


@router.post("", response_model=ClothingItemResponse)
async def create_clothing_item(
    item_data: ClothingItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new clothing item manually."""
    item = ClothingItem(
        user_id=current_user.id,
        name=item_data.name,
        description=item_data.description,
        category=item_data.category,
        subcategory=item_data.subcategory,
        primary_color=item_data.primary_color,
        secondary_color=item_data.secondary_color,
        pattern=item_data.pattern,
        brand=item_data.brand,
        size=item_data.size,
        material=item_data.material,
        occasion_tags=",".join(item_data.occasion_tags) if item_data.occasion_tags else None,
        season_tags=",".join(item_data.season_tags) if item_data.season_tags else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ClothingItemResponse.from_orm_with_lists(item)


@router.post("/upload", response_model=ClothingItemResponse)
async def upload_clothing_item(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a clothing item image and auto-analyze it with AI."""
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )

    # Save file
    file_ext = Path(file.filename).suffix or ".jpg"
    file_name = f"{uuid.uuid4()}{file_ext}"
    file_path = f"{settings.UPLOAD_DIR}/wardrobe/{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Analyze with AI
    analysis = await AIAnalysisService.analyze_clothing_image(file_path)

    # Map analysis to enum values
    category = ClothingCategory.TOP  # Default
    if analysis.get("category"):
        try:
            category = ClothingCategory(analysis["category"].lower())
        except ValueError:
            pass

    primary_color = None
    if analysis.get("primary_color"):
        try:
            primary_color = ClothingColor(analysis["primary_color"].lower())
        except ValueError:
            pass

    secondary_color = None
    if analysis.get("secondary_color"):
        try:
            secondary_color = ClothingColor(analysis["secondary_color"].lower())
        except ValueError:
            pass

    # Create item
    item = ClothingItem(
        user_id=current_user.id,
        name=name or analysis.get("item_type", "New Item"),
        description=analysis.get("description"),
        category=category,
        subcategory=analysis.get("item_type"),
        primary_color=primary_color,
        secondary_color=secondary_color,
        pattern=analysis.get("pattern"),
        material=analysis.get("material"),
        occasion_tags=",".join(analysis.get("occasions", [])),
        season_tags=",".join(analysis.get("seasons", [])),
        image_path=file_path,
        ai_description=analysis.get("description"),
        style_score=analysis.get("style_score"),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ClothingItemResponse.from_orm_with_lists(item)


@router.post("/upload-wardrobe")
async def upload_wardrobe_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a wardrobe photo to detect multiple items at once."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )

    # Save file
    file_ext = Path(file.filename).suffix or ".jpg"
    file_name = f"wardrobe_{uuid.uuid4()}{file_ext}"
    file_path = f"{settings.UPLOAD_DIR}/wardrobe/{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Analyze wardrobe
    items_data = await AIAnalysisService.analyze_wardrobe_image(file_path)

    created_items = []
    for item_data in items_data:
        category = ClothingCategory.TOP
        if item_data.get("category"):
            try:
                category = ClothingCategory(item_data["category"].lower())
            except ValueError:
                pass

        primary_color = None
        if item_data.get("primary_color"):
            try:
                primary_color = ClothingColor(item_data["primary_color"].lower())
            except ValueError:
                pass

        item = ClothingItem(
            user_id=current_user.id,
            name=item_data.get("item_type", "Unknown Item"),
            description=item_data.get("description"),
            category=category,
            subcategory=item_data.get("item_type"),
            primary_color=primary_color,
            pattern=item_data.get("pattern"),
            occasion_tags=",".join(item_data.get("occasions", [])),
            season_tags=",".join(item_data.get("seasons", [])),
        )
        db.add(item)
        created_items.append(item)

    db.commit()

    return {
        "message": f"Detected and added {len(created_items)} items from wardrobe photo",
        "items": [ClothingItemResponse.from_orm_with_lists(item) for item in created_items],
    }


@router.get("/{item_id}", response_model=ClothingItemResponse)
async def get_clothing_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific clothing item."""
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    return ClothingItemResponse.from_orm_with_lists(item)


@router.put("/{item_id}", response_model=ClothingItemResponse)
async def update_clothing_item(
    item_id: int,
    item_data: ClothingItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a clothing item."""
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    update_data = item_data.model_dump(exclude_unset=True)

    # Handle list fields
    if "occasion_tags" in update_data:
        update_data["occasion_tags"] = ",".join(update_data["occasion_tags"]) if update_data["occasion_tags"] else None
    if "season_tags" in update_data:
        update_data["season_tags"] = ",".join(update_data["season_tags"]) if update_data["season_tags"] else None

    for key, value in update_data.items():
        setattr(item, key, value)

    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return ClothingItemResponse.from_orm_with_lists(item)


@router.delete("/{item_id}")
async def delete_clothing_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a clothing item."""
    item = db.query(ClothingItem).filter(
        ClothingItem.id == item_id,
        ClothingItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}
