import React, { useState } from 'react';
import { Loader2, Download, Upload, Sparkles } from 'lucide-react';
import { API_URL } from '../config/api';

const SingleImageGeneration: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imageSize, setImageSize] = useState('16:9');
  const [referenceImage, setReferenceImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Image size options
  const imageSizes = [
    { value: '16:9', label: '16:9 (横屏)' },
    { value: '9:16', label: '9:16 (竖屏)' },
    { value: '1:1', label: '1:1 (正方形)' },
    { value: '4:3', label: '4:3 (标准)' },
    { value: '3:4', label: '3:4 (竖版)' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('请输入图片描述');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('请先登录');
        return;
      }

      const response = await fetch(`${API_URL}/single-image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          image_size: imageSize,
          reference_image: referenceImage || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Include more detailed error information
        const errorMessage = errorData.details ? 
          `${errorData.error}: ${errorData.details}` : 
          (errorData.error || '生成失败');
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.image_url) {
        setGeneratedImage(result.image_url);
        
        // Add to history
        setGenerationHistory(prev => [{
          prompt,
          image_url: result.image_url,
          image_size: imageSize,
          created_at: new Date().toISOString()
        }, ...prev].slice(0, 10)); // Keep last 10 items
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || '请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imageUrl: string, fileName: string = 'generated-image.png') => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadFromHistory = (item: any) => {
    setPrompt(item.prompt);
    setImageSize(item.image_size || '16:9');
    setGeneratedImage(item.image_url);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generation Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">单图生成</h2>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {/* Prompt Input */}
            <div className="mb-4">
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                图片描述
              </label>
              <textarea
                id="prompt"
                placeholder="描述你想要生成的图片内容..."
                value={prompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Image Size Selection */}
            <div className="mb-4">
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                图片尺寸
              </label>
              <select
                id="size"
                value={imageSize}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setImageSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {imageSizes.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Image URL */}
            <div className="mb-6">
              <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-2">
                参考图片 URL (可选)
              </label>
              <input
                id="reference"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={referenceImage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReferenceImage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                提供参考图片可以让生成的图片风格更接近参考
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  生成图片
                </>
              )}
            </button>
          </div>

          {/* Generation History */}
          {generationHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">最近生成</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {generationHistory.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => loadFromHistory(item)}
                  >
                    <p className="text-sm font-medium truncate">{item.prompt}</p>
                    <p className="text-xs text-gray-500">
                      {item.image_size} • {new Date(item.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Generated Image Display */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">生成结果</h3>
            {isGenerating ? (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">正在生成图片...</p>
                    <p className="text-xs text-gray-500">
                      这可能需要几分钟时间，请耐心等待
                    </p>
                  </div>
                </div>
              </div>
            ) : generatedImage ? (
              <div className="space-y-4">
                <div className="relative group">
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full rounded-lg"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjIwMCIgeT0iMTUwIiBzdHlsZT0iZmlsbDojYWFhO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjE5cHg7Zm9udC1mYW1pbHk6QXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7ZG9taW5hbnQtYmFzZWxpbmU6Y2VudHJhbCI+SW1hZ2UgTG9hZCBFcnJvcjwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => handleDownload(generatedImage)}
                      className="px-4 py-2 bg-white text-gray-800 rounded-md hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      下载图片
                    </button>
                  </div>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm font-medium mb-1">提示词：</p>
                  <p className="text-sm text-gray-600">{prompt}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-500">
                    生成的图片将在这里显示
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleImageGeneration;