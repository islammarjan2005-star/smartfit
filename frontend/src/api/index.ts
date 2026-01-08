import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', new URLSearchParams({ username: email, password }));

export const register = (email: string, password: string, full_name?: string) =>
  api.post('/auth/register', { email, password, full_name });

export const getCurrentUser = () => api.get('/auth/me');

// Clothing
export const getClothingItems = (params?: {
  category?: string;
  color?: string;
  occasion?: string;
}) => api.get('/clothing', { params });

export const getClothingItem = (id: number) => api.get(`/clothing/${id}`);

export const createClothingItem = (data: any) => api.post('/clothing', data);

export const uploadClothingItem = (file: File, name?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);
  return api.post('/clothing/upload', formData);
};

export const uploadWardrobePhoto = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/clothing/upload-wardrobe', formData);
};

export const updateClothingItem = (id: number, data: any) =>
  api.put(`/clothing/${id}`, data);

export const deleteClothingItem = (id: number) => api.delete(`/clothing/${id}`);

// Outfits
export const getOutfits = (params?: { is_favorite?: boolean; occasion?: string }) =>
  api.get('/outfits', { params });

export const getOutfit = (id: number) => api.get(`/outfits/${id}`);

export const createOutfit = (data: {
  name?: string;
  clothing_item_ids: number[];
  occasion_tags?: string[];
}) => api.post('/outfits', data);

export const createOutfitFromPhoto = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/outfits/from-photo', formData);
};

export const updateOutfit = (id: number, data: any) => api.put(`/outfits/${id}`, data);

export const deleteOutfit = (id: number) => api.delete(`/outfits/${id}`);

export const toggleFavorite = (id: number) => api.post(`/outfits/${id}/favorite`);

// Outfit Logs
export const getOutfitLogs = (params?: {
  start_date?: string;
  end_date?: string;
  location_id?: number;
}) => api.get('/logs', { params });

export const createOutfitLog = (data: {
  outfit_id?: number;
  location_id?: number;
  occasion?: string;
  weather?: string;
  notes?: string;
}) => api.post('/logs', data);

export const quickLogWithPhoto = (
  file: File,
  location_id?: number,
  occasion?: string,
  notes?: string
) => {
  const formData = new FormData();
  formData.append('file', file);
  if (location_id) formData.append('location_id', location_id.toString());
  if (occasion) formData.append('occasion', occasion);
  if (notes) formData.append('notes', notes);
  return api.post('/logs/quick', formData);
};

export const getCalendarView = (year: number, month: number) =>
  api.get(`/logs/calendar?year=${year}&month=${month}`);

export const getOutfitStats = (days?: number) =>
  api.get('/logs/stats', { params: { days } });

// Locations
export const getLocations = () => api.get('/locations');

export const createLocation = (data: {
  name: string;
  category?: string;
  address?: string;
  dress_code?: string;
}) => api.post('/locations', data);

export const getLocationHistory = (id: number) => api.get(`/locations/${id}/history`);

export const getRepeatAnalysis = (id: number) =>
  api.get(`/locations/${id}/repeat-analysis`);

// Suggestions
export const getSuggestions = (data: {
  occasion?: string;
  location_id?: number;
  weather?: string;
}) => api.post('/suggestions', data);

export const getSuggestionsForLocation = (locationId: number) =>
  api.get(`/suggestions/for-location/${locationId}`);

export const getWardrobeInsights = () => api.get('/suggestions/wardrobe-insights');

export const getPurchaseSuggestions = () => api.get('/suggestions/purchase-suggestions');

export const getNewCombinations = () => api.get('/suggestions/new-combinations');

export const getWeatherSuggestions = (weather: string) =>
  api.get(`/suggestions/weather/${weather}`);

// Video Insights
export const analyzeVideoUrl = (url: string, creatorMode: boolean = false) =>
  api.post('/video-insights/analyze-url', { url, creator_mode: creatorMode }, { timeout: 180000 });

export const analyzeVideoUpload = (file: File, creatorMode: boolean = false) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('creator_mode', creatorMode.toString());
  return api.post('/video-insights/analyze-upload', formData, { timeout: 180000 });
};

export const saveVideoInsight = (data: {
  source_url?: string;
  source_platform?: string;
  title?: string;
  summary: string;
  steps: string[];
  core_insight: string;
  content_inspiration: string;
  hooks: string[];
  creator_mode_enabled?: boolean;
  hook_analysis?: string;
  pacing_analysis?: string;
  format_analysis?: string;
  remix_ideas?: string;
  transcript?: string;
}) => api.post('/video-insights/save', data);

export const getSavedInsights = (skip?: number, limit?: number) =>
  api.get('/video-insights/saved', { params: { skip, limit } });

export const getSavedInsight = (id: number) =>
  api.get(`/video-insights/saved/${id}`);

export const deleteSavedInsight = (id: number) =>
  api.delete(`/video-insights/saved/${id}`);

export default api;
