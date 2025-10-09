import React, { useState, useRef } from 'react';
import { Upload, Download, Image as ImageIcon, Loader, X } from 'lucide-react';
import { API_URL } from '../config/api';

type ViewType = 'front' | 'back' | 'side' | 'three' | 'custom';

interface GenerationHistory {
  id: string;
  timestamp: number;
  inputImage: string;
  outputImage: string;
  prompt: string;
  size: string;
  viewType: ViewType;
}

const CharacterImage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'process' | 'merge'>('process');

  // 角色图处理状态
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('[1:1]');
  const [selectedView, setSelectedView] = useState<ViewType>('front');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [enableTranslation, setEnableTranslation] = useState<boolean>(true); // 默认开启翻译
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [history, setHistory] = useState<GenerationHistory[]>([]);

  // 合并图片状态
  const [mergeImages, setMergeImages] = useState<File[]>([]);
  const [mergePreviews, setMergePreviews] = useState<string[]>([]);
  const [mergedImageUrl, setMergedImageUrl] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  const sizeOptions = [
    { value: '[1:1]', label: '1:1 (正方形)' },
    { value: '[16:9]', label: '16:9 (横屏)' },
    { value: '[9:16]', label: '9:16 (竖屏)' },
    { value: '[4:3]', label: '4:3 (标准)' },
    { value: '[3:4]', label: '3:4 (竖版)' },
    { value: '[8:17]', label: '8:17' },
  ];

  const viewOptions = [
    { value: 'front' as ViewType, label: '正视图', prompt: '给我做一个正视图' },
    { value: 'back' as ViewType, label: '背视图', prompt: '给我做一个背视图' },
    { value: 'side' as ViewType, label: '侧视图', prompt: '给我做一个侧视图' },
    { value: 'three' as ViewType, label: '三视图', prompt: '给我做一个三视图' },
    { value: 'custom' as ViewType, label: '自定义', prompt: '' },
  ];

  // 获取token
  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };

  // 上传padding后的图片到后端，获取URL
  const uploadPaddedImage = async (
    blob: Blob,
    ratio: string
  ): Promise<string> => {
    console.log('[Upload] 开始上传padding后的图片');
    console.log('[Upload] Blob大小:', blob.size, 'bytes');
    console.log('[Upload] Blob类型:', blob.type);
    console.log('[Upload] 目标比例:', ratio);

    const formData = new FormData();
    const timestamp = Date.now();
    const filename = `temp_padded_${ratio}_${timestamp}.jpg`;

    formData.append('file', blob, filename);
    formData.append('character_id', '0'); // 临时图片使用0
    formData.append('ratio', ratio);
    formData.append('original_filename', `temp_${timestamp}.jpg`);

    console.log('[Upload] 文件名:', filename);
    console.log('[Upload] 上传到:', `${API_URL}/characters/padded-image`);

    const response = await fetch(`${API_URL}/characters/padded-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formData
    });

    console.log('[Upload] 响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Upload] 上传失败:', response.status, errorText);
      throw new Error(`Failed to upload padded image: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Upload] 上传成功, URL:', data.image_url);
    return data.image_url;
  };

  // 解析宽高比
  const parseAspectRatio = (imageSize: string): { width: number; height: number } | null => {
    const match = imageSize.match(/\[(\d+):(\d+)\]/);
    if (!match) return null;
    return {
      width: parseInt(match[1]),
      height: parseInt(match[2])
    };
  };

  // 使用边缘像素填充图片到目标宽高比
  const padImageToRatio = async (
    imageUrl: string,
    targetRatio: { width: number; height: number }
  ): Promise<Blob> => {
    console.log('[Padding] 开始padding处理');
    console.log('[Padding] 目标比例:', targetRatio);
    console.log('[Padding] 图片URL:', imageUrl);

    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      // 本地blob URL不需要CORS设置

      img.onload = () => {
        try {
          const srcWidth = img.width;
          const srcHeight = img.height;
          console.log('[Padding] 原始图片尺寸:', { width: srcWidth, height: srcHeight });

          const srcRatio = srcWidth / srcHeight;
          const targetRatioValue = targetRatio.width / targetRatio.height;
          console.log('[Padding] 原始比例:', srcRatio, '目标比例:', targetRatioValue);

          let canvasWidth: number;
          let canvasHeight: number;
          let offsetX = 0;
          let offsetY = 0;

          if (srcRatio > targetRatioValue) {
            canvasWidth = srcWidth;
            canvasHeight = Math.round(srcWidth / targetRatioValue);
            offsetY = Math.round((canvasHeight - srcHeight) / 2);
            console.log('[Padding] 需要上下padding, offsetY:', offsetY);
          } else {
            canvasHeight = srcHeight;
            canvasWidth = Math.round(srcHeight * targetRatioValue);
            offsetX = Math.round((canvasWidth - srcWidth) / 2);
            console.log('[Padding] 需要左右padding, offsetX:', offsetX);
          }

          console.log('[Padding] Canvas尺寸:', { width: canvasWidth, height: canvasHeight });
          console.log('[Padding] 偏移量:', { offsetX, offsetY });

          const canvas = document.createElement('canvas');
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            console.error('[Padding] 无法获取canvas context');
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // 使用边缘像素填充
          if (offsetY > 0) {
            console.log('[Padding] 填充上下边缘像素');
            ctx.drawImage(img, 0, 0, srcWidth, 1, 0, 0, canvasWidth, offsetY);
            ctx.drawImage(img, 0, srcHeight - 1, srcWidth, 1, 0, offsetY + srcHeight, canvasWidth, offsetY);
          }

          if (offsetX > 0) {
            console.log('[Padding] 填充左右边缘像素');
            ctx.drawImage(img, 0, 0, 1, srcHeight, 0, 0, offsetX, canvasHeight);
            ctx.drawImage(img, srcWidth - 1, 0, 1, srcHeight, offsetX + srcWidth, 0, offsetX, canvasHeight);
          }

          console.log('[Padding] 绘制主图片, offset:', { x: offsetX, y: offsetY });
          ctx.drawImage(img, offsetX, offsetY);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                console.log('[Padding] Blob创建成功, 大小:', blob.size, 'bytes');
                console.log('[Padding] Blob类型:', blob.type);
                resolve(blob);
              } else {
                console.error('[Padding] Blob创建失败');
                reject(new Error('Failed to convert canvas to blob'));
              }
            },
            'image/jpeg',
            0.95
          );
        } catch (error) {
          console.error('[Padding] 处理过程出错:', error);
          reject(error);
        }
      };

      img.onerror = (e) => {
        console.error('[Padding] 图片加载失败:', imageUrl, e);
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };

      img.src = imageUrl;
      console.log('[Padding] 开始加载图片...');
    });
  };

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setGeneratedImage(''); // 清空之前的生成结果
    }
  };

  // 处理视图类型选择
  const handleViewChange = (view: ViewType) => {
    setSelectedView(view);
    // 不修改customPrompt，让用户自己追加内容
  };

  // 获取完整的prompt（标签prompt + 自定义prompt）
  const getFullPrompt = (): string => {
    const basePrompt = selectedView !== 'custom'
      ? viewOptions.find(v => v.value === selectedView)?.prompt || ''
      : '';

    const trimmedCustom = customPrompt.trim();

    if (basePrompt && trimmedCustom) {
      return `${basePrompt} ${trimmedCustom}`;
    } else if (basePrompt) {
      return basePrompt;
    } else {
      return trimmedCustom;
    }
  };

  // 翻译prompt为英文
  const translateToEnglish = async (text: string): Promise<string> => {
    if (!text || !enableTranslation) {
      return text;
    }

    try {
      const response = await fetch('https://aiyoutubebackendprod.email777.org/api/v1/translate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        console.error('Translation failed:', response.status);
        return text; // 失败返回原文
      }

      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // 出错返回原文
    }
  };

  // 生成图片
  const handleGenerate = async () => {
    console.log('\n========== 开始生成图片 ==========');
    console.log('上传的文件:', uploadedImage?.name, '大小:', uploadedImage?.size);

    if (!uploadedImage) {
      alert('请先上传图片');
      return;
    }

    const fullPrompt = getFullPrompt();
    console.log('完整prompt:', fullPrompt);
    if (!fullPrompt) {
      alert('请输入或选择提示词');
      return;
    }

    setIsGenerating(true);

    try {
      // 1. 翻译prompt（如果启用）
      console.log('\n=== 步骤1: Prompt翻译 ===');
      console.log('翻译开关:', enableTranslation);
      let finalPrompt = fullPrompt;
      if (enableTranslation) {
        setIsTranslating(true);
        finalPrompt = await translateToEnglish(fullPrompt);
        setIsTranslating(false);
        console.log('原始prompt:', fullPrompt);
        console.log('翻译后prompt:', finalPrompt);
      } else {
        console.log('翻译已关闭，使用原始prompt');
      }

      // 2. 将上传的图片转为ObjectURL
      console.log('\n=== 步骤2: 创建Blob URL ===');
      const imageUrl = URL.createObjectURL(uploadedImage);
      console.log('Blob URL:', imageUrl);

      // 3. 解析目标宽高比
      console.log('\n=== 步骤3: 解析目标比例 ===');
      console.log('选择的尺寸:', selectedSize);
      const ratio = parseAspectRatio(selectedSize);
      if (!ratio) {
        console.error('解析比例失败:', selectedSize);
        alert('无效的尺寸格式');
        setIsGenerating(false);
        return;
      }
      console.log('解析后的比例:', ratio);

      // 4. Padding到目标比例
      console.log('\n=== 步骤4: Padding图片 ===');
      console.log('选择的尺寸:', selectedSize);
      const paddedBlob = await padImageToRatio(imageUrl, ratio);
      console.log('Padding完成, blob大小:', paddedBlob.size);

      // 5. 上传padding后的图片到R2，获取URL
      console.log('\n=== 步骤5: 上传到R2 ===');
      const ratioString = selectedSize.replace(/[\[\]]/g, '').replace(':', '_');
      console.log('比例字符串:', ratioString);

      let paddedImageUrl;
      try {
        paddedImageUrl = await uploadPaddedImage(paddedBlob, ratioString);
        console.log('上传成功, 获取到URL:', paddedImageUrl);
      } catch (uploadError) {
        console.error('上传失败:', uploadError);
        alert('上传图片失败，请重试');
        setIsGenerating(false);
        URL.revokeObjectURL(imageUrl);
        return;
      }

      // 6. 验证上传的图片
      console.log('\n=== 步骤6: 验证上传的图片 ===');
      console.log('即将提交的图片URL:', paddedImageUrl);

      // 7. 提交请求（使用翻译后的prompt）
      console.log('\n=== 步骤7: 提交生成请求 ===');
      const requestBody = {
        prompt: finalPrompt,  // 使用翻译后的prompt
        image_size: selectedSize,
        model: 'gemini-2.5-flash-image-preview',
        character_image_urls: [paddedImageUrl]  // 提交URL数组
      };

      console.log('请求体:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${API_URL}/generation/single`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.status === 200 && data.image_url && data.status === 'completed') {
        // Gemini同步模式成功
        setGeneratedImage(data.image_url);

        // 添加到历史记录（保存原始prompt）
        const historyItem: GenerationHistory = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          inputImage: previewUrl,
          outputImage: data.image_url,
          prompt: fullPrompt,  // 保存原始中文prompt，方便用户查看
          size: selectedSize,
          viewType: selectedView
        };
        setHistory(prev => [historyItem, ...prev]);
      } else {
        console.error('Generation failed:', {
          status: response.status,
          data: data
        });
        const errorMsg = data.message || data.error || `服务器错误 (${response.status})`;
        alert('生成失败: ' + errorMsg);
      }

      // 清理ObjectURL
      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      console.error('Generation error:', error);
      alert('生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 处理合并图片上传
  const handleMergeImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setMergeImages(files);

    // 生成预览
    const previews = files.map(file => URL.createObjectURL(file));
    setMergePreviews(previews);
    setMergedImageUrl(''); // 清空之前的合并结果
  };

  // 合并图片
  const handleMergeImages = async () => {
    if (mergeImages.length < 2) {
      alert('请至少上传两张图片');
      return;
    }

    setIsMerging(true);

    try {
      // 使用Canvas合并图片
      const images = await Promise.all(
        mergeImages.map(file => {
          return new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = URL.createObjectURL(file);
          });
        })
      );

      // 找到最大高度
      const maxHeight = Math.max(...images.map(img => img.height));

      // 计算总宽度
      const totalWidth = images.reduce((sum, img) => {
        const ratio = maxHeight / img.height;
        return sum + img.width * ratio;
      }, 0);

      // 创建Canvas
      const canvas = document.createElement('canvas');
      canvas.width = totalWidth;
      canvas.height = maxHeight;
      const ctx = canvas.getContext('2d')!;

      // 绘制图片
      let currentX = 0;
      images.forEach(img => {
        const ratio = maxHeight / img.height;
        const scaledWidth = img.width * ratio;
        ctx.drawImage(img, currentX, 0, scaledWidth, maxHeight);
        currentX += scaledWidth;
      });

      // 转换为blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setMergedImageUrl(url);
        }
        setIsMerging(false);
      }, 'image/png');
    } catch (error) {
      console.error('Merge error:', error);
      alert('合并失败，请稍后重试');
      setIsMerging(false);
    }
  };

  // 下载合并后的图片
  const handleDownloadMerged = () => {
    if (!mergedImageUrl) return;

    const link = document.createElement('a');
    link.href = mergedImageUrl;
    link.download = `merged_${Date.now()}.png`;
    link.click();
  };

  // 下载生成的图片
  const handleDownloadGenerated = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated_${Date.now()}.png`;
    link.target = '_blank';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">单图处理（角色图）</h1>

        {/* 选项卡 */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('process')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'process'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              角色图处理
            </button>
            <button
              onClick={() => setActiveTab('merge')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'merge'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              合并图片
            </button>
          </div>
        </div>

        {/* 角色图处理选项卡 */}
        {activeTab === 'process' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：输入区域 */}
            <div className="space-y-6">
              {/* 上传图片 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">上传图片</h2>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {!previewUrl ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">点击上传图片</p>
                  </button>
                ) : (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-64 object-contain bg-gray-100 rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setPreviewUrl('');
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 选择尺寸 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">选择尺寸</h2>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {sizeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 选择视图类型 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">选择视图类型</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {viewOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleViewChange(option.value)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedView === option.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* 自定义prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedView === 'custom' ? '提示词' : '追加描述'} {selectedView === 'custom' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={selectedView === 'custom' ? '请输入自定义提示词...' : '可在此追加更多描述...'}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                    rows={3}
                  />

                  {/* 翻译选项 */}
                  <div className="mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableTranslation}
                        onChange={(e) => setEnableTranslation(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        自动翻译为英文（推荐，提升Gemini生成质量）
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 生成按钮 */}
              <button
                onClick={handleGenerate}
                disabled={isTranslating || isGenerating || !uploadedImage}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isTranslating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    翻译中...
                  </>
                ) : isGenerating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    生成图片
                  </>
                )}
              </button>
            </div>

            {/* 右侧：结果区域 */}
            <div className="space-y-6">
              {/* 生成结果 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">生成结果</h2>

                {generatedImage ? (
                  <div>
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="w-full h-auto rounded-lg mb-4"
                    />
                    <button
                      onClick={handleDownloadGenerated}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      下载图片
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <ImageIcon className="w-16 h-16 mb-2" />
                    <p className="text-sm">等待生成...</p>
                  </div>
                )}
              </div>

              {/* 历史记录 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">历史记录</h2>

                {history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">暂无历史记录</p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {history.map(item => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex gap-3 mb-2">
                          <img
                            src={item.inputImage}
                            alt="Input"
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">
                              {new Date(item.timestamp).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-700 line-clamp-2">{item.prompt}</p>
                            <p className="text-xs text-gray-500 mt-1">尺寸: {item.size}</p>
                          </div>
                        </div>
                        <img
                          src={item.outputImage}
                          alt="Output"
                          className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => window.open(item.outputImage, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 合并图片选项卡 */}
        {activeTab === 'merge' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：上传区域 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">上传图片</h2>

              <input
                ref={mergeInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleMergeImagesUpload}
                className="hidden"
              />

              <button
                onClick={() => mergeInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors mb-4"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">点击上传多张图片</p>
              </button>

              {mergePreviews.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">已上传 {mergePreviews.length} 张图片</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {mergePreviews.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded border border-gray-200"
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleMergeImages}
                    disabled={isMerging}
                    className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isMerging ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        合并中...
                      </>
                    ) : (
                      '合并图片'
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 右侧：合并结果 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">合并结果</h2>

              {mergedImageUrl ? (
                <div>
                  <div className="overflow-x-auto mb-4">
                    <img
                      src={mergedImageUrl}
                      alt="Merged"
                      className="max-w-full h-auto rounded-lg"
                    />
                  </div>
                  <button
                    onClick={handleDownloadMerged}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    下载合并图片
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <ImageIcon className="w-16 h-16 mb-2" />
                  <p className="text-sm">等待合并...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterImage;
