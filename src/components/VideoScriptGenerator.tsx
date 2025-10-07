import React, { useState, useEffect } from 'react';
import { Upload, Download, Copy, Loader, Check, BookOpen } from 'lucide-react';
import { API_URL } from '../config/api';

interface ImageFile {
  id: string;
  name: string;
  file: File;
  preview: string;
}

interface Script {
  id: number;
  title: string;
  content: string;
  scope: string;
}

const GEMINI_API_KEY = 'AIzaSyDwD04ZVY2ff7nWdjZNTJK4sgy5nyYwbLA';

// System prompt from 生成视频脚本prompt.md
const SYSTEM_PROMPT = `# 分镜创作规范指导

## 一、分镜基本原则

### 核心概念
分镜是**单一静态画面**的精确描述，捕捉某个瞬间的定格状态，而非连续动作或过程。

### 基础格式模板（单个角色）
\`\`\`
[主体]
角色：角色A
表情：眼睛瞪大，嘴巴微张
动作：手指悬停在键盘上方，身体前倾
[环境]
咖啡店角落，墙上挂着油画，桌上咖啡冒着热气
[时间]
下午3点
[天气]
雨天
[视角]
平视
[景别]
中景
\`\`\`

## 主体描述的正确示例

**单行描述时**
\`\`\`
表情：角色A震惊眼睛瞪大嘴巴张开，角色B愤怒眉头紧锁拳头握紧
\`\`\`

### ✅ 正确示例
\`\`\`
表情：惊恐，眼睛瞪大，嘴巴张开
表情：担心，眉头紧锁，咬着下唇
\`\`\`

## 十四、CSV输出格式规范

### CSV文件结构（三列格式）
\`\`\`csv
分镜数,分镜提示词,动态过程描述
1,"[主体]
角色：角色A
表情：愤怒，眼睛圆睁，牙关紧咬
姿态：手掌举在头侧最高点，身体后仰，重心在后脚
[环境]
角色A站在办公桌前，桌上文件凌乱，咖啡杯在桌边
[时间]
晚上8点
[天气]
室内
[视角]
平视
[景别]
中景","角色A手掌狠狠拍向桌面，身体前倾，桌子剧烈震动，咖啡杯倒下洒满文件，表情从愤怒转为后悔"
\`\`\`

你必须严格按照CSV格式输出，包含三列：分镜数,分镜提示词,动态过程描述。
每个分镜一行，分镜提示词和动态过程描述都用双引号包裹。
不要添加任何额外的解释或说明，只输出CSV格式的内容。`;

