import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Copy, Loader, Video, Trash2, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { API_URL } from '../config/api';

interface VideoClip {
  id: string;
  file: File;
  preview: string;
  characterFeature?: string;
  sceneId: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  prompt?: {
    scene_id: string;
    duration: string;
    prompts: {
      english: string;
      chinese: string;
    };
  };
  error?: string;
}

interface Script {
  id: number;
  name: string;
  category: string;
  created_at: string;
}

interface ParsedScriptContent {
  sequence: number;
  prompt: string;
  dynamicDescription?: string;
  narration?: string;  // 第四列：角色特征
}

const VideoClipPromptGenerator: React.FC = () => {
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  const [characterFeatures, setCharacterFeatures] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 脚本相关状态
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [showScriptSelector, setShowScriptSelector] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState('');
  const [scriptScope, setScriptScope] = useState<'mine' | 'system' | 'both'>('both');

  const videoInputRef = useRef<HTMLInputElement>(null);

  // 加载脚本列表
  useEffect(() => {
    if (showScriptSelector) {
      loadScripts();
    }
  }, [scriptScope, showScriptSelector]);

  const loadScripts = async () => {
    setLoadingScripts(true);
    try {
      const token = localStorage.getItem('token');
      const requests = [];

      if (scriptScope === 'mine' || scriptScope === 'both') {
        requests.push(
          fetch(`${API_URL}/scripts?scope=mine`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        );
      }

      if (scriptScope === 'system' || scriptScope === 'both') {
        requests.push(
          fetch(`${API_URL}/scripts?scope=system`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        );
      }

      const responses = await Promise.all(requests);
      const allScripts: Script[] = [];

      for (const response of responses) {
        if (response.ok) {
          const data = await response.json();
          allScripts.push(...(data.scripts || []));
        }
      }

      setScripts(allScripts);
    } catch (error) {
      console.error('Failed to load scripts:', error);
      alert('加载脚本列表失败');
    } finally {
      setLoadingScripts(false);
    }
  };

  // 导入脚本数据（提取第四列 narration）
  const importScriptData = async () => {
    if (!selectedScriptId) {
      alert('请先选择一个脚本');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/scripts/${selectedScriptId}/parsed`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load script data');
      }

      const data = await response.json();
      const parsedContent: ParsedScriptContent[] = data.parsed_content || [];

      console.log('[VideoClipPrompt] Parsed content:', parsedContent);

      // 提取第四列（narration）作为角色特征
      const features: string[] = parsedContent
        .map(frame => frame.narration || '')
        .filter(narration => narration.trim().length > 0);

      console.log('[VideoClipPrompt] Extracted character features:', features);

      if (features.length === 0) {
        alert('该脚本没有角色特征数据（第四列为空）');
        return;
      }

      setCharacterFeatures(features);

      // 关闭选择器
      setShowScriptSelector(false);
      setSelectedScriptId('');

      const scriptName = scripts.find(s => s.id === parseInt(selectedScriptId))?.name;
      alert(`已导入脚本「${scriptName}」的角色特征（共 ${features.length} 个）`);

    } catch (error) {
      console.error('Failed to import script data:', error);
      alert('导入脚本数据失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 处理视频文件选择
  const handleVideoSelect = (files: FileList | null) => {
    if (!files) return;

    // 检查文件大小（20MB 限制）
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    const oversizedFiles = Array.from(files).filter(file => file.size > MAX_SIZE);

    if (oversizedFiles.length > 0) {
      const fileList = oversizedFiles.map(f =>
        `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`
      ).join('\n');
      alert(`以下文件超过 20MB 限制，无法上传：\n\n${fileList}\n\n请使用更小的视频文件。`);
      return;
    }

    const newClips: VideoClip[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}_${index}`,
      file,
      preview: URL.createObjectURL(file),
      sceneId: `场景${String(videoClips.length + index + 1).padStart(3, '0')}`,
      status: 'pending'
    }));

    setVideoClips(prev => [...prev, ...newClips]);

    // 上传视频后显示脚本选择器
    if (newClips.length > 0) {
      setShowScriptSelector(true);
    }
  };

  // 拖放处理
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

    const files = e.dataTransfer.files;
    const videoFiles: File[] = [];

    Array.from(files).forEach(file => {
      if (file.type.startsWith('video/')) {
        videoFiles.push(file);
      }
    });

    if (videoFiles.length > 0) {
      const dataTransfer = new DataTransfer();
      videoFiles.forEach(file => dataTransfer.items.add(file));
      handleVideoSelect(dataTransfer.files);
    }
  };

  // 删除视频片段
  const removeClip = (id: string) => {
    setVideoClips(prev => prev.filter(clip => clip.id !== id));
  };

  // 生成 Prompt
  const generatePrompts = async () => {
    if (videoClips.length === 0) {
      alert('请先上传视频片段');
      return;
    }

    setIsGenerating(true);

    // 标记所有为处理中
    setVideoClips(prev => prev.map(clip => ({ ...clip, status: 'processing' as const })));

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      // 添加视频文件
      videoClips.forEach((clip, index) => {
        formData.append(`video_${index}`, clip.file);
      });

      // 添加角色特征（JSON 格式）
      if (characterFeatures.length > 0) {
        formData.append('characterFeatures', JSON.stringify(characterFeatures));
      }

      const response = await fetch(`${API_URL}/video-clip-prompt/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `生成失败: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('生成结果:', data);

      // 更新状态
      if (data.success && data.results) {
        setVideoClips(prev => prev.map((clip, index) => {
          const result = data.results[index];
          if (result.status === 'success') {
            return {
              ...clip,
              status: 'success',
              prompt: result.prompt
            };
          } else {
            return {
              ...clip,
              status: 'error',
              error: result.error || '生成失败'
            };
          }
        }));

        alert('Prompt 生成完成！');
      } else {
        throw new Error('服务器返回格式错误');
      }

    } catch (error) {
      console.error('生成 Prompt 失败:', error);
      alert(error instanceof Error ? error.message : '生成失败，请重试');

      // 标记所有为错误
      setVideoClips(prev => prev.map(clip => ({
        ...clip,
        status: 'error',
        error: error instanceof Error ? error.message : '生成失败'
      })));
    } finally {
      setIsGenerating(false);
    }
  };

  // 复制单个 Prompt
  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    alert('已复制到剪贴板');
  };

  // 下载所有 Prompt 为 JSON
  const downloadAllPrompts = () => {
    const successClips = videoClips.filter(clip => clip.status === 'success' && clip.prompt);

    if (successClips.length === 0) {
      alert('没有可下载的 Prompt');
      return;
    }

    const jsonData = successClips.map(clip => clip.prompt);
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-clip-prompts-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 下载所有 Prompt 为 TXT（一行一个）
  const downloadAllPromptsTxt = () => {
    const successClips = videoClips.filter(clip => clip.status === 'success' && clip.prompt);

    if (successClips.length === 0) {
      alert('没有可下载的 Prompt');
      return;
    }

    const lines: string[] = [];
    successClips.forEach(clip => {
      if (clip.prompt) {
        lines.push(`[${clip.prompt.scene_id}] 中文: ${clip.prompt.prompts.chinese}`);
        lines.push(`[${clip.prompt.scene_id}] English: ${clip.prompt.prompts.english}`);
        lines.push(''); // 空行分隔
      }
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-clip-prompts-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Video className="w-8 h-8 text-blue-500" />
          视频片段生成 Prompt
        </h1>

        {/* 上传区域 */}
        <div className="mb-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">拖放视频文件到这里，或者</p>
            <button
              onClick={() => videoInputRef.current?.click()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Upload className="inline w-4 h-4 mr-2" />
              选择视频文件
            </button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => handleVideoSelect(e.target.files)}
            />
            <p className="text-sm text-gray-500 mt-2">支持 MP4, MOV 等格式，单个文件不超过 20MB</p>
          </div>
        </div>

        {/* 脚本选择器（上传视频后显示） */}
        {showScriptSelector && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">导入脚本角色特征</h3>
              </div>
              <button
                onClick={() => setShowScriptSelector(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* 脚本范围选择 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setScriptScope('mine')}
                  className={`px-3 py-1 rounded text-sm ${
                    scriptScope === 'mine'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  我的脚本
                </button>
                <button
                  onClick={() => setScriptScope('system')}
                  className={`px-3 py-1 rounded text-sm ${
                    scriptScope === 'system'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  系统脚本
                </button>
                <button
                  onClick={() => setScriptScope('both')}
                  className={`px-3 py-1 rounded text-sm ${
                    scriptScope === 'both'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  全部
                </button>
              </div>

              {/* 脚本下拉选择 */}
              <div className="flex gap-2">
                <select
                  value={selectedScriptId}
                  onChange={(e) => setSelectedScriptId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  disabled={loadingScripts}
                >
                  <option value="">
                    {loadingScripts ? '加载中...' : '请选择脚本'}
                  </option>
                  {scripts.map((script) => (
                    <option key={script.id} value={script.id}>
                      {script.name} ({script.category})
                    </option>
                  ))}
                </select>
                <button
                  onClick={importScriptData}
                  disabled={!selectedScriptId || loadingScripts}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  导入
                </button>
              </div>

              <p className="text-xs text-gray-600">
                将导入脚本的第四列（角色特征）并按顺序对应视频片段
              </p>
            </div>
          </div>
        )}

        {/* 已导入角色特征提示 */}
        {characterFeatures.length > 0 && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              ✓ 已导入 {characterFeatures.length} 个角色特征
              {videoClips.length > 0 && characterFeatures.length !== videoClips.length && (
                <span className="ml-2 text-orange-600">
                  （视频数量: {videoClips.length}，{characterFeatures.length > videoClips.length ? '将使用前' + videoClips.length + '个' : '部分视频无对应角色特征'}）
                </span>
              )}
            </p>
          </div>
        )}

        {/* 视频片段列表 */}
        {videoClips.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">视频片段列表 ({videoClips.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={generatePrompts}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    '开始生成 Prompt'
                  )}
                </button>
                <button
                  onClick={downloadAllPrompts}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  下载 JSON
                </button>
                <button
                  onClick={downloadAllPromptsTxt}
                  className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  下载 TXT
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {videoClips.map((clip, index) => (
                <div key={clip.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start gap-4">
                    {/* 视频预览 */}
                    <div className="flex-shrink-0">
                      <video
                        src={clip.preview}
                        className="w-40 h-24 object-cover rounded"
                        controls
                      />
                      <p className="text-xs text-gray-500 mt-1">{clip.file.name}</p>
                    </div>

                    {/* 信息和结果 */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{clip.sceneId}</span>
                        {clip.status === 'processing' && (
                          <span className="text-blue-500 flex items-center gap-1">
                            <Loader className="w-4 h-4 animate-spin" />
                            生成中...
                          </span>
                        )}
                        {clip.status === 'success' && (
                          <span className="text-green-500 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            成功
                          </span>
                        )}
                        {clip.status === 'error' && (
                          <span className="text-red-500 flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            失败: {clip.error}
                          </span>
                        )}
                      </div>

                      {characterFeatures[index] && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>角色特征:</strong> {characterFeatures[index]}
                        </p>
                      )}

                      {/* 显示生成的 Prompt */}
                      {clip.prompt && (
                        <div className="space-y-2">
                          <div className="bg-white p-3 rounded border">
                            <div className="flex justify-between items-start mb-1">
                              <strong className="text-sm">中文 Prompt:</strong>
                              <button
                                onClick={() => copyPrompt(clip.prompt!.prompts.chinese)}
                                className="text-blue-500 hover:text-blue-600"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-sm">{clip.prompt.prompts.chinese}</p>
                          </div>

                          <div className="bg-white p-3 rounded border">
                            <div className="flex justify-between items-start mb-1">
                              <strong className="text-sm">English Prompt:</strong>
                              <button
                                onClick={() => copyPrompt(clip.prompt!.prompts.english)}
                                className="text-blue-500 hover:text-blue-600"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-sm">{clip.prompt.prompts.english}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={() => removeClip(clip.id)}
                      className="text-red-500 hover:text-red-600"
                      disabled={isGenerating}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">使用说明：</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>上传多个视频片段（支持拖放或点击选择）</li>
            <li>上传后会弹出脚本选择框，从脚本库选择一个脚本</li>
            <li>点击"导入"提取脚本的第四列（角色特征）</li>
            <li>视频片段会按顺序对应角色特征（第1个视频对应第1行特征）</li>
            <li>点击"开始生成 Prompt"调用 Gemini Pro 分析视频</li>
            <li>生成完成后可以复制单个 Prompt 或批量下载 JSON/TXT</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default VideoClipPromptGenerator;
