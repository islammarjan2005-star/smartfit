import React, { useEffect, useState, useRef } from 'react';
import { Camera, MapPin, Cloud, Check, X, Layers } from 'lucide-react';
import { Outfit, Location } from '../types';
import { getOutfits, getLocations, createOutfitLog, quickLogWithPhoto } from '../api';

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Cold', 'Hot', 'Windy'];
const OCCASION_OPTIONS = ['Work', 'Casual', 'Date', 'Party', 'Gym', 'Shopping', 'Meeting'];

const LogOutfit: React.FC = () => {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [logMode, setLogMode] = useState<'select' | 'photo'>('select');
  const [selectedOutfit, setSelectedOutfit] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedWeather, setSelectedWeather] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [notes, setNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getOutfits(), getLocations()]).then(([outfitsRes, locationsRes]) => {
      setOutfits(outfitsRes.data);
      setLocations(locationsRes.data);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async () => {
    if (!selectedOutfit) return;

    setSubmitting(true);
    try {
      await createOutfitLog({
        outfit_id: selectedOutfit,
        location_id: selectedLocation || undefined,
        weather: selectedWeather || undefined,
        occasion: selectedOccasion || undefined,
        notes: notes || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedOutfit(null);
        setSelectedLocation(null);
        setSelectedWeather('');
        setSelectedOccasion('');
        setNotes('');
      }, 2000);
    } catch (error) {
      console.error('Failed to log outfit:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoLog = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitting(true);
    try {
      await quickLogWithPhoto(
        file,
        selectedLocation || undefined,
        selectedOccasion || undefined,
        notes || undefined
      );
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to log outfit:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Outfit Logged!</h2>
        <p className="text-gray-500">Your outfit has been recorded</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Log Today's Outfit</h1>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setLogMode('select')}
          className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
            logMode === 'select'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          <Layers className="w-5 h-5" />
          Select Outfit
        </button>
        <button
          onClick={() => setLogMode('photo')}
          className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
            logMode === 'photo'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          <Camera className="w-5 h-5" />
          Take Photo
        </button>
      </div>

      {logMode === 'select' ? (
        <>
          {/* Outfit Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are you wearing?
            </label>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
              </div>
            ) : outfits.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                No saved outfits yet. Create one first or use photo mode.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {outfits.map((outfit) => (
                  <button
                    key={outfit.id}
                    onClick={() => setSelectedOutfit(outfit.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedOutfit === outfit.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-sm truncate">
                      {outfit.name || 'Unnamed'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {outfit.items.length} items
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mb-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
            className="w-full aspect-video bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
                <span className="text-gray-500">Analyzing...</span>
              </>
            ) : (
              <>
                <Camera className="w-10 h-10 text-gray-400" />
                <span className="text-gray-500">Tap to take a photo</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoLog}
            className="hidden"
          />
        </div>
      )}

      {/* Location */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Where are you going?
        </label>
        <div className="flex flex-wrap gap-2">
          {locations.map((location) => (
            <button
              key={location.id}
              onClick={() =>
                setSelectedLocation(
                  selectedLocation === location.id ? null : location.id
                )
              }
              className={`px-3 py-2 rounded-lg text-sm ${
                selectedLocation === location.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {location.name}
            </button>
          ))}
        </div>
      </div>

      {/* Occasion */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Occasion
        </label>
        <div className="flex flex-wrap gap-2">
          {OCCASION_OPTIONS.map((occasion) => (
            <button
              key={occasion}
              onClick={() =>
                setSelectedOccasion(selectedOccasion === occasion ? '' : occasion)
              }
              className={`px-3 py-2 rounded-lg text-sm ${
                selectedOccasion === occasion
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {occasion}
            </button>
          ))}
        </div>
      </div>

      {/* Weather */}
      <div className="mb-6">
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
              className={`px-3 py-2 rounded-lg text-sm ${
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

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did you feel in this outfit?"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
          rows={2}
        />
      </div>

      {/* Submit Button */}
      {logMode === 'select' && (
        <button
          onClick={handleSubmit}
          disabled={!selectedOutfit || submitting}
          className="w-full py-4 bg-primary-600 text-white rounded-xl font-medium disabled:opacity-50"
        >
          {submitting ? 'Logging...' : 'Log Outfit'}
        </button>
      )}
    </div>
  );
};

export default LogOutfit;
