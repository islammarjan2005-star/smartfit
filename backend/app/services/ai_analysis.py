import base64
import json
from typing import Optional, List, Dict, Any
from pathlib import Path
import httpx

from app.config import settings
from app.models.clothing import ClothingCategory, ClothingColor


class AIAnalysisService:
    """Service for AI-powered clothing analysis using OpenAI Vision API."""

    CATEGORY_MAPPING = {
        "shirt": ClothingCategory.TOP,
        "t-shirt": ClothingCategory.TOP,
        "blouse": ClothingCategory.TOP,
        "sweater": ClothingCategory.TOP,
        "hoodie": ClothingCategory.TOP,
        "tank top": ClothingCategory.TOP,
        "polo": ClothingCategory.TOP,
        "jeans": ClothingCategory.BOTTOM,
        "pants": ClothingCategory.BOTTOM,
        "shorts": ClothingCategory.BOTTOM,
        "skirt": ClothingCategory.BOTTOM,
        "trousers": ClothingCategory.BOTTOM,
        "dress": ClothingCategory.DRESS,
        "jumpsuit": ClothingCategory.DRESS,
        "romper": ClothingCategory.DRESS,
        "jacket": ClothingCategory.OUTERWEAR,
        "coat": ClothingCategory.OUTERWEAR,
        "blazer": ClothingCategory.OUTERWEAR,
        "cardigan": ClothingCategory.OUTERWEAR,
        "vest": ClothingCategory.OUTERWEAR,
        "sneakers": ClothingCategory.SHOES,
        "boots": ClothingCategory.SHOES,
        "heels": ClothingCategory.SHOES,
        "sandals": ClothingCategory.SHOES,
        "loafers": ClothingCategory.SHOES,
        "flats": ClothingCategory.SHOES,
        "hat": ClothingCategory.ACCESSORY,
        "scarf": ClothingCategory.ACCESSORY,
        "belt": ClothingCategory.ACCESSORY,
        "bag": ClothingCategory.ACCESSORY,
        "jewelry": ClothingCategory.ACCESSORY,
        "watch": ClothingCategory.ACCESSORY,
        "sunglasses": ClothingCategory.ACCESSORY,
    }

    @staticmethod
    def encode_image(image_path: str) -> str:
        """Encode image to base64 for API."""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")

    @classmethod
    async def analyze_clothing_image(cls, image_path: str) -> Dict[str, Any]:
        """
        Analyze a clothing item image using AI vision.
        Returns detected attributes like category, color, pattern, etc.
        """
        if not settings.OPENAI_API_KEY:
            # Return mock analysis if no API key
            return cls._mock_analysis()

        try:
            base64_image = cls.encode_image(image_path)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": """Analyze this clothing item image and provide details in JSON format:
{
    "item_type": "specific type (e.g., t-shirt, jeans, sneakers)",
    "category": "one of: top, bottom, dress, outerwear, shoes, accessory",
    "primary_color": "main color",
    "secondary_color": "second most prominent color or null",
    "pattern": "solid, striped, plaid, floral, graphic, etc.",
    "material": "estimated material (cotton, denim, leather, etc.)",
    "style": "casual, formal, athletic, etc.",
    "occasions": ["list of suitable occasions"],
    "seasons": ["suitable seasons"],
    "description": "brief description of the item",
    "style_score": 1-10 versatility rating
}"""
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/jpeg;base64,{base64_image}"
                                        }
                                    }
                                ]
                            }
                        ],
                        "max_tokens": 500,
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]
                    # Parse JSON from response
                    json_str = content
                    if "```json" in content:
                        json_str = content.split("```json")[1].split("```")[0]
                    elif "```" in content:
                        json_str = content.split("```")[1].split("```")[0]
                    return json.loads(json_str.strip())
                else:
                    return cls._mock_analysis()

        except Exception as e:
            print(f"AI analysis error: {e}")
            return cls._mock_analysis()

    @classmethod
    async def analyze_outfit_image(cls, image_path: str) -> Dict[str, Any]:
        """
        Analyze a full outfit photo to identify all clothing items.
        Used for quick outfit logging via photo.
        """
        if not settings.OPENAI_API_KEY:
            return cls._mock_outfit_analysis()

        try:
            base64_image = cls.encode_image(image_path)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": """Analyze this outfit photo and identify all visible clothing items. Return JSON:
{
    "items": [
        {
            "type": "item type",
            "category": "top/bottom/dress/outerwear/shoes/accessory",
            "color": "main color",
            "description": "brief description"
        }
    ],
    "overall_style": "casual/formal/athletic/etc.",
    "occasion_suitable": ["list of suitable occasions"],
    "style_rating": 1-10,
    "feedback": "brief style feedback and suggestions"
}"""
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/jpeg;base64,{base64_image}"
                                        }
                                    }
                                ]
                            }
                        ],
                        "max_tokens": 800,
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]
                    json_str = content
                    if "```json" in content:
                        json_str = content.split("```json")[1].split("```")[0]
                    elif "```" in content:
                        json_str = content.split("```")[1].split("```")[0]
                    return json.loads(json_str.strip())
                else:
                    return cls._mock_outfit_analysis()

        except Exception as e:
            print(f"Outfit analysis error: {e}")
            return cls._mock_outfit_analysis()

    @classmethod
    async def analyze_wardrobe_image(cls, image_path: str) -> List[Dict[str, Any]]:
        """
        Analyze a wardrobe/closet photo to identify multiple clothing items.
        Returns a list of detected items.
        """
        if not settings.OPENAI_API_KEY:
            return cls._mock_wardrobe_analysis()

        try:
            base64_image = cls.encode_image(image_path)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": """Analyze this wardrobe/closet image and identify all visible clothing items. Return JSON array:
