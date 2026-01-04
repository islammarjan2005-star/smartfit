from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import uuid
from pathlib import Path
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.clothing import ClothingItem
from app.models.outfit import Outfit, OutfitItem
from app.schemas.outfit import OutfitCreate, OutfitUpdate, OutfitResponse
from app.schemas.clothing import ClothingItemResponse
from app.services.auth import get_current_user
from app.services.ai_analysis import AIAnalysisService
from app.config import settings

router = APIRouter(prefix="/outfits", tags=["Outfits"])


def outfit_to_response(outfit: Outfit) -> OutfitResponse:
    """Convert Outfit model to response schema."""
    items = [
        ClothingItemResponse.from_orm_with_lists(oi.clothing_item)
        for oi in outfit.items
    ]
    return OutfitResponse(
        id=outfit.id,
        name=outfit.name,
        description=outfit.description,
        occasion_tags=outfit.occasion_tags.split(",") if outfit.occasion_tags else [],
        season_tags=outfit.season_tags.split(",") if outfit.season_tags else [],
        image_path=outfit.image_path,
        style_score=outfit.style_score,
        ai_feedback=outfit.ai_feedback,
        is_favorite=outfit.is_favorite,
        times_worn=outfit.times_worn,
        last_worn=outfit.last_worn,
        created_at=outfit.created_at,
        items=items,
    )


@router.get("", response_model=List[OutfitResponse])
async def get_outfits(
    is_favorite: Optional[bool] = None,
    occasion: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all outfits for the current user."""
    query = db.query(Outfit).filter(Outfit.user_id == current_user.id)

    if is_favorite is not None:
        query = query.filter(Outfit.is_favorite == is_favorite)
    if occasion:
        query = query.filter(Outfit.occasion_tags.contains(occasion))

    outfits = query.order_by(Outfit.created_at.desc()).all()
    return [outfit_to_response(outfit) for outfit in outfits]


@router.post("", response_model=OutfitResponse)
async def create_outfit(
    outfit_data: OutfitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new outfit from selected clothing items."""
    # Verify all items belong to user
    items = db.query(ClothingItem).filter(
        ClothingItem.id.in_(outfit_data.clothing_item_ids),
        ClothingItem.user_id == current_user.id
    ).all()

    if len(items) != len(outfit_data.clothing_item_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some clothing items not found or don't belong to you"
        )

    # Create outfit
    outfit = Outfit(
        user_id=current_user.id,
        name=outfit_data.name or f"Outfit {datetime.now().strftime('%Y-%m-%d')}",
        description=outfit_data.description,
        occasion_tags=",".join(outfit_data.occasion_tags) if outfit_data.occasion_tags else None,
        season_tags=",".join(outfit_data.season_tags) if outfit_data.season_tags else None,
        is_favorite=outfit_data.is_favorite,
    )
    db.add(outfit)
    db.flush()

    # Add outfit items
    for item in items:
        outfit_item = OutfitItem(outfit_id=outfit.id, clothing_item_id=item.id)
        db.add(outfit_item)

    db.commit()
    db.refresh(outfit)
    return outfit_to_response(outfit)


@router.post("/from-photo", response_model=OutfitResponse)
async def create_outfit_from_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an outfit by taking a photo of what you're wearing."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )

    # Save file
    file_ext = Path(file.filename).suffix or ".jpg"
    file_name = f"outfit_{uuid.uuid4()}{file_ext}"
    file_path = f"{settings.UPLOAD_DIR}/outfits/{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Analyze outfit
    analysis = await AIAnalysisService.analyze_outfit_image(file_path)

    # Create outfit with AI analysis
    outfit = Outfit(
        user_id=current_user.id,
        name=f"Outfit {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        description=analysis.get("feedback"),
        occasion_tags=",".join(analysis.get("occasion_suitable", [])),
        image_path=file_path,
        style_score=analysis.get("style_rating"),
        ai_feedback=analysis.get("feedback"),
    )
    db.add(outfit)
    db.commit()
    db.refresh(outfit)

    return outfit_to_response(outfit)


@router.get("/{outfit_id}", response_model=OutfitResponse)
async def get_outfit(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific outfit."""
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found"
        )

    return outfit_to_response(outfit)


@router.put("/{outfit_id}", response_model=OutfitResponse)
async def update_outfit(
    outfit_id: int,
    outfit_data: OutfitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an outfit."""
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found"
        )

    update_data = outfit_data.model_dump(exclude_unset=True)

    # Handle clothing items update
    if "clothing_item_ids" in update_data:
        item_ids = update_data.pop("clothing_item_ids")
        items = db.query(ClothingItem).filter(
            ClothingItem.id.in_(item_ids),
            ClothingItem.user_id == current_user.id
        ).all()

        if len(items) != len(item_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some clothing items not found"
            )

        # Remove old items
        db.query(OutfitItem).filter(OutfitItem.outfit_id == outfit.id).delete()

        # Add new items
        for item in items:
            outfit_item = OutfitItem(outfit_id=outfit.id, clothing_item_id=item.id)
            db.add(outfit_item)

    # Handle list fields
    if "occasion_tags" in update_data:
        update_data["occasion_tags"] = ",".join(update_data["occasion_tags"]) if update_data["occasion_tags"] else None
    if "season_tags" in update_data:
        update_data["season_tags"] = ",".join(update_data["season_tags"]) if update_data["season_tags"] else None

    for key, value in update_data.items():
        setattr(outfit, key, value)

    outfit.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(outfit)
    return outfit_to_response(outfit)


@router.delete("/{outfit_id}")
async def delete_outfit(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an outfit."""
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found"
        )

    db.delete(outfit)
    db.commit()
    return {"message": "Outfit deleted successfully"}


@router.post("/{outfit_id}/favorite")
async def toggle_favorite(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle favorite status of an outfit."""
    outfit = db.query(Outfit).filter(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id
    ).first()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found"
        )

    outfit.is_favorite = not outfit.is_favorite
    db.commit()
    return {"is_favorite": outfit.is_favorite}
