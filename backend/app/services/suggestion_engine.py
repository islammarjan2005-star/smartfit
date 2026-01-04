from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import random

from app.models.clothing import ClothingItem, ClothingCategory, ClothingColor
from app.models.outfit import Outfit, OutfitItem
from app.models.outfit_log import OutfitLog, Location


class OutfitSuggestionEngine:
    """AI-powered outfit suggestion engine based on user history and context."""

    # Color compatibility rules
    NEUTRAL_COLORS = {ClothingColor.BLACK, ClothingColor.WHITE, ClothingColor.GRAY, ClothingColor.BEIGE, ClothingColor.NAVY}

    COLOR_COMPLEMENTS = {
        ClothingColor.BLUE: [ClothingColor.ORANGE, ClothingColor.WHITE, ClothingColor.BEIGE],
        ClothingColor.RED: [ClothingColor.WHITE, ClothingColor.BLACK, ClothingColor.NAVY],
        ClothingColor.GREEN: [ClothingColor.WHITE, ClothingColor.BROWN, ClothingColor.BEIGE],
        ClothingColor.YELLOW: [ClothingColor.NAVY, ClothingColor.GRAY, ClothingColor.WHITE],
        ClothingColor.PURPLE: [ClothingColor.WHITE, ClothingColor.GRAY, ClothingColor.BEIGE],
        ClothingColor.ORANGE: [ClothingColor.BLUE, ClothingColor.WHITE, ClothingColor.NAVY],
        ClothingColor.PINK: [ClothingColor.GRAY, ClothingColor.WHITE, ClothingColor.NAVY],
        ClothingColor.BROWN: [ClothingColor.WHITE, ClothingColor.BEIGE, ClothingColor.GREEN],
    }

    # Occasion to dress code mapping
    OCCASION_FORMALITY = {
        "work": "business",
        "office": "business",
        "meeting": "business",
        "interview": "formal",
        "wedding": "formal",
        "party": "smart_casual",
        "date": "smart_casual",
        "dinner": "smart_casual",
        "casual": "casual",
        "weekend": "casual",
        "gym": "athletic",
        "workout": "athletic",
        "sports": "athletic",
    }

    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id

    def get_wardrobe_items(self) -> List[ClothingItem]:
        """Get all user's clothing items."""
        return self.db.query(ClothingItem).filter(
            ClothingItem.user_id == self.user_id
        ).all()

    def get_items_by_category(self) -> Dict[ClothingCategory, List[ClothingItem]]:
        """Group wardrobe items by category."""
        items = self.get_wardrobe_items()
        grouped = {}
        for item in items:
            if item.category not in grouped:
                grouped[item.category] = []
            grouped[item.category].append(item)
        return grouped

    def suggest_outfits(
        self,
        occasion: Optional[str] = None,
        location_id: Optional[int] = None,
        weather: Optional[str] = None,
        exclude_recently_worn: bool = True,
        exclude_worn_at_location: bool = True,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Generate outfit suggestions based on context.
        """
        suggestions = []
        items_by_category = self.get_items_by_category()

        # Get location info if provided
        location = None
        location_history = []
        if location_id:
            location = self.db.query(Location).filter(Location.id == location_id).first()
            if location and exclude_worn_at_location:
                # Get outfits worn at this location
                location_history = self._get_location_outfit_history(location_id)

        # Get recently worn items
        recently_worn = set()
        if exclude_recently_worn:
            recently_worn = self._get_recently_worn_items(days=14)

        # Generate outfit combinations
        tops = items_by_category.get(ClothingCategory.TOP, [])
        bottoms = items_by_category.get(ClothingCategory.BOTTOM, [])
        dresses = items_by_category.get(ClothingCategory.DRESS, [])
        outerwear = items_by_category.get(ClothingCategory.OUTERWEAR, [])
        shoes = items_by_category.get(ClothingCategory.SHOES, [])

        # Filter by occasion if provided
        if occasion:
            tops = self._filter_by_occasion(tops, occasion)
            bottoms = self._filter_by_occasion(bottoms, occasion)
            dresses = self._filter_by_occasion(dresses, occasion)
            shoes = self._filter_by_occasion(shoes, occasion)

        # Generate combinations
        combinations = []

        # Top + Bottom combinations
        for top in tops:
            if top.id in recently_worn:
                continue
            for bottom in bottoms:
                if bottom.id in recently_worn:
                    continue
                if self._colors_compatible(top.primary_color, bottom.primary_color):
                    combo = {
                        "items": [top, bottom],
                        "score": self._calculate_outfit_score(
                            [top, bottom], occasion, location, location_history
                        ),
                    }
                    combinations.append(combo)

        # Dress combinations
        for dress in dresses:
            if dress.id not in recently_worn:
                combo = {
                    "items": [dress],
                    "score": self._calculate_outfit_score(
                        [dress], occasion, location, location_history
                    ),
                }
                combinations.append(combo)

        # Add shoes to top combinations
        for combo in combinations:
            if shoes:
                best_shoe = self._find_matching_shoe(combo["items"], shoes, recently_worn)
                if best_shoe:
                    combo["items"].append(best_shoe)
                    combo["score"] += 1

        # Add outerwear if weather suggests it
        if weather and weather.lower() in ["cold", "rainy", "cool", "windy"]:
            for combo in combinations:
                if outerwear:
                    best_outer = self._find_matching_outerwear(combo["items"], outerwear)
                    if best_outer:
                        combo["items"].append(best_outer)

        # Sort by score and take top suggestions
        combinations.sort(key=lambda x: x["score"], reverse=True)
        top_combos = combinations[:limit]

        # Format suggestions
        for combo in top_combos:
            suggestion = {
                "items": [item.to_dict() for item in combo["items"]],
                "score": combo["score"],
                "reason": self._generate_suggestion_reason(combo["items"], occasion, location),
                "weather_appropriate": self._is_weather_appropriate(combo["items"], weather),
            }
            suggestions.append(suggestion)

        return suggestions

    def _get_recently_worn_items(self, days: int = 14) -> set:
        """Get IDs of items worn in the last N days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        recent_logs = self.db.query(OutfitLog).filter(
            OutfitLog.user_id == self.user_id,
            OutfitLog.date >= cutoff
        ).all()

        worn_items = set()
        for log in recent_logs:
            if log.outfit:
                for outfit_item in log.outfit.items:
                    worn_items.add(outfit_item.clothing_item_id)

        return worn_items

    def _get_location_outfit_history(self, location_id: int) -> List[int]:
        """Get outfit IDs worn at a specific location."""
        logs = self.db.query(OutfitLog).filter(
            OutfitLog.user_id == self.user_id,
            OutfitLog.location_id == location_id
        ).all()
        return [log.outfit_id for log in logs if log.outfit_id]

    def _filter_by_occasion(self, items: List[ClothingItem], occasion: str) -> List[ClothingItem]:
        """Filter items suitable for the occasion."""
        filtered = []
        for item in items:
            if item.occasion_tags:
                tags = item.occasion_tags.lower().split(",")
                if any(occasion.lower() in tag for tag in tags):
                    filtered.append(item)
                elif occasion.lower() in ["casual", "everyday"]:
                    filtered.append(item)  # Include items without specific tags for casual
            else:
                # Items without tags are considered casual/versatile
                if occasion.lower() in ["casual", "everyday", "weekend"]:
                    filtered.append(item)
        return filtered if filtered else items  # Fall back to all items if none match

    def _colors_compatible(self, color1: Optional[ClothingColor], color2: Optional[ClothingColor]) -> bool:
        """Check if two colors work well together."""
        if not color1 or not color2:
            return True

        # Neutral colors go with everything
        if color1 in self.NEUTRAL_COLORS or color2 in self.NEUTRAL_COLORS:
            return True

        # Same color family
        if color1 == color2:
            return True

        # Check complement rules
        if color1 in self.COLOR_COMPLEMENTS:
            if color2 in self.COLOR_COMPLEMENTS[color1]:
                return True

        if color2 in self.COLOR_COMPLEMENTS:
            if color1 in self.COLOR_COMPLEMENTS[color2]:
                return True

        return False

    def _calculate_outfit_score(
        self,
        items: List[ClothingItem],
        occasion: Optional[str],
        location: Optional[Location],
        location_history: List[int],
    ) -> float:
        """Calculate a score for an outfit combination."""
        score = 5.0  # Base score

        # Color harmony bonus
        if len(items) >= 2 and self._colors_compatible(items[0].primary_color, items[1].primary_color):
            score += 1.0

        # Variety bonus - prefer items not worn recently
        for item in items:
            if item.times_worn == 0:
                score += 0.5  # Unworn items get a boost
            elif item.times_worn < 5:
                score += 0.3

        # Style score from AI analysis
        for item in items:
            if item.style_score:
                score += item.style_score * 0.1

        # Location dress code match
        if location and location.dress_code:
            if occasion:
                formality = self.OCCASION_FORMALITY.get(occasion.lower(), "casual")
                if location.dress_code.lower() == formality:
                    score += 2.0

        return score

    def _find_matching_shoe(
        self,
        outfit_items: List[ClothingItem],
        shoes: List[ClothingItem],
        recently_worn: set,
    ) -> Optional[ClothingItem]:
        """Find a shoe that matches the outfit."""
        available_shoes = [s for s in shoes if s.id not in recently_worn]
        if not available_shoes:
            available_shoes = shoes

        # Prefer neutral colored shoes
        for shoe in available_shoes:
            if shoe.primary_color in self.NEUTRAL_COLORS:
                return shoe

        # Otherwise pick randomly
        return random.choice(available_shoes) if available_shoes else None

    def _find_matching_outerwear(
        self,
        outfit_items: List[ClothingItem],
        outerwear: List[ClothingItem],
    ) -> Optional[ClothingItem]:
        """Find outerwear that matches the outfit."""
        if not outerwear:
            return None

        # Prefer neutral outerwear
        for item in outerwear:
            if item.primary_color in self.NEUTRAL_COLORS:
                return item

        return outerwear[0]

    def _generate_suggestion_reason(
        self,
        items: List[ClothingItem],
        occasion: Optional[str],
        location: Optional[Location],
    ) -> str:
        """Generate a human-readable reason for the suggestion."""
        reasons = []

        if len(items) >= 2:
            colors = [item.primary_color.value for item in items if item.primary_color]
            if colors:
                reasons.append(f"Great color combination with {' and '.join(colors[:2])}")

        if occasion:
            reasons.append(f"Perfect for {occasion}")

        if location:
            reasons.append(f"Suitable for {location.name}")

        # Check for variety
        unworn = [item for item in items if item.times_worn == 0]
        if unworn:
            reasons.append("Includes items you haven't worn yet!")

        return ". ".join(reasons) if reasons else "A versatile everyday combination"

    def _is_weather_appropriate(self, items: List[ClothingItem], weather: Optional[str]) -> bool:
        """Check if outfit is appropriate for weather."""
        if not weather:
            return True

        weather = weather.lower()
        has_outerwear = any(item.category == ClothingCategory.OUTERWEAR for item in items)

        if weather in ["cold", "freezing", "snowy"]:
            return has_outerwear
        elif weather in ["hot", "sunny"]:
            return not has_outerwear

        return True

    def get_wardrobe_insights(self) -> Dict[str, Any]:
        """Generate insights and suggestions about the wardrobe."""
        items = self.get_wardrobe_items()
        items_by_category = self.get_items_by_category()

        insights = {
            "total_items": len(items),
            "by_category": {cat.value: len(items) for cat, items in items_by_category.items()},
            "color_distribution": self._get_color_distribution(items),
            "most_worn": self._get_most_worn(items, 5),
            "least_worn": self._get_least_worn(items, 5),
            "never_worn": [item.to_dict() for item in items if item.times_worn == 0][:5],
            "suggestions": [],
        }

        # Generate suggestions
        suggestions = []

        # Check for wardrobe gaps
        if ClothingCategory.OUTERWEAR not in items_by_category or len(items_by_category[ClothingCategory.OUTERWEAR]) < 2:
            suggestions.append("Consider adding more outerwear for versatility")

        if ClothingCategory.SHOES not in items_by_category or len(items_by_category[ClothingCategory.SHOES]) < 3:
            suggestions.append("A few more shoe options would expand your outfit possibilities")

        # Check color balance
        color_dist = insights["color_distribution"]
        if len(color_dist) < 4:
            suggestions.append("Adding more color variety could refresh your wardrobe")

        # Check for unworn items
        never_worn_count = len([item for item in items if item.times_worn == 0])
        if never_worn_count > 5:
            suggestions.append(f"You have {never_worn_count} unworn items - try incorporating them into new outfits!")

        insights["suggestions"] = suggestions
        return insights

    def _get_color_distribution(self, items: List[ClothingItem]) -> Dict[str, int]:
        """Get count of items by color."""
        distribution = {}
        for item in items:
            if item.primary_color:
                color = item.primary_color.value
                distribution[color] = distribution.get(color, 0) + 1
        return dict(sorted(distribution.items(), key=lambda x: x[1], reverse=True))

    def _get_most_worn(self, items: List[ClothingItem], limit: int) -> List[Dict]:
        """Get most frequently worn items."""
        sorted_items = sorted(items, key=lambda x: x.times_worn, reverse=True)
        return [item.to_dict() for item in sorted_items[:limit]]

    def _get_least_worn(self, items: List[ClothingItem], limit: int) -> List[Dict]:
        """Get least worn items (excluding never worn)."""
        worn_items = [item for item in items if item.times_worn > 0]
        sorted_items = sorted(worn_items, key=lambda x: x.times_worn)
        return [item.to_dict() for item in sorted_items[:limit]]

    def suggest_new_purchases(self) -> List[Dict[str, Any]]:
        """Suggest new items to buy based on wardrobe gaps and outfit potential."""
        items_by_category = self.get_items_by_category()
        suggestions = []

        # Analyze what's missing for complete outfits
        tops = items_by_category.get(ClothingCategory.TOP, [])
        bottoms = items_by_category.get(ClothingCategory.BOTTOM, [])

        # Check for neutral basics
        neutral_tops = [t for t in tops if t.primary_color in self.NEUTRAL_COLORS]
        if len(neutral_tops) < 3:
            suggestions.append({
                "category": "top",
                "suggestion": "A neutral top (white, black, or gray) for more outfit combinations",
                "reason": "Neutral tops are versatile and pair with almost anything",
            })

        # Check for variety in bottoms
        if len(bottoms) < 3:
            suggestions.append({
                "category": "bottom",
                "suggestion": "Another pair of pants in a different style",
                "reason": "More bottom options increase outfit variety",
            })

        # Check for outfit completion
        if ClothingCategory.SHOES not in items_by_category:
            suggestions.append({
                "category": "shoes",
                "suggestion": "A versatile pair of shoes",
                "reason": "Every outfit needs shoes to be complete!",
            })

        return suggestions

    def get_repeat_wear_analysis(self, location_id: int) -> Dict[str, Any]:
        """Analyze how often the same outfit is worn to a specific location."""
        location = self.db.query(Location).filter(Location.id == location_id).first()
        if not location:
            return {"error": "Location not found"}

        logs = self.db.query(OutfitLog).filter(
            OutfitLog.user_id == self.user_id,
            OutfitLog.location_id == location_id
        ).order_by(desc(OutfitLog.date)).all()

        outfit_counts = {}
        for log in logs:
            if log.outfit_id:
                outfit_counts[log.outfit_id] = outfit_counts.get(log.outfit_id, 0) + 1

        # Get outfit details
        repeated_outfits = []
        for outfit_id, count in sorted(outfit_counts.items(), key=lambda x: x[1], reverse=True):
            if count > 1:
                outfit = self.db.query(Outfit).filter(Outfit.id == outfit_id).first()
                if outfit:
                    repeated_outfits.append({
                        "outfit_name": outfit.name,
                        "times_worn_here": count,
                        "last_worn": max(
                            [log.date for log in logs if log.outfit_id == outfit_id]
                        ).isoformat(),
                    })

        return {
            "location": location.name,
            "total_visits": len(logs),
            "unique_outfits": len(outfit_counts),
            "repeated_outfits": repeated_outfits,
            "variety_score": len(outfit_counts) / len(logs) * 10 if logs else 10,
        }
