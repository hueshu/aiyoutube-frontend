import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { API_URL } from '../config/api';
import { Image, Download, RefreshCw, Loader, Maximize2, Edit2, Save, X } from 'lucide-react';

interface ScriptFrame {
  id?: number;
  frame_number: number;
  scene_number: number;
  prompt: string;
  character?: string;
  action?: string;
  dialogue?: string;
  notes?: string;
  generated_image?: string;
  status?: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
}

interface GenerationTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
}


const StoryboardWorkspace: React.FC = () => {
  const { user, scripts, characters, fetchScripts, fetchCharacters } = useStore();
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [scriptFrames, setScriptFrames] = useState<ScriptFrame[]>([]);
  const [characterMapping, setCharacterMapping] = useState<Record<string, number>>({});
  const [imageSize, setImageSize] = useState<string>('');
  const [model, setModel] = useState<'sora_image' | 'gemini-2.5-flash-image-preview'>('sora_image');
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<GenerationTask | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatingFrames, setGeneratingFrames] = useState<Set<number>>(new Set());
  const [categoryFilters, setCategoryFilters] = useState<Record<string, string>>({});
  const [expandedCharPreview, setExpandedCharPreview] = useState<string | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load scripts and characters on mount
    const loadData = async () => {
      console.log('Loading scripts and characters...');
      await fetchScripts();
      await fetchCharacters();
      console.log('Data loaded');
    };
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.character-dropdown')) {
        setOpenDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Only run on mount

  useEffect(() => {
    if (selectedScriptId && scripts.length > 0) {
      parseScriptFrames();
    }
  }, [selectedScriptId, scripts.length]); // Remove characters dependency to avoid re-parsing

  const parseScriptFrames = () => {
    const script = scripts.find((s: any) => s.id === parseInt(selectedScriptId));
    if (!script) return;

    try {
      // Parse CSV with support for multi-line quoted content
      const csvContent = script.csv_content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = csvContent.split('\n');
      const frames: ScriptFrame[] = [];
      
      // Check if first line is header
      let currentIndex = 0;
      if (lines.length > 0) {
        const firstLine = lines[0].toLowerCase();
        if (firstLine.includes('序号') || 
            firstLine.includes('分镜') || 
            firstLine.includes('scene') ||
            firstLine.includes('描述') ||
            firstLine.includes('prompt') ||
            firstLine.includes('内容') ||
            (lines[0].split(',')[0] && isNaN(parseInt(lines[0].split(',')[0].trim())))) {
          currentIndex = 1;
        }
      }
      
      // Process lines with support for quoted multi-line content
      while (currentIndex < lines.length) {
        const line = lines[currentIndex].trim();
        if (!line) {
          currentIndex++;
          continue;
        }
        
        // Parse CSV line/lines properly handling quotes
        let inQuotes = false;
        let lineIdx = currentIndex;
        let currentLine = lines[lineIdx];
        
        // Check if line starts with a number (sequence)
        const firstComma = currentLine.indexOf(',');
        if (firstComma === -1) {
          currentIndex++;
          continue;
        }
        
        const sequenceStr = currentLine.substring(0, firstComma).trim();
        const seqNum = parseInt(sequenceStr);
        if (isNaN(seqNum)) {
          currentIndex++;
          continue;
        }
        
        // Parse the rest of the line(s) for the prompt
        let remainingContent = currentLine.substring(firstComma + 1);
        let prompt = '';
        
        // Handle quoted multi-line content
        if (remainingContent.trim().startsWith('"')) {
          inQuotes = true;
          remainingContent = remainingContent.trim().substring(1); // Remove starting quote
          
          // Continue reading until we find the closing quote
          while (lineIdx < lines.length) {
            for (let i = 0; i < remainingContent.length; i++) {
              const char = remainingContent[i];
              const nextChar = remainingContent[i + 1];
              
              if (char === '"' && nextChar === '"' && inQuotes) {
                prompt += '"';
                i++; // Skip next quote
              } else if (char === '"') {
                inQuotes = false;
                // Skip the rest of the line after closing quote
                remainingContent = remainingContent.substring(i + 1);
                break;
              } else {
                prompt += char;
              }
            }
            
            if (!inQuotes) break;
            
            // If still in quotes, add newline and continue with next line
            if (lineIdx + 1 < lines.length) {
              prompt += '\n';
              lineIdx++;
              remainingContent = lines[lineIdx];
            } else {
              break;
            }
          }
        } else {
          // Simple case: no quotes, just take the content
          prompt = remainingContent.trim();
        }
        
        // Extract character from prompt or remaining content
        let character = '';
        const charMatch = prompt.match(/角色[:：]?\s*([A-Za-z\u4e00-\u9fa5]+)/);
        if (charMatch) {
          character = charMatch[1];
        } else if (prompt.includes('角色A')) {
          character = '角色A';
        } else if (prompt.includes('角色B')) {
          character = '角色B';
        } else if (prompt.includes('角色C')) {
          character = '角色C';
        }
        
        frames.push({
          frame_number: seqNum,
          scene_number: Math.floor((seqNum - 1) / 10) + 1,
          prompt: prompt.trim(),
          character: character,
          status: 'pending'
        });
        
        currentIndex = lineIdx + 1;
      }
      
      setScriptFrames(frames);
      
      // Auto-detect unique characters
      const uniqueChars = [...new Set(frames.map(f => f.character).filter(Boolean))];
      const mapping: Record<string, number> = {};
      uniqueChars.forEach(char => {
        if (char) {
          const matchedChar = characters.find((c: any) => 
            c.name.toLowerCase().includes(char.toLowerCase()) || 
            char.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchedChar) {
            mapping[char] = matchedChar.id;
          }
        }
      });
      setCharacterMapping(mapping);
    } catch (error) {
      console.error('Failed to parse script:', error);
    }
  };

  const handleEditPrompt = (frameNumber: number) => {
    const frame = scriptFrames.find(f => f.frame_number === frameNumber);
    if (frame) {
      setEditingRow(frameNumber);
      setEditedPrompt(frame.prompt);
    }
  };

  const saveEditedPrompt = (frameNumber: number) => {
    setScriptFrames(prev => prev.map(frame => 
      frame.frame_number === frameNumber 
        ? { ...frame, prompt: editedPrompt }
        : frame
    ));
    setEditingRow(null);
    setEditedPrompt('');
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditedPrompt('');
  };

  const processPrompt = (frame: ScriptFrame): string => {
    let processedPrompt = frame.prompt;
    
    // Replace character placeholders with actual names
    if (frame.character && characterMapping[frame.character]) {
      const character = characters.find((c: any) => c.id === characterMapping[frame.character!]);
      if (character) {
        processedPrompt = processedPrompt.replace(/角色[A-Z]/g, character.name);
        processedPrompt = processedPrompt.replace(frame.character, character.name);
      }
    }
    
    // Add image size to prompt
    if (imageSize) {
      processedPrompt += ` ${imageSize}`;
    }
    
    return processedPrompt;
  };

  const generateSingleImage = async (frameNumber: number) => {
    const frame = scriptFrames.find(f => f.frame_number === frameNumber);
    if (!frame) return;

    setGeneratingFrames(prev => new Set(prev).add(frameNumber));
    
    try {
      const characterId = frame.character ? characterMapping[frame.character] : null;
      const processedPrompt = processPrompt(frame);
      
      const response = await fetch(`${API_URL}/generation/single`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: processedPrompt,
          character_id: characterId,
          image_size: imageSize.replace(/[\[\]]/g, ''),
          model: model
        })
      });

      if (response.ok) {
        const data = await response.json();
        setScriptFrames(prev => prev.map(f => 
          f.frame_number === frameNumber 
            ? { ...f, generated_image: data.image_url, status: 'completed' }
            : f
        ));
      } else {
        throw new Error('Generation failed');
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      setScriptFrames(prev => prev.map(f => 
        f.frame_number === frameNumber 
          ? { ...f, status: 'failed', error: 'Generation failed' }
          : f
      ));
    } finally {
      setGeneratingFrames(prev => {
        const newSet = new Set(prev);
        newSet.delete(frameNumber);
        return newSet;
      });
    }
  };

  const generateAllImages = async () => {
    if (!imageSize) {
      alert('请选择图片尺寸');
      return;
    }

    setLoading(true);
    
    try {
      // Create a project first
      const projectResponse = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `分镜生成 - ${new Date().toLocaleString()}`,
          script_id: parseInt(selectedScriptId),
          character_mapping: characterMapping,
          image_size: imageSize.replace(/[\[\]]/g, ''),
          model: model
        })
      });

      if (!projectResponse.ok) {
        throw new Error('Failed to create project');
      }

      const projectData = await projectResponse.json();
      
      // Start generation
      const response = await fetch(`${API_URL}/projects/${projectData.project.id}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentTask(data.task);
        pollTaskStatus(data.task.id);
      } else {
        throw new Error('Failed to start generation');
      }
    } catch (error) {
      console.error('Failed to start batch generation:', error);
      alert('批量生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/generation/task/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCurrentTask(data.task);
          
          if (data.task.status === 'completed') {
            clearInterval(interval);
            fetchGenerationResults(taskId);
          } else if (data.task.status === 'failed') {
            clearInterval(interval);
            alert('生成失败');
          }
        }
      } catch (error) {
        console.error('Failed to poll task status:', error);
        clearInterval(interval);
      }
    }, 2000);
  };

  const fetchGenerationResults = async (taskId: string) => {
    try {
      const response = await fetch(`${API_URL}/generation/results/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        
        // Update frames with generated images
        setScriptFrames(prev => prev.map(frame => {
          const result = results.find((r: any) => r.frame_number === frame.frame_number);
          if (result && result.success) {
            return { ...frame, generated_image: result.image_url, status: 'completed' };
          } else if (result && !result.success) {
            return { ...frame, status: 'failed', error: result.error };
          }
          return frame;
        }));
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const downloadImage = (imageUrl: string, frameNumber: number) => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `frame_${frameNumber}.jpg`;
    a.click();
  };

  const downloadAllImages = () => {
    const completedFrames = scriptFrames.filter(f => f.generated_image);
    completedFrames.forEach(frame => {
      if (frame.generated_image) {
        downloadImage(frame.generated_image, frame.frame_number);
      }
    });
  };

  const getCharacterName = (scriptChar: string): string => {
    const charId = characterMapping[scriptChar];
    if (!charId) return scriptChar;
    const character = characters.find((c: any) => c.id === charId);
    return character ? character.name : scriptChar;
  };

  return (
    <div className="space-y-6">
      {/* Script Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">分镜工作台</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">选择脚本</label>
            <select
              value={selectedScriptId}
              onChange={(e) => setSelectedScriptId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">选择脚本</option>
              {scripts && scripts.length > 0 ? (
                scripts.map((script: any) => {
                  console.log('Rendering script:', script);
                  return (
                    <option key={script.id} value={script.id}>
                      {script.name}
                    </option>
                  );
                })
              ) : (
                <option disabled>加载中...</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">图片尺寸 *</label>
            <select
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">请选择尺寸</option>
              <option value="[16:9]">[16:9]</option>
              <option value="[3:2]">[3:2]</option>
              <option value="[1:1]">[1:1]</option>
              <option value="[9:16]">[9:16]</option>
              <option value="[2:3]">[2:3]</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">AI模型</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as any)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="sora_image">Sora Image</option>
              <option value="gemini-2.5-flash-image-preview">Gemini 2.5 Flash</option>
            </select>
          </div>
        </div>
      </div>

      {/* Character Mapping */}
      {selectedScriptId && scriptFrames.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">角色映射</h3>
          <div className="space-y-4">
            {[...new Set(scriptFrames.map(f => f.character).filter(Boolean))].map(scriptChar => {
              // Get unique categories for characters
              const categories = [...new Set(characters.map((c: any) => c.category || '未分类'))];
              const currentCategory = categoryFilters[scriptChar!] || '全部';
              
              // Filter characters by selected category
              const filteredCharacters = currentCategory === '全部' 
                ? characters 
                : characters.filter((c: any) => (c.category || '未分类') === currentCategory);
              
              const selectedCharacter = characters.find((c: any) => c.id === characterMapping[scriptChar!]);
              
              return (
                <div key={scriptChar} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    {/* Script Character Name */}
                    <div className="flex-shrink-0 w-24">
                      <span className="text-sm font-medium text-gray-700">{scriptChar}</span>
                    </div>
                    
                    {/* Category Filter */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-500">分类：</label>
                        <select
                          value={currentCategory}
                          onChange={(e) => setCategoryFilters(prev => ({
                            ...prev,
                            [scriptChar!]: e.target.value
                          }))}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="全部">全部分类</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Character Selection with Preview */}
                      <div className="relative character-dropdown">
                        <button
                          type="button"
                          onClick={() => setOpenDropdowns(prev => ({
                            ...prev,
                            [scriptChar!]: !prev[scriptChar!]
                          }))}
                          className="w-full border rounded px-3 py-2 text-left flex items-center justify-between bg-white hover:bg-gray-50"
                        >
                          <span>
                            {selectedCharacter ? selectedCharacter.name : '选择角色'}
                          </span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* Custom Dropdown with Images - Horizontal Grid Layout */}
                        {openDropdowns[scriptChar!] && (
                          <div className="absolute z-10 mt-1 min-w-[400px] bg-white border rounded-md shadow-lg max-h-80 overflow-y-auto p-2">
                            <div
                              className="mb-2 px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                              onClick={() => {
                                setCharacterMapping(prev => ({
                                  ...prev,
                                  [scriptChar!]: 0
                                }));
                                setOpenDropdowns(prev => ({
                                  ...prev,
                                  [scriptChar!]: false
                                }));
                              }}
                            >
                              <span className="text-gray-500">清除选择</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {filteredCharacters.map((char: any) => (
                                <div
                                  key={char.id}
                                  className="flex flex-col items-center p-2 hover:bg-gray-100 cursor-pointer rounded"
                                  onClick={() => {
                                    setCharacterMapping(prev => ({
                                      ...prev,
                                      [scriptChar!]: char.id
                                    }));
                                    setOpenDropdowns(prev => ({
                                      ...prev,
                                      [scriptChar!]: false
                                    }));
                                  }}
                                >
                                  <img
                                    src={char.image_url}
                                    alt={char.name}
                                    className="w-16 h-20 object-cover rounded mb-1"
                                    style={{ objectFit: 'contain', backgroundColor: '#f9fafb' }}
                                  />
                                  <div className="text-xs text-center font-medium truncate w-full">
                                    {char.name}
                                  </div>
                                  {char.category && (
                                    <div className="text-xs text-gray-400 text-center truncate w-full">
                                      {char.category}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Character Preview */}
                    {selectedCharacter && (
                      <div className="flex-shrink-0">
                        <div className="relative group">
                          <img
                            src={selectedCharacter.image_url}
                            alt={selectedCharacter.name}
                            className="w-20 h-28 object-cover rounded cursor-pointer hover:shadow-lg transition-shadow"
                            style={{ objectFit: 'contain', backgroundColor: '#f3f4f6' }}
                            onClick={() => setExpandedCharPreview(selectedCharacter.image_url)}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100 rounded">
                            <Maximize2 className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <p className="text-xs text-center mt-1 text-gray-600">{selectedCharacter.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Storyboard Table */}
      {selectedScriptId && scriptFrames.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">分镜表格</h3>
            <div className="space-x-2">
              <button
                onClick={generateAllImages}
                disabled={loading || !imageSize}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '生成中...' : '批量生成分镜图'}
              </button>
              {scriptFrames.some(f => f.generated_image) && (
                <button
                  onClick={downloadAllImages}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  下载全部
                </button>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          {currentTask && (
            <div className="p-4 border-b bg-blue-50">
              <div className="flex justify-between text-sm mb-2">
                <span>生成进度</span>
                <span>{currentTask.progress} / {currentTask.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentTask.progress / currentTask.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">序号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[300px]">脚本文案</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">角色名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">生成的图片</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {scriptFrames.map((frame) => (
                  <tr key={frame.frame_number} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm">{frame.frame_number}</td>
                    <td className="px-4 py-4">
                      {editingRow === frame.frame_number ? (
                        <div className="flex items-start space-x-2">
                          <textarea
                            value={editedPrompt}
                            onChange={(e) => setEditedPrompt(e.target.value)}
                            className="flex-1 border rounded px-2 py-1 text-sm resize-none leading-relaxed"
                            rows={4}
                            autoFocus
                          />
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => saveEditedPrompt(frame.frame_number)}
                              className="text-green-500 hover:text-green-700"
                              title="保存"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-red-500 hover:text-red-700"
                              title="取消"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start space-x-2 group">
                          <div className="flex-1">
                            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {frame.prompt}
                            </div>
                          </div>
                          <button
                            onClick={() => handleEditPrompt(frame.frame_number)}
                            className="text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {frame.character ? getCharacterName(frame.character) : '-'}
                    </td>
                    <td className="px-4 py-4">
                      {generatingFrames.has(frame.frame_number) ? (
                        <div className="flex items-center justify-center w-20 h-20">
                          <Loader className="w-6 h-6 animate-spin text-blue-500" />
                        </div>
                      ) : frame.generated_image ? (
                        <div className="relative group">
                          <img
                            src={frame.generated_image}
                            alt={`Frame ${frame.frame_number}`}
                            className="w-20 h-20 object-cover rounded cursor-pointer"
                            onClick={() => setPreviewImage(frame.generated_image!)}
                          />
                          <button
                            onClick={() => setPreviewImage(frame.generated_image!)}
                            className="absolute inset-0 bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
                          >
                            <Maximize2 className="w-6 h-6" />
                          </button>
                        </div>
                      ) : frame.status === 'failed' ? (
                        <div className="text-red-500 text-xs">生成失败</div>
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => generateSingleImage(frame.frame_number)}
                          disabled={generatingFrames.has(frame.frame_number) || !imageSize}
                          className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
                          title="重新生成"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        {frame.generated_image && (
                          <button
                            onClick={() => downloadImage(frame.generated_image!, frame.frame_number)}
                            className="text-green-500 hover:text-green-700"
                            title="下载"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Character Preview Modal */}
      {expandedCharPreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedCharPreview(null)}
        >
          <div className="relative max-w-2xl max-h-full">
            <img
              src={expandedCharPreview}
              alt="Character Preview"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setExpandedCharPreview(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryboardWorkspace;