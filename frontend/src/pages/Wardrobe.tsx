import React, { useEffect, useState, useRef } from 'react';
import {
  Camera,
  Plus,
  Filter,
  Grid,
  List,
  Upload,
  X,
  Shirt,
} from 'lucide-react';
import { ClothingItem, ClothingCategory } from '../types';
import { getClothingItems, uploadClothingItem, uploadWardrobePhoto } from '../api';

const CATEGORIES: { value: ClothingCategory | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'top', label: 'Tops' },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'dress', label: 'Dresses' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessory', label: 'Accessories' },
];

const Wardrobe: React.FC = () => {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wardrobeInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    try {
      const params = selectedCategory ? { category: selectedCategory } : undefined;
      const response = await getClothingItems(params);
      setItems(response.data.items);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedCategory]);

  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadClothingItem(file);
      await fetchItems();
      setShowUploadModal(false);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleWardrobeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadWardrobePhoto(file);
      await fetchItems();
      setShowUploadModal(false);
    } catch (error) {
      console.error('Wardrobe upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const getCategoryCount = (category: string) => {
    if (!category) return items.length;
    return items.filter((item) => item.category === category).length;
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">My Wardrobe</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="p-2 bg-primary-600 text-white rounded-lg"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar">
        {CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setSelectedCategory(value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shirt className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No items yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Add your first clothing item to get started
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            <Camera className="w-4 h-4" />
            Add Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm card-hover"
            >
              <div className="aspect-square bg-gray-100 relative">
                {item.image_path ? (
                  <img
                    src={item.image_path}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Shirt className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {item.primary_color && (
                  <div
                    className="absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: item.primary_color }}
                  />
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    Worn {item.times_worn}x
                  </span>
                  {item.style_score && (
                    <span className="text-xs text-primary-600 font-medium">
                      {item.style_score}/10
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 safe-bottom">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add to Wardrobe</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploading ? (
              <div className="flex flex-col items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500 border-t-transparent mb-4"></div>
                <p className="text-gray-600">Analyzing with AI...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Camera className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Single Item</p>
                    <p className="text-sm text-gray-500">
                      Take a photo of one clothing item
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => wardrobeInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Scan Wardrobe</p>
                    <p className="text-sm text-gray-500">
                      Photo your closet to detect multiple items
                    </p>
                  </div>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleSingleUpload}
              className="hidden"
            />
            <input
              ref={wardrobeInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleWardrobeUpload}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Wardrobe;
