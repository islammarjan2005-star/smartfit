import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Sparkles,
  Shirt,
  TrendingUp,
  MapPin,
  Sun,
  Cloud,
  Settings,
  LogOut,
  Video,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getWardrobeInsights, getOutfitStats } from '../api';

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const [insights, setInsights] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getWardrobeInsights().catch(() => null),
      getOutfitStats(7).catch(() => null),
    ]).then(([insightsRes, statsRes]) => {
      if (insightsRes) setInsights(insightsRes.data);
      if (statsRes) setStats(statsRes.data);
      setLoading(false);
    });
  }, []);

  const quickActions = [
    {
      icon: Video,
      label: 'Video Insights',
      description: 'Extract value from any video',
      to: '/video-insights',
      color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    },
    {
      icon: Sparkles,
      label: 'Get Suggestions',
      description: 'AI outfit recommendations',
      to: '/suggestions',
      color: 'bg-cyan-500',
    },
    {
      icon: Shirt,
      label: 'Add Clothes',
      description: 'Scan your wardrobe',
      to: '/wardrobe',
      color: 'bg-emerald-500',
    },
    {
      icon: Camera,
      label: 'Log Outfit',
      description: 'Record what you wore today',
      to: '/log',
      color: 'bg-primary-500',
    },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {user?.full_name || 'there'}!
          </h1>
          <p className="text-gray-500">What are you wearing today?</p>
        </div>
        <button
          onClick={logout}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quickActions.map(({ icon: Icon, label, description, to, color }) => (
          <Link
            key={to}
            to={to}
            className="bg-white rounded-xl p-4 shadow-sm card-hover"
          >
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </Link>
        ))}
      </div>

      {/* Stats Overview */}
      {!loading && (insights || stats) && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            Your Stats
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-600">
                {insights?.total_items || 0}
              </p>
              <p className="text-xs text-gray-500">Items</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-600">
                {stats?.total_logs || 0}
              </p>
              <p className="text-xs text-gray-500">Logged this week</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {insights?.never_worn?.length || 0}
              </p>
              <p className="text-xs text-gray-500">Unworn items</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions Preview */}
      {insights?.suggestions?.length > 0 && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Insights
          </h2>
          <ul className="space-y-2">
            {insights.suggestions.slice(0, 3).map((suggestion: string, i: number) => (
              <li key={i} className="text-sm text-primary-100 flex items-start gap-2">
                <span className="text-primary-200">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
          <Link
            to="/suggestions"
            className="mt-3 inline-block text-sm font-medium underline"
          >
            View all suggestions →
          </Link>
        </div>
      )}

      {/* Empty State */}
      {!loading && !insights?.total_items && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shirt className="w-10 h-10 text-primary-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Start Building Your Wardrobe
          </h3>
          <p className="text-gray-500 mb-4">
            Take a photo of your closet or add items one by one
          </p>
          <Link
            to="/wardrobe"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium"
          >
            <Camera className="w-5 h-5" />
            Add Your First Item
          </Link>
        </div>
      )}
    </div>
  );
};

export default Home;
