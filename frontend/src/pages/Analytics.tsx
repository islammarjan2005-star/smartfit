import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Shirt,
  Calendar,
  Award,
  AlertCircle,
} from 'lucide-react';
import { getWardrobeInsights, getOutfitStats } from '../api';

const Analytics: React.FC = () => {
  const [insights, setInsights] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [insightsRes, statsRes] = await Promise.all([
        getWardrobeInsights(),
        getOutfitStats(period),
      ]);
      setInsights(insightsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h1>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            onClick={() => setPeriod(days)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              period === days
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {days} days
          </button>
        ))}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Shirt className="w-5 h-5 text-primary-500" />
            <span className="text-sm text-gray-600">Total Items</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {insights?.total_items || 0}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-cyan-500" />
            <span className="text-sm text-gray-600">Logs ({period}d)</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats?.total_logs || 0}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span className="text-sm text-gray-600">Unique Outfits</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats?.unique_outfits || 0}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-gray-600">Avg/Day</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats?.avg_logs_per_day || 0}
          </p>
        </div>
      </div>

      {/* Category Distribution */}
      {insights?.by_category && Object.keys(insights.by_category).length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Wardrobe Breakdown
          </h2>
          <div className="space-y-3">
            {Object.entries(insights.by_category)
              .sort((a: any, b: any) => b[1] - a[1])
              .map(([category, count]: [string, any]) => {
                const percentage = Math.round(
                  (count / insights.total_items) * 100
                );
                return (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-700">{category}</span>
                      <span className="text-gray-500">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Color Distribution */}
      {insights?.color_distribution &&
        Object.keys(insights.color_distribution).length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Color Palette</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(insights.color_distribution)
                .slice(0, 10)
                .map(([color, count]: [string, any]) => (
                  <div
                    key={color}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm capitalize">{color}</span>
                    <span className="text-xs text-gray-500">({count})</span>
                  </div>
                ))}
            </div>
          </div>
        )}

      {/* Most Worn Items */}
      {insights?.most_worn?.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Most Worn Items
          </h2>
          <div className="space-y-3">
            {insights.most_worn.slice(0, 5).map((item: any, index: number) => (
              <div
                key={item.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {item.times_worn}x worn
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Never Worn Items */}
      {insights?.never_worn?.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Never Worn ({insights.never_worn.length} items)
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            These items are waiting to be worn!
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {insights.never_worn.slice(0, 6).map((item: any) => (
              <div
                key={item.id}
                className="w-16 h-16 bg-white rounded-lg flex-shrink-0 flex items-center justify-center text-xs text-gray-400 border"
              >
                {item.name?.slice(0, 10)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {insights?.suggestions?.length > 0 && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white">
          <h2 className="font-semibold mb-3">AI Recommendations</h2>
          <ul className="space-y-2">
            {insights.suggestions.map((suggestion: string, index: number) => (
              <li
                key={index}
                className="text-sm text-primary-100 flex items-start gap-2"
              >
                <span className="text-primary-200">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Analytics;