const VideoScriptGenerator: React.FC = () => {
  const [promptDocument, setPromptDocument] = useState<string>('');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [supplementPrompt, setSupplementPrompt] = useState<string>('');
  const [csvOutput, setCsvOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedState, setCopiedState] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Script library states
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [scriptScope, setScriptScope] = useState<'mine' | 'system' | 'both'>('both');
  const [showScriptSelector, setShowScriptSelector] = useState(false);

  // Update supplement prompt when images change
  useEffect(() => {
    if (images.length > 0) {
      setSupplementPrompt(`一共${images.length}个分镜。`);
    }
  }, [images.length]);

  // Load scripts from library
  const loadScripts = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingScripts(true);
    try {
      let url = `${API_URL}/scripts`;
      if (scriptScope !== 'both') {
        url += `?scope=${scriptScope}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setScripts(data);
      }
    } catch (error) {
      console.error('Failed to load scripts:', error);
    } finally {
      setLoadingScripts(false);
    }
  };

  useEffect(() => {
    if (showScriptSelector) {
      loadScripts();
    }
  }, [showScriptSelector, scriptScope]);

  // Import script
  const handleImportScript = () => {
    const selected = scripts.find(s => s.id === parseInt(selectedScriptId));
    if (selected) {
      setPromptDocument(selected.content);
      setShowScriptSelector(false);
      alert('脚本导入成功！');
    }
  };

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const newImages: ImageFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      file,
      preview: URL.createObjectURL(file)
    }));

    // Sort by filename
    const sortedImages = [...images, ...newImages].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    setImages(sortedImages);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Remove image
  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Generate script
  const handleGenerate = async () => {
    if (!promptDocument.trim()) {
      alert('请先输入或导入prompt文档');
      return;
    }

    if (images.length === 0) {
      alert('请至少上传一张图片');
      return;
    }

    setIsProcessing(true);
    setCsvOutput('');

    try {
      // Step 1: Send prompt document to establish context
      const contextResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: [
              {
                parts: [{ text: promptDocument }]
              }
            ]
          })
        }
      );

      if (!contextResponse.ok) {
        throw new Error('Failed to send context');
      }

      // Step 2: Send all images with supplement prompt
      const imageParts = await Promise.all(
        images.map(async (img) => ({
          inline_data: {
            mime_type: img.file.type,
            data: await fileToBase64(img.file)
          }
        }))
      );

      const generateResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: [
              {
                parts: [{ text: promptDocument }]
              },
              {
                parts: [
                  { text: supplementPrompt },
                  ...imageParts
                ]
              }
            ]
          })
        }
      );

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.error?.message || 'Generation failed');
      }

      const data = await generateResponse.json();
      const text = data.candidates[0].content.parts[0].text;

      // Clean up the response (remove markdown code blocks if any)
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```csv')) {
        cleanedText = cleanedText.replace(/```csv\n?/, '').replace(/```$/, '').trim();
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/, '').replace(/```$/, '').trim();
      }

      setCsvOutput(cleanedText);
      alert('生成成功！');
    } catch (error) {
      console.error('Generation error:', error);
      alert('生成失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(csvOutput);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  // Download CSV
  const downloadCSV = () => {
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video_script_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            生成视频脚本
          </h1>
          <p className="text-gray-600">
            上传图片批量生成分镜脚本（CSV格式）
          </p>
        </div>

        {/* Step 1: Prompt Document */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              第一步：输入Prompt文档
            </h2>
            <button
              onClick={() => setShowScriptSelector(!showScriptSelector)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <BookOpen className="w-4 h-4" />
              <span>从脚本库导入</span>
            </button>
          </div>

          {/* Script Selector */}
          {showScriptSelector && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="scope-mine"
                    checked={scriptScope === 'mine'}
                    onChange={() => setScriptScope('mine')}
                    className="w-4 h-4"
                  />
                  <label htmlFor="scope-mine" className="text-sm">我的脚本</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="scope-system"
                    checked={scriptScope === 'system'}
                    onChange={() => setScriptScope('system')}
                    className="w-4 h-4"
                  />
                  <label htmlFor="scope-system" className="text-sm">系统脚本</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="scope-both"
                    checked={scriptScope === 'both'}
                    onChange={() => setScriptScope('both')}
                    className="w-4 h-4"
                  />
                  <label htmlFor="scope-both" className="text-sm">全部</label>
                </div>
              </div>

              <select
                value={selectedScriptId}
                onChange={(e) => setSelectedScriptId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 mb-4"
                disabled={loadingScripts}
              >
                <option value="">选择脚本</option>
                {scripts.map(script => (
                  <option key={script.id} value={script.id}>
                    {script.title} ({script.scope === 'system' ? '系统' : '我的'})
                  </option>
                ))}
              </select>

              <button
                onClick={handleImportScript}
                disabled={!selectedScriptId || loadingScripts}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {loadingScripts ? '加载中...' : '导入选中脚本'}
              </button>
            </div>
          )}

          <textarea
            value={promptDocument}
            onChange={(e) => setPromptDocument(e.target.value)}
            placeholder="在此输入或从脚本库导入prompt文档..."
            className="w-full h-64 border rounded-md p-4 font-mono text-sm resize-none"
          />
        </div>

        {/* Step 2: Upload Images */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            第二步：上传图片（自动按文件名排序）
          </h2>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">点击上传或拖拽图片到此处</p>
              <p className="text-sm text-gray-400 mt-2">支持多张图片批量上传</p>
            </label>
          </div>

          {/* Image List */}
          {images.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-4">已上传 {images.length} 张图片</p>
              <div className="grid grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.preview}
                      alt={img.name}
                      className="w-full h-32 object-cover rounded-md border"
                    />
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      删除
                    </button>
                    <p className="text-xs text-gray-600 mt-1 truncate">{img.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Supplement Prompt */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            第三步：补充Prompt
          </h2>
          <input
            type="text"
            value={supplementPrompt}
            onChange={(e) => setSupplementPrompt(e.target.value)}
            placeholder="例如：一共5个分镜。"
            className="w-full border rounded-md px-4 py-2"
          />
          <p className="text-sm text-gray-500 mt-2">
            * 图片数量变化时会自动更新
          </p>
        </div>

        {/* Generate Button */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={handleGenerate}
            disabled={isProcessing || !promptDocument.trim() || images.length === 0}
            className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <span>生成视频脚本（CSV格式）</span>
            )}
          </button>
        </div>

        {/* CSV Output */}
        {csvOutput && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                CSV输出结果
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  {copiedState ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedState ? '已复制' : '复制'}</span>
                </button>
                <button
                  onClick={downloadCSV}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  <Download className="w-4 h-4" />
                  <span>下载CSV</span>
                </button>
              </div>
            </div>
            <textarea
              value={csvOutput}
              readOnly
              className="w-full h-96 border rounded-md p-4 font-mono text-sm resize-none bg-gray-50"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoScriptGenerator;
