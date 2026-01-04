export interface User {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
  is_active: boolean;
}

export interface ClothingItem {
  id: number;
  name: string;
  description: string | null;
  category: ClothingCategory;
  subcategory: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  pattern: string | null;
  brand: string | null;
  size: string | null;
  material: string | null;
  occasion_tags: string[];
  season_tags: string[];
  image_path: string | null;
  thumbnail_path: string | null;
  ai_description: string | null;
  style_score: number | null;
  times_worn: number;
  last_worn: string | null;
  created_at: string;
}

export type ClothingCategory =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outerwear'
  | 'shoes'
  | 'accessory'
  | 'underwear'
  | 'swimwear'
  | 'sleepwear'
  | 'activewear';

export interface Outfit {
  id: number;
  name: string | null;
  description: string | null;
  occasion_tags: string[];
  season_tags: string[];
  image_path: string | null;
  style_score: number | null;
  ai_feedback: string | null;
  is_favorite: boolean;
  times_worn: number;
  last_worn: string | null;
  created_at: string;
  items: ClothingItem[];
}

export interface Location {
  id: number;
  name: string;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  dress_code: string | null;
  visit_count: number;
  created_at: string;
}

export interface OutfitLog {
  id: number;
  outfit_id: number | null;
  location_id: number | null;
  date: string;
  quick_photo_path: string | null;
  occasion: string | null;
  weather: string | null;
  notes: string | null;
  comfort_rating: number | null;
  style_rating: number | null;
  detected_location: string | null;
  created_at: string;
  location: Location | null;
}

export interface OutfitSuggestion {
  items: ClothingItem[];
  score: number;
  reason: string;
  weather_appropriate: boolean;
}

export interface WardrobeInsights {
  total_items: number;
  by_category: Record<string, number>;
  color_distribution: Record<string, number>;
  most_worn: ClothingItem[];
  least_worn: ClothingItem[];
  never_worn: ClothingItem[];
  suggestions: string[];
}
