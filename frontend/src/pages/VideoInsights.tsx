import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Link2,
  Upload,
  Loader2,
  Sparkles,
  Lightbulb,
  ListOrdered,
  Target,
  Palette,
  Hash,
  Save,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  Timer,
  Shuffle,
  BookmarkPlus,
  History,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  analyzeVideoUrl,
  analyzeVideoUpload,
  saveVideoInsight,
  getSavedInsights,
  deleteSavedInsight,
} from '../api';
import { VideoInsightResponse, SavedVideoInsight } from '../types';

type TabType = 'extract' | 'saved';

const VideoInsights: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('extract');
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [creatorMode, setCreatorMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [result, setResult] = useState<VideoInsightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    steps: true,
    insight: true,
    inspiration: true,
    hooks: true,
    creator: false,
  });
  const [savedInsights, setSavedInsights] = useState<SavedVideoInsight[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [selectedSaved, setSelectedSaved] = useState<SavedVideoInsight | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved insights
  useEffect(() => {
    if (activeTab === 'saved') {
      loadSavedInsights();
    }
  }, [activeTab]);

  const loadSavedInsights = async () => {
    setLoadingSaved(true);
    try {
      const response = await getSavedInsights(0, 50);
      setSavedInsights(response.data.items);
    } catch (err) {
      console.error('Failed to load saved insights:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  // Loading phases for animation
  const loadingPhases = [
    'Fetching video...',
    'Extracting audio...',
    'Transcribing content...',
    'Analyzing insights...',
    'Generating hooks...',
  ];

  useEffect(() => {
    if (loading) {
      let phase = 0;
      setLoadingPhase(loadingPhases[0]);
      const interval = setInterval(() => {
        phase = (phase + 1) % loadingPhases.length;
        setLoadingPhase(loadingPhases[phase]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);
    setSaved(false);

    if (inputMode === 'url' && !url.trim()) {
      setError('Please enter a video URL');
      return;
    }

    if (inputMode === 'upload' && !file) {
      setError('Please select a video file');
      return;
    }

    setLoading(true);

    try {
      let response;
      if (inputMode === 'url') {
        response = await analyzeVideoUrl(url.trim(), creatorMode);
      } else {
        response = await analyzeVideoUpload(file!, creatorMode);
      }
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to analyze video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    try {
      await saveVideoInsight({
        source_url: result.source_url,
        source_platform: result.source_platform,
        title: result.title,
        summary: result.summary,
        steps: result.steps,
        core_insight: result.core_insight,
        content_inspiration: result.content_inspiration,
        hooks: result.hooks,
        creator_mode_enabled: result.creator_mode_enabled,
        hook_analysis: result.hook_analysis,
        pacing_analysis: result.pacing_analysis,
        format_analysis: result.format_analysis,
        remix_ideas: result.remix_ideas,
        transcript: result.transcript,
      });
      setSaved(true);
    } catch (err) {
      setError('Failed to save insight');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSavedInsight(id);
      setSavedInsights((prev) => prev.filter((i) => i.id !== id));
      if (selectedSaved?.id === id) {
        setSelectedSaved(null);
      }
    } catch (err) {
      console.error('Failed to delete insight:', err);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'tiktok':
        return '🎵';
      case 'reels':
        return '📸';
      case 'shorts':
        return '🎬';
      default:
        return '📹';
    }
  };

  const getPlatformColor = (platform?: string) => {
    switch (platform) {
      case 'tiktok':
        return 'from-pink-500 to-cyan-500';
      case 'reels':
        return 'from-purple-500 to-pink-500';
      case 'shorts':
        return 'from-red-500 to-orange-500';
      default:
        return 'from-primary-500 to-cyan-500';
    }
  };

  const renderResultSection = (
    title: string,
    icon: React.ReactNode,
    content: React.ReactNode,
    sectionKey: string,
    copyText?: string
  ) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white">
            {icon}
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {copyText && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(copyText, sectionKey);
              }}
              className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
            >
              {copiedField === sectionKey ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
          {expandedSections[sectionKey] ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {expandedSections[sectionKey] && (
        <div className="px-4 pb-4 pt-0">{content}</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 via-purple-600 to-cyan-600 text-white p-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Video Insights</h1>
            <p className="text-white/80 text-sm">Extract value from any short video</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('extract')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'extract'
                ? 'bg-white text-primary-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Sparkles className="w-4 h-4 inline-block mr-2" />
            Extract
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'saved'
                ? 'bg-white text-primary-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <History className="w-4 h-4 inline-block mr-2" />
            Saved
          </button>
        </div>
      </div>

      <div className="p-4 -mt-4">
        {activeTab === 'extract' ? (
          <>
            {/* Input Card */}
            <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
              {/* Input Mode Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setInputMode('url')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    inputMode === 'url'
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  Paste Link
                </button>
                <button
                  onClick={() => setInputMode('upload')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    inputMode === 'upload'
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>

              {/* URL Input */}
              {inputMode === 'url' && (
                <div className="relative">
                  <input
                    type="url"
                    placeholder="Paste TikTok, Reels, or Shorts URL..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                    <span className="text-lg" title="TikTok">🎵</span>
                    <span className="text-lg" title="Reels">📸</span>
                    <span className="text-lg" title="Shorts">🎬</span>
                  </div>
                </div>
              )}

              {/* File Upload */}
              {inputMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    file
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mb-3">
                        <Video className="w-7 h-7 text-primary-600" />
                      </div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                        <Upload className="w-7 h-7 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-700">Drop video or tap to browse</p>
                      <p className="text-sm text-gray-400 mt-1">MP4, MOV, WebM up to 100MB</p>
                    </div>
                  )}
                </div>
              )}

              {/* Creator Mode Toggle */}
              <div className="flex items-center justify-between mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Creator Mode</p>
                    <p className="text-xs text-gray-500">Hook, pacing & remix analysis</p>
                  </div>
                </div>
                <button
                  onClick={() => setCreatorMode(!creatorMode)}
                  className={`relative w-14 h-8 rounded-full transition-all ${
                    creatorMode ? 'bg-amber-500' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${
                      creatorMode ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className={`w-full mt-4 py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {loadingPhase}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Extract Insights
                  </>
                )}
              </button>
            </div>

            {/* Loading Animation */}
            {loading && (
              <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                <div className="flex flex-col items-center">
                  <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500 rounded-2xl animate-pulse" />
                    <div className="absolute inset-2 bg-white rounded-xl flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary-500 animate-bounce" />
                    </div>
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full animate-loading-bar" />
                    </div>
                  </div>
                  <p className="text-gray-500 mt-4 text-center">{loadingPhase}</p>
                  <p className="text-gray-400 text-sm mt-1">This may take up to 30 seconds</p>
                </div>
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <div className="space-y-4">
                {/* Platform Badge */}
                {result.source_platform && (
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${getPlatformColor(
                        result.source_platform
                      )} text-white font-medium shadow-lg`}
                    >
                      <span>{getPlatformIcon(result.source_platform)}</span>
                      <span className="capitalize">{result.source_platform}</span>
                    </div>
                    {result.processing_time && (
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Timer className="w-4 h-4" />
                        {result.processing_time.toFixed(1)}s
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Section */}
                {renderResultSection(
                  'Summary',
                  <Lightbulb className="w-5 h-5" />,
                  <p className="text-gray-700 leading-relaxed">{result.summary}</p>,
                  'summary',
                  result.summary
                )}

                {/* Steps Section */}
                {result.steps.length > 0 &&
                  renderResultSection(
                    'Steps',
                    <ListOrdered className="w-5 h-5" />,
                    <ol className="space-y-3">
                      {result.steps.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-7 h-7 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                            {i + 1}
                          </span>
                          <span className="text-gray-700 pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>,
                    'steps',
                    result.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
                  )}

                {/* Core Insight */}
                {renderResultSection(
                  'Core Insight',
                  <Target className="w-5 h-5" />,
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-purple-500 rounded-full" />
                    <p className="pl-4 text-lg font-medium text-gray-900 italic">
                      "{result.core_insight}"
                    </p>
                  </div>,
                  'insight',
                  result.core_insight
                )}

                {/* Content Inspiration */}
                {renderResultSection(
                  'Content Inspiration',
                  <Sparkles className="w-5 h-5" />,
                  <p className="text-gray-700 leading-relaxed">{result.content_inspiration}</p>,
                  'inspiration',
                  result.content_inspiration
                )}

                {/* Hooks */}
                {renderResultSection(
                  'Hook Ideas',
                  <Hash className="w-5 h-5" />,
                  <div className="space-y-2">
                    {result.hooks.map((hook, i) => (
                      <div
                        key={i}
                        className="group flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-primary-50 transition-colors"
                      >
                        <span className="text-gray-700 group-hover:text-primary-700">{hook}</span>
                        <button
                          onClick={() => copyToClipboard(hook, `hook-${i}`)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-primary-500 transition-all"
                        >
                          {copiedField === `hook-${i}` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>,
                  'hooks',
                  result.hooks.join('\n')
                )}

                {/* Creator Mode Analysis */}
                {result.creator_mode_enabled && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-1">
                    <div className="bg-white rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection('creator')}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white">
                            <Palette className="w-5 h-5" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Creator Analysis</h3>
                        </div>
                        {expandedSections.creator ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      {expandedSections.creator && (
                        <div className="px-4 pb-4 space-y-4">
                          {result.hook_analysis && (
                            <div className="p-4 bg-amber-50 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <Eye className="w-4 h-4 text-amber-600" />
                                <h4 className="font-semibold text-amber-900">Hook Structure</h4>
                              </div>
                              <p className="text-amber-800 text-sm">{result.hook_analysis}</p>
                            </div>
                          )}
                          {result.pacing_analysis && (
                            <div className="p-4 bg-orange-50 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <Timer className="w-4 h-4 text-orange-600" />
                                <h4 className="font-semibold text-orange-900">Pacing</h4>
                              </div>
                              <p className="text-orange-800 text-sm">{result.pacing_analysis}</p>
                            </div>
                          )}
                          {result.format_analysis && (
                            <div className="p-4 bg-yellow-50 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <Video className="w-4 h-4 text-yellow-600" />
                                <h4 className="font-semibold text-yellow-900">Format</h4>
                              </div>
                              <p className="text-yellow-800 text-sm">{result.format_analysis}</p>
                            </div>
                          )}
                          {result.remix_ideas && (
                            <div className="p-4 bg-lime-50 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <Shuffle className="w-4 h-4 text-lime-600" />
                                <h4 className="font-semibold text-lime-900">Remix Ideas</h4>
                              </div>
                              <p className="text-lime-800 text-sm whitespace-pre-line">
                                {result.remix_ideas}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    saved
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg'
                  }`}
                >
                  {saved ? (
                    <>
                      <Check className="w-5 h-5" />
                      Saved Successfully
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Insights
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Saved Tab */
          <div>
            {loadingSaved ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : savedInsights.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookmarkPlus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">No Saved Insights</h3>
                <p className="text-gray-500 text-sm">
                  Extract insights from videos and save them here for later
                </p>
              </div>
            ) : selectedSaved ? (
              /* Selected Saved Detail View */
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedSaved(null)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
                >
                  <X className="w-4 h-4" />
                  Back to list
                </button>

                {selectedSaved.source_platform && (
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${getPlatformColor(
                      selectedSaved.source_platform
                    )} text-white font-medium shadow-lg`}
                  >
                    <span>{getPlatformIcon(selectedSaved.source_platform)}</span>
                    <span className="capitalize">{selectedSaved.source_platform}</span>
                  </div>
                )}

                {renderResultSection(
                  'Summary',
                  <Lightbulb className="w-5 h-5" />,
                  <p className="text-gray-700 leading-relaxed">{selectedSaved.summary}</p>,
                  'summary',
                  selectedSaved.summary
                )}

                {selectedSaved.steps.length > 0 &&
                  renderResultSection(
                    'Steps',
                    <ListOrdered className="w-5 h-5" />,
                    <ol className="space-y-3">
                      {selectedSaved.steps.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-7 h-7 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                            {i + 1}
                          </span>
                          <span className="text-gray-700 pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>,
                    'steps'
                  )}

                {renderResultSection(
                  'Core Insight',
                  <Target className="w-5 h-5" />,
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-purple-500 rounded-full" />
                    <p className="pl-4 text-lg font-medium text-gray-900 italic">
                      "{selectedSaved.core_insight}"
                    </p>
                  </div>,
                  'insight',
                  selectedSaved.core_insight
                )}

                {renderResultSection(
                  'Content Inspiration',
                  <Sparkles className="w-5 h-5" />,
                  <p className="text-gray-700 leading-relaxed">
                    {selectedSaved.content_inspiration}
                  </p>,
                  'inspiration'
                )}

                {renderResultSection(
                  'Hook Ideas',
                  <Hash className="w-5 h-5" />,
                  <div className="space-y-2">
                    {selectedSaved.hooks.map((hook, i) => (
                      <div
                        key={i}
                        className="group flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <span className="text-gray-700">{hook}</span>
                      </div>
                    ))}
                  </div>,
                  'hooks'
                )}

                <button
                  onClick={() => handleDelete(selectedSaved.id)}
                  className="w-full py-3 rounded-xl font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Insight
                </button>
              </div>
            ) : (
              /* Saved List View */
              <div className="space-y-3">
                {savedInsights.map((insight) => (
                  <div
                    key={insight.id}
                    onClick={() => setSelectedSaved(insight)}
                    className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all border border-gray-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">
                            {getPlatformIcon(insight.source_platform)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-900 font-medium line-clamp-2 mb-1">
                          {insight.core_insight}
                        </p>
                        <p className="text-gray-500 text-sm line-clamp-1">{insight.summary}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(insight.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom CSS for loading animation */}
      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 2s ease-in-out infinite;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default VideoInsights;
