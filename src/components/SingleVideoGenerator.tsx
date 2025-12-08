import React, { useState, useEffect } from 'react';
import { Upload, Download, Loader, Languages, Video as VideoIcon, X } from 'lucide-react';
import {
  uploadImage,
  submitBatchTasks as submitBatchTasksHailuo,
  pollTasksStatus as pollTasksStatusHailuo
} from '../services/hailuoTasksService';
import {
  submitBatchTasks as submitBatchTasksJiMeng,
  pollTasksStatus as pollTasksStatusJiMeng
} from '../services/jimengTasksService';
import {
  submitBatchTasks as submitBatchTasksVeo,
  pollTasksStatus as pollTasksStatusVeo
} from '../services/veoTasksService';
import {
  submitBatchTasks as submitBatchTasksSora,
  pollTasksStatus as pollTasksStatusSora
} from '../services/soraTasksService';

type VideoModel = 'hailuo' | 'jimeng-official' | 'jimeng-yunwu' | 'veo-3.1-fast' | 'sora-2-hd';
type AspectRatio = '16x9' | '9x16';
type Status = 'idle' | 'uploading' | 'translating' | 'generating' | 'completed' | 'failed';

interface UploadedImage {
  file: File;
  preview: string;
  url?: string;
}

const SingleVideoGenerator: React.FC = () => {
  // Model & Ratio
  const [selectedVideoModel, setSelectedVideoModel] = useState<VideoModel>(() => {
    return (localStorage.getItem('singleVideoModel') as VideoModel) || 'jimeng-official';
  });
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(() => {
    return (localStorage.getItem('singleAspectRatio') as AspectRatio) || '9x16';
  });

  // Image
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Prompt
  const [promptText, setPromptText] = useState('');
  const [translatedPrompt, setTranslatedPrompt] = useState('');

  // Task
  const [status, setStatus] = useState<Status>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Video modal
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Polling
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('singleVideoModel', selectedVideoModel);
  }, [selectedVideoModel]);

  useEffect(() => {
    localStorage.setItem('singleAspectRatio', selectedAspectRatio);
  }, [selectedAspectRatio]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };

  // Translate to English
  const translateToEnglish = async (text: string): Promise<string> => {
    if (!text) return '';

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
        throw new Error('Translation failed');
      }

      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage({
        file,
        preview: event.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage({
        file,
        preview: event.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  // Remove image
  const handleRemoveImage = () => {
    setUploadedImage(null);
    setVideoUrl(null);
    setStatus('idle');
    setErrorMessage(null);
  };

  // Translate prompt
  const handleTranslate = async () => {
    if (!promptText.trim()) {
      alert('请输入提示词');
      return;
    }

    setStatus('translating');
    setErrorMessage(null);

    try {
      const translated = await translateToEnglish(promptText);
      setTranslatedPrompt(translated);
      setStatus('idle');
    } catch (error) {
      console.error('Translation error:', error);
      setErrorMessage('翻译失败，请重试');
      setStatus('idle');
    }
  };

  // Generate video
  const handleGenerateVideo = async () => {
    if (!promptText.trim()) {
      alert('请输入提示词');
      return;
    }

    setErrorMessage(null);
    setVideoUrl(null);

    try {
      let imageUrl: string | undefined;

      // 1. Upload image if exists
      if (uploadedImage) {
        setStatus('uploading');
        const uploadResult = await uploadImage(uploadedImage.file);
        imageUrl = uploadResult.imageUrl;
        setUploadedImage(prev => prev ? { ...prev, url: imageUrl } : null);
      }

      // 2. Translate if needed
      let finalPrompt = translatedPrompt || promptText;
      if (!translatedPrompt) {
        setStatus('translating');
        finalPrompt = await translateToEnglish(promptText);
        setTranslatedPrompt(finalPrompt);
      }

      // 3. Submit task
      setStatus('generating');

      const isSora = selectedVideoModel === 'sora-2-hd';
      const isVeo = selectedVideoModel === 'veo-3.1-fast';
      const isJiMeng = selectedVideoModel === 'jimeng-official' || selectedVideoModel === 'jimeng-yunwu';

      let result;
      if (isSora) {
        // Sora: uses singular imageUrl (not array), can be undefined for text-only
        const soraTasks = [{
          imageUrl: imageUrl,  // Optional: can be undefined
          promptCn: promptText,
          promptEn: finalPrompt
        }];
        result = await submitBatchTasksSora(soraTasks, selectedAspectRatio);
      } else {
        // Veo, JiMeng, Hailuo use imageUrls (array) format
        const tasks = [{
          imageUrls: imageUrl ? [imageUrl] : [],
          promptCn: promptText,
          promptEn: finalPrompt,
          imageCount: imageUrl ? 1 : 0
        }];

        if (isVeo) {
          result = await submitBatchTasksVeo(tasks, selectedAspectRatio);
        } else if (isJiMeng) {
          result = await submitBatchTasksJiMeng(tasks, selectedVideoModel === 'jimeng-yunwu' ? 'yunwu' : 'official');
        } else {
          result = await submitBatchTasksHailuo(tasks);
        }
      }

      if (!result.taskIds || result.taskIds.length === 0) {
        throw new Error(result.message || '提交任务失败');
      }

      const submittedTaskId = result.taskIds[0];

      // 4. Start polling
      startPolling(submittedTaskId);

    } catch (error: any) {
      console.error('Generate video error:', error);
      setErrorMessage(error.message || '生成视频失败');
      setStatus('failed');
    }
  };

  // Start polling task status
  const startPolling = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const isVeo = selectedVideoModel === 'veo-3.1-fast';
        const isSora = selectedVideoModel === 'sora-2-hd';
        const isJiMeng = selectedVideoModel === 'jimeng-official' || selectedVideoModel === 'jimeng-yunwu';

        let taskStatus;
        if (isVeo) {
          taskStatus = await pollTasksStatusVeo([taskId]);
        } else if (isSora) {
          taskStatus = await pollTasksStatusSora([taskId]);
        } else if (isJiMeng) {
          taskStatus = await pollTasksStatusJiMeng([taskId]);
        } else {
          taskStatus = await pollTasksStatusHailuo([taskId]);
        }

        const task = taskStatus[0];
        if (!task) return;

        if (task.status === 'completed' && task.videoUrl) {
          setVideoUrl(task.videoUrl);
          setStatus('completed');
          clearInterval(interval);
          setPollingInterval(null);
        } else if (task.status === 'failed') {
          setErrorMessage('视频生成失败');
          setStatus('failed');
          clearInterval(interval);
          setPollingInterval(null);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    setPollingInterval(interval);
  };

  // Download video
  const handleDownloadVideo = async () => {
    if (!videoUrl) return;

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('下载失败，请重试');
    }
  };

  const canGenerate = promptText.trim() && status !== 'generating';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <VideoIcon className="w-6 h-6" />
          生成单个视频
        </h2>

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            选择视频模型
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="videoModel"
                value="jimeng-official"
                checked={selectedVideoModel === 'jimeng-official'}
                onChange={(e) => setSelectedVideoModel(e.target.value as VideoModel)}
                className="mr-2"
              />
              <span className="text-sm">即梦官方</span>
            </label>

            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="videoModel"
                value="jimeng-yunwu"
                checked={selectedVideoModel === 'jimeng-yunwu'}
                onChange={(e) => setSelectedVideoModel(e.target.value as VideoModel)}
                className="mr-2"
              />
              <span className="text-sm">即梦云雾</span>
            </label>

            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="videoModel"
                value="hailuo"
                checked={selectedVideoModel === 'hailuo'}
                onChange={(e) => setSelectedVideoModel(e.target.value as VideoModel)}
                className="mr-2"
              />
              <span className="text-sm">海螺</span>
            </label>

            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="videoModel"
                value="veo-3.1-fast"
                checked={selectedVideoModel === 'veo-3.1-fast'}
                onChange={(e) => setSelectedVideoModel(e.target.value as VideoModel)}
                className="mr-2"
              />
              <span className="text-sm">Veo 3.1 Fast</span>
            </label>

            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="videoModel"
                value="sora-2-hd"
                checked={selectedVideoModel === 'sora-2-hd'}
                onChange={(e) => setSelectedVideoModel(e.target.value as VideoModel)}
                className="mr-2"
              />
              <span className="text-sm">Sora 2 HD</span>
            </label>
          </div>
        </div>

        {/* Aspect Ratio - Only for Veo and Sora */}
        {(selectedVideoModel === 'veo-3.1-fast' || selectedVideoModel === 'sora-2-hd') && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              视频比例
            </label>
            <div className="flex gap-3">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="radio"
                  name="aspectRatio"
                  value="9x16"
                  checked={selectedAspectRatio === '9x16'}
                  onChange={(e) => setSelectedAspectRatio(e.target.value as AspectRatio)}
                  className="mr-2"
                />
                <span className="text-sm">9:16 (竖屏)</span>
              </label>

              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="radio"
                  name="aspectRatio"
                  value="16x9"
                  checked={selectedAspectRatio === '16x9'}
                  onChange={(e) => setSelectedAspectRatio(e.target.value as AspectRatio)}
                  className="mr-2"
                />
                <span className="text-sm">16:9 (横屏)</span>
              </label>
            </div>
          </div>
        )}

        {/* Image Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            上传图片 <span className="text-gray-500 text-xs font-normal">（可选）</span>
          </label>
          {!uploadedImage ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">拖拽图片到这里，或点击选择</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="single-image-upload"
              />
              <label
                htmlFor="single-image-upload"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
              >
                选择图片
              </label>
            </div>
          ) : (
            <div className="relative border rounded-lg p-4">
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={uploadedImage.preview}
                alt="Uploaded"
                className="max-h-64 mx-auto rounded"
              />
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            提示词（中文）
          </label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="输入视频描述..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
        </div>

        {/* Translated Prompt */}
        {translatedPrompt && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              翻译结果（英文）
            </label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
              <p className="text-gray-700">{translatedPrompt}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleTranslate}
            disabled={!promptText.trim() || status === 'translating'}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'translating' ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Languages className="w-4 h-4" />
            )}
            {status === 'translating' ? '翻译中...' : '翻译'}
          </button>

          <button
            onClick={handleGenerateVideo}
            disabled={!canGenerate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'uploading' && <Loader className="w-4 h-4 animate-spin" />}
            {status === 'translating' && <Loader className="w-4 h-4 animate-spin" />}
            {status === 'generating' && <Loader className="w-4 h-4 animate-spin" />}
            {status === 'uploading' && '上传中...'}
            {status === 'translating' && '翻译中...'}
            {status === 'generating' && '生成中...'}
            {(status === 'idle' || status === 'completed' || status === 'failed') && '生成视频'}
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Video Preview */}
        {videoUrl && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              生成结果
            </label>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-green-600">✓ 视频生成完成</span>
                <button
                  onClick={handleDownloadVideo}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载视频
                </button>
              </div>
              <div className="relative">
                <video
                  src={videoUrl}
                  controls
                  className="w-full max-h-96 rounded-lg"
                  onClick={() => setShowVideoModal(true)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Status Info */}
        {status === 'generating' && (
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-blue-700">正在生成视频，请稍候...</p>
            <p className="text-sm text-gray-600 mt-1">这可能需要几分钟时间</p>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {showVideoModal && videoUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowVideoModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            <video
              src={videoUrl}
              controls
              autoPlay
              className="max-w-full max-h-[90vh] rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleVideoGenerator;
