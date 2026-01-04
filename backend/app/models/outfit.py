from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Outfit(Base):
    """A saved combination of clothing items."""
    __tablename__ = "outfits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String)
    description = Column(Text)

    # Occasion/context
    occasion_tags = Column(String)  # comma-separated
    season_tags = Column(String)

    # Image of the complete outfit
    image_path = Column(String)

    # AI analysis
    style_score = Column(Float)
    ai_feedback = Column(Text)

    # Favorite status
    is_favorite = Column(Boolean, default=False)

    # Stats
    times_worn = Column(Integer, default=0)
    last_worn = Column(DateTime)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="outfits")
    items = relationship("OutfitItem", back_populates="outfit", cascade="all, delete-orphan")
    logs = relationship("OutfitLog", back_populates="outfit")


class OutfitItem(Base):
    """Junction table linking outfits to clothing items."""
    __tablename__ = "outfit_items"

    id = Column(Integer, primary_key=True, index=True)
    outfit_id = Column(Integer, ForeignKey("outfits.id"), nullable=False)
    clothing_item_id = Column(Integer, ForeignKey("clothing_items.id"), nullable=False)

    # Relationships
    outfit = relationship("Outfit", back_populates="items")
    clothing_item = relationship("ClothingItem", back_populates="outfit_items")
