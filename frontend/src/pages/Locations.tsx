import React, { useEffect, useState } from 'react';
import { Plus, MapPin, X, ChevronRight, BarChart2 } from 'lucide-react';
import { Location } from '../types';
import { getLocations, createLocation, getLocationHistory, getRepeatAnalysis } from '../api';

const CATEGORIES = ['Work', 'Social', 'Fitness', 'Dining', 'Shopping', 'Family', 'Other'];
const DRESS_CODES = ['Casual', 'Business', 'Formal', 'Athletic', 'Smart Casual'];

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationHistory, setLocationHistory] = useState<any>(null);
  const [repeatAnalysis, setRepeatAnalysis] = useState<any>(null);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDressCode, setNewDressCode] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await getLocations();
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newName.trim()) return;

    try {
      await createLocation({
        name: newName,
        category: newCategory || undefined,
        dress_code: newDressCode || undefined,
        address: newAddress || undefined,
      });
      setShowAddModal(false);
      setNewName('');
      setNewCategory('');
      setNewDressCode('');
      setNewAddress('');
      fetchLocations();
    } catch (error) {
      console.error('Failed to add location:', error);
    }
  };

  const handleViewHistory = async (location: Location) => {
    setSelectedLocation(location);
    setShowHistoryModal(true);

    try {
      const [historyRes, analysisRes] = await Promise.all([
        getLocationHistory(location.id),
        getRepeatAnalysis(location.id),
      ]);
      setLocationHistory(historyRes.data);
      setRepeatAnalysis(analysisRes.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">My Locations</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-2 bg-primary-600 text-white rounded-lg"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-6">
        Save places you visit to track outfit history and get better suggestions.
      </p>

      {/* Locations List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No locations yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Add places you frequently visit
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => (
            <button
              key={location.id}
              onClick={() => handleViewHistory(location)}
              className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">{location.name}</h3>
                  <p className="text-sm text-gray-500">
                    {location.category && `${location.category} • `}
                    {location.visit_count} visits
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      )}

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 safe-bottom">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Location</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Office, Gym, Mom's House"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewCategory(newCategory === cat ? '' : cat)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        newCategory === cat
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dress Code
                </label>
                <div className="flex flex-wrap gap-2">
                  {DRESS_CODES.map((code) => (
                    <button
                      key={code}
                      onClick={() => setNewDressCode(newDressCode === code ? '' : code)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        newDressCode === code
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address (optional)
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>

              <button
                onClick={handleAddLocation}
                disabled={!newName.trim()}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                Add Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedLocation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full max-h-[80vh] bg-white rounded-t-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">{selectedLocation.name}</h2>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setLocationHistory(null);
                  setRepeatAnalysis(null);
                }}
                className="p-2 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {!locationHistory ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-primary-600">
                        {locationHistory.total_visits}
                      </p>
                      <p className="text-sm text-gray-500">Total Visits</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-cyan-600">
                        {repeatAnalysis?.unique_outfits || 0}
                      </p>
                      <p className="text-sm text-gray-500">Unique Outfits</p>
                    </div>
                  </div>

                  {/* Variety Score */}
                  {repeatAnalysis && (
                    <div className="bg-primary-50 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart2 className="w-5 h-5 text-primary-600" />
                        <span className="font-medium text-gray-900">
                          Variety Score
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${repeatAnalysis.variety_score * 10}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {repeatAnalysis.variety_score >= 7
                          ? "Great variety! You're mixing it up well."
                          : repeatAnalysis.variety_score >= 4
                          ? 'Good variety, but room for more combinations.'
                          : 'Consider trying new outfits for this location!'}
                      </p>
                    </div>
                  )}

                  {/* Repeated Outfits */}
                  {repeatAnalysis?.repeated_outfits?.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-900 mb-3">
                        Frequently Worn Here
                      </h3>
                      <div className="space-y-2">
                        {repeatAnalysis.repeated_outfits.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                          >
                            <span className="text-sm text-gray-700">
                              {item.outfit_name || 'Unnamed Outfit'}
                            </span>
                            <span className="text-sm text-primary-600 font-medium">
                              {item.times_worn_here}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Visits */}
                  {locationHistory.recent_visits?.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        Recent Visits
                      </h3>
                      <div className="space-y-2">
                        {locationHistory.recent_visits.map((visit: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-600">
                              {new Date(visit.date).toLocaleDateString()}
                            </span>
                            <span className="text-gray-500">{visit.occasion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Locations;