[
    {
        "item_type": "specific type",
        "category": "top/bottom/dress/outerwear/shoes/accessory",
        "primary_color": "main color",
        "pattern": "solid/striped/etc.",
        "description": "brief description",
        "occasions": ["suitable occasions"],
        "seasons": ["suitable seasons"]
    }
]
Identify as many distinct items as you can see clearly."""
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/jpeg;base64,{base64_image}"
                                        }
                                    }
                                ]
                            }
                        ],
                        "max_tokens": 2000,
                    },
                    timeout=60.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]
                    json_str = content
                    if "```json" in content:
                        json_str = content.split("```json")[1].split("```")[0]
                    elif "```" in content:
                        json_str = content.split("```")[1].split("```")[0]
                    return json.loads(json_str.strip())
                else:
                    return cls._mock_wardrobe_analysis()

        except Exception as e:
            print(f"Wardrobe analysis error: {e}")
            return cls._mock_wardrobe_analysis()

    @staticmethod
    def _mock_analysis() -> Dict[str, Any]:
        """Return mock analysis for testing without API."""
        return {
            "item_type": "t-shirt",
            "category": "top",
            "primary_color": "blue",
            "secondary_color": None,
            "pattern": "solid",
            "material": "cotton",
            "style": "casual",
            "occasions": ["casual", "everyday"],
            "seasons": ["spring", "summer"],
            "description": "A casual blue t-shirt",
            "style_score": 7,
        }

    @staticmethod
    def _mock_outfit_analysis() -> Dict[str, Any]:
        """Return mock outfit analysis for testing."""
        return {
            "items": [
                {"type": "t-shirt", "category": "top", "color": "white", "description": "White crew neck t-shirt"},
                {"type": "jeans", "category": "bottom", "color": "blue", "description": "Blue denim jeans"},
                {"type": "sneakers", "category": "shoes", "color": "white", "description": "White casual sneakers"},
            ],
            "overall_style": "casual",
            "occasion_suitable": ["casual", "everyday", "weekend"],
            "style_rating": 7,
            "feedback": "Classic casual look. Consider adding a light jacket or accessories for more visual interest.",
        }

    @staticmethod
    def _mock_wardrobe_analysis() -> List[Dict[str, Any]]:
        """Return mock wardrobe analysis for testing."""
        return [
            {
                "item_type": "button-down shirt",
                "category": "top",
                "primary_color": "white",
                "pattern": "solid",
                "description": "White button-down dress shirt",
                "occasions": ["work", "formal"],
                "seasons": ["all"],
            },
            {
                "item_type": "t-shirt",
                "category": "top",
                "primary_color": "black",
                "pattern": "solid",
                "description": "Black crew neck t-shirt",
                "occasions": ["casual", "everyday"],
                "seasons": ["all"],
            },
            {
                "item_type": "jeans",
                "category": "bottom",
                "primary_color": "blue",
                "pattern": "solid",
                "description": "Classic blue denim jeans",
                "occasions": ["casual", "everyday"],
                "seasons": ["all"],
            },
        ]
