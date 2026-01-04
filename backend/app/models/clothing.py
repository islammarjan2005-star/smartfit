from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import enum


class ClothingCategory(str, enum.Enum):
    TOP = "top"
    BOTTOM = "bottom"
    DRESS = "dress"
    OUTERWEAR = "outerwear"
    SHOES = "shoes"
    ACCESSORY = "accessory"
    UNDERWEAR = "underwear"
    SWIMWEAR = "swimwear"
    SLEEPWEAR = "sleepwear"
    ACTIVEWEAR = "activewear"


class ClothingColor(str, enum.Enum):
    BLACK = "black"
    WHITE = "white"
    GRAY = "gray"
    RED = "red"
    BLUE = "blue"
    GREEN = "green"
    YELLOW = "yellow"
    ORANGE = "orange"
    PURPLE = "purple"
    PINK = "pink"
    BROWN = "brown"
    BEIGE = "beige"
    NAVY = "navy"
    MULTICOLOR = "multicolor"


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Basic info
    name = Column(String, nullable=False)
    description = Column(Text)
    category = Column(Enum(ClothingCategory), nullable=False)
    subcategory = Column(String)  # e.g., "t-shirt", "jeans", "sneakers"

    # Visual attributes (can be AI-detected)
    primary_color = Column(Enum(ClothingColor))
    secondary_color = Column(Enum(ClothingColor))
    pattern = Column(String)  # solid, striped, floral, etc.

    # Details
    brand = Column(String)
    size = Column(String)
    material = Column(String)

    # Context/occasions
    occasion_tags = Column(String)  # comma-separated: casual, formal, work, party
    season_tags = Column(String)    # comma-separated: spring, summer, fall, winter

    # Images
    image_path = Column(String)
    thumbnail_path = Column(String)

    # AI-generated attributes
    ai_description = Column(Text)
    style_score = Column(Float)  # 0-10 versatility score

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    times_worn = Column(Integer, default=0)
    last_worn = Column(DateTime)

    # Relationships
    owner = relationship("User", back_populates="clothing_items")
    outfit_items = relationship("OutfitItem", back_populates="clothing_item")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category.value if self.category else None,
            "subcategory": self.subcategory,
            "primary_color": self.primary_color.value if self.primary_color else None,
            "secondary_color": self.secondary_color.value if self.secondary_color else None,
            "pattern": self.pattern,
            "brand": self.brand,
            "occasion_tags": self.occasion_tags.split(",") if self.occasion_tags else [],
            "season_tags": self.season_tags.split(",") if self.season_tags else [],
            "image_path": self.image_path,
            "times_worn": self.times_worn,
            "last_worn": self.last_worn.isoformat() if self.last_worn else None,
        }
