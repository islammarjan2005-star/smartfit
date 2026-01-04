import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  MapPin,
  Cloud,
  ShoppingBag,
  Shuffle,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { Location, OutfitSuggestion } from '../types';
import {
  getSuggestions,
  getLocations,
  getPurchaseSuggestions,
  getNewCombinations,
} from '../api';

const OCCASIONS = ['Work', 'Casual', 'Date', 'Party', 'Gym', 'Meeting', 'Travel'];
const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Cold', 'Hot'];

const Suggestions: React.FC = () => {
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [purchaseSuggestions, setPurchaseSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedWeather, setSelectedWeather] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    getLocations().then((res) => setLocations(res.data));
    fetchSuggestions();
    fetchPurchaseSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await getSuggestions({
        occasion: selectedOccasion || undefined,
        location_id: selectedLocation || undefined,
        weather: selectedWeather || undefined,
      });
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseSuggestions = async () => {
    try {
      const response = await getPurchaseSuggestions();
      setPurchaseSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch purchase suggestions:', error);
    }
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    fetchSuggestions();
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">For You</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm"
        >
          Filters
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              showFilters ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Occasion
            </label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((occ) => (
                <button
                  key={occ}
                  onClick={() =>
                    setSelectedOccasion(selectedOccasion === occ ? '' : occ)
                  }
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedOccasion === occ
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </label>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() =>
                    setSelectedLocation(
                      selectedLocation === loc.id ? null : loc.id
                    )
                  }
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedLocation === loc.id
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Cloud className="w-4 h-4 inline mr-1" />
              Weather
            </label>
            <div className="flex flex-wrap gap-2">
              {WEATHER_OPTIONS.map((weather) => (
                <button
                  key={weather}
                  onClick={() =>
                    setSelectedWeather(selectedWeather === weather ? '' : weather)
                  }
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedWeather === weather
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {weather}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleApplyFilters}
            className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium"
          >
            Apply Filters
          </button>
        </div>
      )}

      {/* Outfit Suggestions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" />
            Outfit Ideas
          </h2>
          <button
            onClick={fetchSuggestions}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <Shuffle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              Add more items to your wardrobe to get personalized suggestions!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                {/* Items preview */}
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {suggestion.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden"
                    >
                      {item.image_path ? (
                        <img
                          src={item.image_path}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                          {item.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reason */}
                <p className="text-sm text-gray-600 mb-2">{suggestion.reason}</p>

                {/* Score and weather */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary-600 font-medium">
                    Match: {Math.round(suggestion.score * 10)}%
                  </span>
                  {suggestion.weather_appropriate && (
                    <span className="text-green-600 flex items-center gap-1">
                      <Cloud className="w-4 h-4" />
                      Weather OK
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Suggestions */}
      {purchaseSuggestions.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <ShoppingBag className="w-5 h-5 text-emerald-500" />
            Shopping Ideas
          </h2>
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-sm text-emerald-700 mb-3">
              Based on gaps in your wardrobe:
            </p>
            <ul className="space-y-2">
              {purchaseSuggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="text-emerald-500 mt-1">•</span>
                  <div>
                    <p className="font-medium">{suggestion.suggestion}</p>
                    <p className="text-gray-500 text-xs">{suggestion.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suggestions;
