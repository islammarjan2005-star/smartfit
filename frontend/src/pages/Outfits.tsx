import React, { useEffect, useState } from 'react';
import { Plus, Heart, Camera, Layers, X } from 'lucide-react';
import { Outfit, ClothingItem } from '../types';
import {
  getOutfits,
  getClothingItems,
  createOutfit,
  createOutfitFromPhoto,
  toggleFavorite,
} from '../api';

const Outfits: React.FC = () => {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  useEffect(() => {
    fetchOutfits();
  }, [filter]);

  const fetchOutfits = async () => {
    try {
      const params = filter === 'favorites' ? { is_favorite: true } : undefined;
      const response = await getOutfits(params);
      setOutfits(response.data);
    } catch (error) {
      console.error('Failed to fetch outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await getClothingItems();
      setItems(response.data.items);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const handleOpenCreate = () => {
    fetchItems();
    setShowCreateModal(true);
  };

  const handleToggleItem = (itemId: number) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleCreateOutfit = async () => {
    if (selectedItems.length === 0) return;

    try {
      await createOutfit({
        name: outfitName || undefined,
        clothing_item_ids: selectedItems,
      });
      setShowCreateModal(false);
      setSelectedItems([]);
      setOutfitName('');
      fetchOutfits();
    } catch (error) {
      console.error('Failed to create outfit:', error);
    }
  };

  const handleToggleFavorite = async (outfitId: number) => {
    try {
      await toggleFavorite(outfitId);
      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfitId ? { ...o, is_favorite: !o.is_favorite } : o
        )
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">My Outfits</h1>
        <button
          onClick={handleOpenCreate}
          className="p-2 bg-primary-600 text-white rounded-lg"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          All Outfits
        </button>
        <button
          onClick={() => setFilter('favorites')}
          className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 ${
            filter === 'favorites'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          <Heart className="w-4 h-4" />
          Favorites
        </button>
      </div>

      {/* Outfits List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
        </div>
      ) : outfits.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No outfits yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Create outfit combinations from your wardrobe
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Create Outfit
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {outfits.map((outfit) => (
            <div
              key={outfit.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    {outfit.name || 'Unnamed Outfit'}
                  </h3>
                  <button
                    onClick={() => handleToggleFavorite(outfit.id)}
                    className={`p-2 rounded-lg ${
                      outfit.is_favorite
                        ? 'text-red-500 bg-red-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <Heart
                      className="w-5 h-5"
                      fill={outfit.is_favorite ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>

                {/* Outfit Items Preview */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {outfit.items.map((item) => (
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
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          {item.category}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                  <span>Worn {outfit.times_worn}x</span>
                  {outfit.style_score && (
                    <span className="text-primary-600 font-medium">
                      Style: {outfit.style_score}/10
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Outfit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full max-h-[80vh] bg-white rounded-t-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Create Outfit</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <input
                type="text"
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder="Outfit name (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4"
              />

              <p className="text-sm text-gray-600 mb-3">
                Select items for your outfit:
              </p>

              <div className="grid grid-cols-3 gap-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedItems.includes(item.id)
                        ? 'border-primary-500'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="w-full h-full bg-gray-100 relative">
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
                      {selectedItems.includes(item.id) && (
                        <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                          <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            ✓
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t safe-bottom">
              <button
                onClick={handleCreateOutfit}
                disabled={selectedItems.length === 0}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                Create Outfit ({selectedItems.length} items)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Outfits;
