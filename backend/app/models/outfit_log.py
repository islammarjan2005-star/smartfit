from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Location(Base):
    """Saved locations/places the user visits."""
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)  # e.g., "Work", "Gym", "Mom's House"
    category = Column(String)  # work, social, fitness, dining, etc.

    # Geographic data (optional)
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)

    # Dress code hints
    dress_code = Column(String)  # casual, business, formal, athletic

    # Stats
    visit_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="locations")
    outfit_logs = relationship("OutfitLog", back_populates="location")


class OutfitLog(Base):
    """Log of when an outfit was worn and where."""
    __tablename__ = "outfit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    outfit_id = Column(Integer, ForeignKey("outfits.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))

    # When
    date = Column(DateTime, default=datetime.utcnow)

    # Quick log without saved outfit (just photo)
    quick_photo_path = Column(String)

    # Context
    occasion = Column(String)  # what type of event/activity
    weather = Column(String)   # weather conditions
    notes = Column(Text)

    # Self-rating
    comfort_rating = Column(Integer)  # 1-5
    style_rating = Column(Integer)    # 1-5

    # Detected via GPS or manual
    detected_location = Column(String)  # GPS-detected location name

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="outfit_logs")
    outfit = relationship("Outfit", back_populates="logs")
    location = relationship("Location", back_populates="outfit_logs")
