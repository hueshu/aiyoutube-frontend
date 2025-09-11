import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { API_URL } from '../config/api';
import { Image, Download, RefreshCw, Loader, Maximize2, Edit2, Save, X, Send, ChevronLeft, ChevronRight } from 'lucide-react';

interface ScriptFrame {
  id?: number;
  frame_number: number;
  scene_number: number;
  prompt: string;
  originalPrompt?: string;  // Store original prompt before replacement
  charactersInFrame?: string[];  // Store characters found in this frame
  character?: string;
  action?: string;
  dialogue?: string;
  notes?: string;
  generated_image?: string;  // Current displayed image
  generated_images?: string[];  // History of all generated images
  status?: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  progress?: string; // Add progress field for showing generation status
}

const StoryboardWorkspace: React.FC = () => {
  const { user, scripts, characters, fetchScripts, fetchCharacters } = useStore();
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [scriptFrames, setScriptFrames] = useState<ScriptFrame[]>([]);
  const [characterMapping, setCharacterMapping] = useState<Record<string, number>>({});
  const [imageSize, setImageSize] = useState<string>('');
  const [model, setModel] = useState<'sora_image' | 'gemini-2.5-flash-image-preview'>('sora_image');
  const [loading, setLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentFrame: number } | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatingFrames, setGeneratingFrames] = useState<Set<number>>(new Set());
  const [categoryFilters, setCategoryFilters] = useState<Record<string, string>>({});
  const [expandedCharPreview, setExpandedCharPreview] = useState<string | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [originalScriptFrames, setOriginalScriptFrames] = useState<ScriptFrame[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<number, number>>({});

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
        
        // Extract all characters in this frame
        const charactersInFrame = extractCharactersFromPrompt(prompt);
        
        frames.push({
          frame_number: seqNum,
          scene_number: Math.floor((seqNum - 1) / 10) + 1,
          prompt: prompt.trim(),
          originalPrompt: prompt.trim(),  // Save original prompt
          charactersInFrame: charactersInFrame,  // Save characters list
          character: character,
          status: 'pending'
        });
        
        currentIndex = lineIdx + 1;
      }
      
      // Ensure each frame has originalPrompt saved
      const framesWithOriginal = frames.map(frame => ({
        ...frame,
        originalPrompt: frame.originalPrompt || frame.prompt,
        charactersInFrame: frame.charactersInFrame || extractCharactersFromPrompt(frame.prompt)
      }));
      
      setScriptFrames(framesWithOriginal);
      // Save original frames for reset functionality
      setOriginalScriptFrames(JSON.parse(JSON.stringify(framesWithOriginal)));
      
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
      // Use the display prompt (with character names replaced) for editing
      setEditedPrompt(getDisplayPrompt(frame));
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

  // Get display text with character names replaced
  const getDisplayPrompt = (frame: ScriptFrame): string => {
    let displayPrompt = frame.prompt;
    const promptToCheck = frame.originalPrompt || frame.prompt;
    const charactersInPrompt = extractCharactersFromPrompt(promptToCheck);
    
    charactersInPrompt.forEach(scriptChar => {
      const charId = characterMapping[scriptChar];
      if (charId && charId !== 0) {
        const character = characters.find((c: any) => c.id === charId);
        if (character && character.name) {
          // Replace both standalone and after "角色："
          const regex1 = new RegExp(`\\b${scriptChar}\\b`, 'g');
          displayPrompt = displayPrompt.replace(regex1, character.name);
          const regex2 = new RegExp(`(角色[：:])\\s*${scriptChar}\\b`, 'g');
          displayPrompt = displayPrompt.replace(regex2, `$1${character.name}`);
        }
      }
    });
    
    return displayPrompt;
  };

  const processPrompt = (frame: ScriptFrame): string => {
    // Use the display prompt (with replacements) which may have been edited by user
    let processedPrompt = getDisplayPrompt(frame);
    
    // Add image size to prompt on a new line
    if (imageSize) {
      processedPrompt += `\n${imageSize}`;
    }
    
    // Add character name instruction on a new line
    processedPrompt += '\n角色的参考图就是图片文件名与角色名称一样的图片';
    
    return processedPrompt;
  };

  const generateSingleImage = async (frameNumber: number) => {
    // Check if user is logged in
    if (!user || !user.token) {
      alert('请先登录');
      return;
    }

    const frame = scriptFrames.find(f => f.frame_number === frameNumber);
    if (!frame) return;

    setGeneratingFrames(prev => new Set(prev).add(frameNumber));
    
    try {
      const processedPrompt = processPrompt(frame);
      
      // Use originalPrompt if available, otherwise use current prompt
      const promptToCheck = frame.originalPrompt || frame.prompt;
      
      // Get all characters in the prompt and their mapped IDs/images
      const charactersInPrompt = extractCharactersFromPrompt(promptToCheck);
      console.log('Original frame prompt:', promptToCheck);
      console.log('Processed prompt to submit:', processedPrompt);
      console.log('Extracted characters:', charactersInPrompt);
      console.log('Character mapping:', characterMapping);
      
      // Collect all character images as an array
      const characterImageUrls: string[] = [];
      
      // Only collect images for characters that appear in this frame's prompt
      charactersInPrompt.forEach(scriptChar => {
        const charId = characterMapping[scriptChar];
        console.log(`Checking mapping for "${scriptChar}":`, charId);
        if (charId && charId !== 0) {
          const character = characters.find((c: any) => c.id === charId);
          if (character && character.image_url) {
            // Add the image URL to the array
            characterImageUrls.push(character.image_url);
            console.log(`Added character image for "${scriptChar}":`, character.image_url);
          } else {
            console.log(`No character found with ID ${charId} for "${scriptChar}"`);
          }
        } else {
          console.log(`No mapping found for "${scriptChar}"`);
        }
      });
      
      console.log('Character image URLs to send:', characterImageUrls);
      
      // Create AbortController with 10 minute timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 minutes
      
      // Prepare request body based on whether we have character images
      const requestBody: any = {
        prompt: processedPrompt,
        image_size: imageSize,  // Keep brackets for image size
        model: model
      };
      
      // Add character images if available
      if (characterImageUrls.length > 0) {
        requestBody.character_image_urls = characterImageUrls;  // Send as array
      }
      
      console.log('Request body:', requestBody);
      
      const response = await fetch(`${API_URL}/generation/single`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      const data = await response.json();
      console.log('Response data:', data);
      
      // Check if it's a completed Gemini response (sync mode with image_url and status: 'completed')
      if (response.status === 200 && data.image_url && data.status === 'completed') {
        // Gemini sync mode success - directly use the image URL
        console.log('Gemini generation completed immediately with image:', data.image_url);
        setScriptFrames(prev => prev.map(f => {
          if (f.frame_number === frameNumber) {
            const existingImages = f.generated_images || [];
            const updatedImages = [...existingImages, data.image_url];
            return { 
              ...f, 
              generated_image: data.image_url,
              generated_images: updatedImages,
              status: 'completed' 
            };
          }
          return f;
        }));
        // Clear generating state for sync mode
        setGeneratingFrames(prev => {
          const newSet = new Set(prev);
          newSet.delete(frameNumber);
          return newSet;
        });
      } else if (response.status === 202 && data.task_id) {
        // Async mode - poll for status (Sora and other models)
        console.log('Generation started, task ID:', data.task_id);
        pollGenerationStatus(frameNumber, data.task_id);
        return; // Important: return here to avoid executing finally block
      } else if (response.status === 200 && data.image_url) {
        // Other sync mode success cases
        setScriptFrames(prev => prev.map(f => {
          if (f.frame_number === frameNumber) {
            const existingImages = f.generated_images || [];
            const updatedImages = [...existingImages, data.image_url];
            return { 
              ...f, 
              generated_image: data.image_url,
              generated_images: updatedImages,
              status: 'completed' 
            };
          }
          return f;
        }));
        // Clear generating state for sync mode
        setGeneratingFrames(prev => {
          const newSet = new Set(prev);
          newSet.delete(frameNumber);
          return newSet;
        });
      } else {
        // Unexpected response or error
        const errorMsg = data?.error || `Unexpected response status ${response.status}`;
        console.error('Generation error:', errorMsg, 'Full response:', data);
        setScriptFrames(prev => prev.map(f => 
          f.frame_number === frameNumber 
            ? { ...f, status: 'failed', error: errorMsg }
            : f
        ));
        // Clear generating state on error
        setGeneratingFrames(prev => {
          const newSet = new Set(prev);
          newSet.delete(frameNumber);
          return newSet;
        });
      }
    } catch (error) {
      // Handle timeout and other errors
      console.error('Caught error in generation:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timeout after 10 minutes');
        setScriptFrames(prev => prev.map(f => 
          f.frame_number === frameNumber 
            ? { ...f, status: 'failed', error: '请求超时（10分钟）' }
            : f
        ));
      } else {
        console.error('Failed to generate image:', error);
        setScriptFrames(prev => prev.map(f => 
          f.frame_number === frameNumber 
            ? { ...f, status: 'failed', error: error instanceof Error ? error.message : 'Generation failed' }
            : f
        ));
      }
      // Clear generating state on exception
      setGeneratingFrames(prev => {
        const newSet = new Set(prev);
        newSet.delete(frameNumber);
        return newSet;
      });
    }
  };


  // Poll for generation status
  const pollGenerationStatus = async (frameNumber: number, taskId: string) => {
    const maxAttempts = 60; // Poll for up to 10 minutes (10s intervals)
    let attempts = 0;
    
    const pollInterval = setInterval(async () => {
      try {
        attempts++;
        
        // Update frame with attempt count to show progress
        setScriptFrames(prev => prev.map(f => 
          f.frame_number === frameNumber 
            ? { ...f, status: 'generating', progress: `正在生成... (第${attempts}次检查)` }
            : f
        ));
        
        const response = await fetch(`${API_URL}/generation/status/${taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to get status');
        }
        
        const data = await response.json();
        console.log(`Frame ${frameNumber} status check ${attempts}:`, data.task?.status);
        
        if (data.task?.status === 'completed' && data.task?.image_url) {
          // Success!
          clearInterval(pollInterval);
          console.log(`Frame ${frameNumber} completed with image:`, data.task.image_url);
          setScriptFrames(prev => prev.map(f => {
            if (f.frame_number === frameNumber) {
              const existingImages = f.generated_images || [];
              // Add new image to history
              const updatedImages = [...existingImages, data.task.image_url];
              return { 
                ...f, 
                generated_image: data.task.image_url,  // Set as current image
                generated_images: updatedImages,  // Store in history
                status: 'completed', 
                progress: undefined 
              };
            }
            return f;
          }));
          
          // Remove from generating set
          setGeneratingFrames(prev => {
            const newSet = new Set(prev);
            newSet.delete(frameNumber);
            return newSet;
          });
        } else if (data.task?.status === 'failed') {
          // Failed
          clearInterval(pollInterval);
          const errorMsg = data.task.error || 'Generation failed';
          console.error(`Frame ${frameNumber} failed:`, errorMsg);
          setScriptFrames(prev => prev.map(f => 
            f.frame_number === frameNumber 
              ? { ...f, status: 'failed', error: errorMsg, progress: undefined }
              : f
          ));
          
          // Remove from generating set
          setGeneratingFrames(prev => {
            const newSet = new Set(prev);
            newSet.delete(frameNumber);
            return newSet;
          });
        } else if (attempts >= maxAttempts) {
          // Timeout after max attempts
          clearInterval(pollInterval);
          console.error(`Frame ${frameNumber} timeout after ${attempts} attempts`);
          setScriptFrames(prev => prev.map(f => 
            f.frame_number === frameNumber 
              ? { ...f, status: 'failed', error: `生成超时（检查了${attempts}次）`, progress: undefined }
              : f
          ));
          
          // Remove from generating set
          setGeneratingFrames(prev => {
            const newSet = new Set(prev);
            newSet.delete(frameNumber);
            return newSet;
          });
        }
        // Otherwise continue polling...
      } catch (error) {
        clearInterval(pollInterval);
        console.error('Polling error:', error);
        setScriptFrames(prev => prev.map(f => 
          f.frame_number === frameNumber 
            ? { ...f, status: 'failed', error: '获取状态失败', progress: undefined }
            : f
        ));
        
        // Remove from generating set
        setGeneratingFrames(prev => {
          const newSet = new Set(prev);
          newSet.delete(frameNumber);
          return newSet;
        });
      }
    }, 10000); // Poll every 10 seconds
  };

  // Helper function to poll for task result
  const pollForTaskResult = async (taskId: string, maxAttempts = 60): Promise<string | null> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${API_URL}/generation/status/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Polling attempt ${attempt + 1} for task ${taskId}:`, data);
          
          // Handle the nested task object structure
          const task = data.task || data;
          
          if (task.status === 'completed' && task.image_url) {
            console.log(`Task ${taskId} completed with image:`, task.image_url);
            return task.image_url;
          } else if (task.status === 'failed') {
            console.error(`Task ${taskId} failed:`, task.error);
            return null;
          }
          // If still processing, wait before next attempt
          console.log(`Task ${taskId} still processing, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        } else {
          console.error(`Failed to poll task ${taskId}: ${response.status}`);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          return null;
        }
      } catch (error) {
        console.error(`Error polling task ${taskId}:`, error);
        return null;
      }
    }
    console.error(`Task ${taskId} timed out after ${maxAttempts} attempts`);
    return null;
  };

  const generateAllImages = async () => {
    // Check if user is logged in
    if (!user || !user.token) {
      alert('请先登录');
      return;
    }

    if (!imageSize) {
      alert('请选择图片尺寸');
      return;
    }

    // Check if there are any frames to generate
    const framesToGenerate = scriptFrames.filter(f => !f.generated_images || f.generated_images.length === 0);
    if (framesToGenerate.length === 0) {
      alert('所有分镜都已生成图片');
      return;
    }

    setLoading(true);
    
    try {
      // Convert character mapping from IDs to image URLs
      const characterImages: Record<string, string> = {};
      Object.entries(characterMapping).forEach(([scriptChar, charId]) => {
        if (charId && charId !== 0) {
          const character = characters.find((c: any) => c.id === charId);
          if (character && character.image_url) {
            characterImages[scriptChar] = character.image_url;
          }
        }
      });
      
      console.log('Starting batch generation for', framesToGenerate.length, 'frames');
      console.log('Character images:', characterImages);
      console.log('Image size:', imageSize);
      console.log('Model:', model);
      
      // Set initial batch progress
      setBatchProgress({ current: 0, total: framesToGenerate.length, currentFrame: 0 });
      
      // Step 1: Submit all generation requests at once
      console.log('Submitting all generation requests...');
      const taskPromises = framesToGenerate.map(async (frame) => {
        try {
          const processedPrompt = processPrompt(frame);
          console.log(`Submitting frame ${frame.frame_number} with prompt:`, processedPrompt);
          
          // Get all character images for this specific frame
          const promptToCheck = frame.originalPrompt || frame.prompt;
          const charactersInFrame = extractCharactersFromPrompt(promptToCheck);
          const frameCharacterImageUrls: string[] = [];
          
          // Collect images for all characters in this frame as an array
          charactersInFrame.forEach(scriptChar => {
            if (characterImages[scriptChar]) {
              frameCharacterImageUrls.push(characterImages[scriptChar]);
              console.log(`Frame ${frame.frame_number} using character image for ${scriptChar}:`, characterImages[scriptChar]);
            }
          });
          
          console.log(`Frame ${frame.frame_number} character image URLs:`, frameCharacterImageUrls);
          
          setGeneratingFrames(prev => new Set(prev).add(frame.frame_number));
          setScriptFrames(prev => prev.map(f => 
            f.frame_number === frame.frame_number 
              ? { ...f, status: 'generating', progress: '提交中...' }
              : f
          ));
          
          const response = await fetch(`${API_URL}/generation/single`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user?.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              prompt: processedPrompt,
              character_image_urls: frameCharacterImageUrls.length > 0 ? frameCharacterImageUrls : undefined,  // Send as array if not empty
              image_size: imageSize,  // Keep brackets
              model: model
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to submit frame ${frame.frame_number}: ${response.status} - ${errorText}`);
            throw new Error(`Submit failed: ${response.status}`);
          }
          
          const data = await response.json();
          if (data.task_id) {
            console.log(`Frame ${frame.frame_number} submitted with task ID: ${data.task_id}`);
            setScriptFrames(prev => prev.map(f => 
              f.frame_number === frame.frame_number 
                ? { ...f, progress: '已提交，等待生成...' }
                : f
            ));
            return { frame_number: frame.frame_number, task_id: data.task_id };
          } else {
            throw new Error('No task_id in response');
          }
        } catch (error) {
          console.error(`Failed to submit frame ${frame.frame_number}:`, error);
          setScriptFrames(prev => prev.map(f => 
            f.frame_number === frame.frame_number 
              ? { ...f, status: 'failed', progress: '提交失败' }
              : f
          ));
          setGeneratingFrames(prev => {
            const newSet = new Set(prev);
            newSet.delete(frame.frame_number);
            return newSet;
          });
          return { frame_number: frame.frame_number, error: error };
        }
      });
      
      // Wait for all submissions to complete
      const submissions = await Promise.all(taskPromises);
      const successfulSubmissions = submissions.filter(s => s && 'task_id' in s) as Array<{frame_number: number, task_id: string}>;
      console.log(`Submitted ${successfulSubmissions.length} of ${framesToGenerate.length} frames`);
      
      // Step 2: Poll all tasks using batch status API for better performance
      if (successfulSubmissions.length > 0) {
        console.log('Starting batch polling for all tasks...');
        
        // Use batch polling instead of individual polling
        await pollBatchTasks(successfulSubmissions);
      }
    } catch (error) {
      console.error('Batch generation error:', error);
      alert('批量生成失败');
    } finally {
      setLoading(false);
      setBatchProgress(null);
    }
  };
  
  // New batch polling function
  const pollBatchTasks = async (submissions: Array<{frame_number: number, task_id: string}>) => {
    const maxAttempts = 60;
    let attempts = 0;
    let completedCount = 0;
    let failedCount = 0;
    
    const taskMap = new Map(submissions.map(s => [s.task_id, s.frame_number]));
    const pendingTasks = new Set(submissions.map(s => s.task_id));
    
    while (pendingTasks.size > 0 && attempts < maxAttempts) {
      attempts++;
      console.log(`Batch poll attempt ${attempts}/${maxAttempts}, pending: ${pendingTasks.size}`);
      
      try {
        // Use batch status API
        const response = await fetch(`${API_URL}/generation/status/batch`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ taskIds: Array.from(pendingTasks) })
        });
        
        if (!response.ok) {
          // Fall back to individual polling
          console.warn('Batch API failed, falling back to individual polling');
          const pollPromises = Array.from(pendingTasks).map(async (task_id) => {
            const frame_number = taskMap.get(task_id)!;
            const imageUrl = await pollForTaskResult(task_id);
            
            return { frame_number, imageUrl };
          });
          await Promise.all(pollPromises);
          return;
        }
        
        // Batch API successful
        const batchResult = await response.json();
        console.log(`Batch status: completed=${batchResult.completed}, failed=${batchResult.failed}, processing=${batchResult.processing}`);
        
        // Process each task result
        for (const task of batchResult.tasks) {
          const frame_number = taskMap.get(task.id);
          if (!frame_number) continue;
          
          if (task.status === 'completed' && task.image_url) {
            // Update frame with generated image
            setScriptFrames(prev => prev.map(f => {
              if (f.frame_number === frame_number) {
                const existingImages = f.generated_images || [];
                const updatedImages = [...existingImages, task.image_url];
                return { 
                  ...f, 
                  generated_image: task.image_url,
                  generated_images: updatedImages,
                  status: 'completed',
                  progress: undefined
                };
              }
              return f;
            }));
            
            completedCount++;
            setBatchProgress(prev => prev ? { ...prev, current: completedCount } : null);
            console.log(`Frame ${frame_number} completed (${completedCount}/${submissions.length})`);
            
            setGeneratingFrames(prev => {
              const newSet = new Set(prev);
              newSet.delete(frame_number);
              return newSet;
            });
            
            pendingTasks.delete(task.id);
          } else if (task.status === 'failed') {
            // Handle failed task
            setScriptFrames(prev => prev.map(f => 
              f.frame_number === frame_number 
                ? { ...f, status: 'failed', progress: task.error || '生成失败' }
                : f
            ));
            
            failedCount++;
            
            setGeneratingFrames(prev => {
              const newSet = new Set(prev);
              newSet.delete(frame_number);
              return newSet;
            });
            
            pendingTasks.delete(task.id);
          }
          // If still processing, keep in pendingTasks
        }
        
        // Wait before next poll (10 seconds for batch)
        if (pendingTasks.size > 0) {
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } catch (error) {
        console.error('Batch polling error:', error);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    // Handle timeout
    if (pendingTasks.size > 0) {
      console.warn(`Batch polling timed out with ${pendingTasks.size} pending tasks`);
      for (const taskId of pendingTasks) {
        const frame_number = taskMap.get(taskId)!;
        setScriptFrames(prev => prev.map(f => 
          f.frame_number === frame_number 
            ? { ...f, status: 'failed', progress: '超时' }
            : f
        ));
        setGeneratingFrames(prev => {
          const newSet = new Set(prev);
          newSet.delete(frame_number);
          return newSet;
        });
      }
    }
    
    // Show completion message
    if (completedCount > 0 && failedCount === 0) {
      alert(`批量生成完成！成功生成 ${completedCount} 张图片`);
    } else if (completedCount > 0 && failedCount > 0) {
      alert(`批量生成部分完成。成功: ${completedCount} 张，失败: ${failedCount} 张`);
    } else if (failedCount > 0) {
      alert(`批量生成失败，请重试`);
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

  // Helper function to get character name from mapping
  // const getCharacterName = (scriptChar: string): string => {
  //   const charId = characterMapping[scriptChar];
  //   if (!charId) return scriptChar;
  //   const character = characters.find((c: any) => c.id === charId);
  //   return character ? character.name : scriptChar;
  // };

  // Extract all character names from prompt text
  const extractCharactersFromPrompt = (prompt: string): string[] => {
    const characters: string[] = [];
    
    // Match pattern like "角色A", "角色B" etc. (including when they appear after 角色：)
    const pattern1 = /角色[A-Z]/g;
    const matches1 = prompt.match(pattern1);
    if (matches1) {
      characters.push(...matches1);
    }
    
    // Also check if there's "角色：角色X" pattern - we already got 角色X above
    // This pattern is for non-standard character names like "角色：pic2", "角色：character1" 
    const pattern2 = /角色[：:]\s*([^角色\s]\w*)/g;
    let match;
    while ((match = pattern2.exec(prompt)) !== null) {
      // Only push if it's not already a 角色X pattern (which is handled by pattern1)
      if (!match[1].startsWith('色')) {
        characters.push(match[1]); // Push the character name/id after 角色：
      }
    }
    
    return [...new Set(characters)];
  };

  // Get character details with images for a list of character names
  const getCharacterDetails = (characterNames: string[]) => {
    return characterNames.map(scriptChar => {
      const charId = characterMapping[scriptChar];
      if (!charId || charId === 0) {
        return { name: scriptChar, image: null };
      }
      const character = characters.find((c: any) => c.id === charId);
      return {
        name: character ? character.name : scriptChar,
        image: character ? character.image_url : null,
        originalName: scriptChar
      };
    });
  };

  // Replace character names in prompts with mapped character names
  const replaceCharacterNames = () => {
    const updatedFrames = scriptFrames.map(frame => {
      let updatedPrompt = frame.prompt;
      
      // Replace each mapped character name
      Object.entries(characterMapping).forEach(([scriptChar, charId]) => {
        if (charId && charId !== 0) {
          const character = characters.find((c: any) => c.id === charId);
          if (character) {
            // Replace all occurrences of the script character name
            const regex = new RegExp(scriptChar, 'g');
            updatedPrompt = updatedPrompt.replace(regex, character.name);
          }
        }
      });
      
      return {
        ...frame,
        prompt: updatedPrompt,
        // Keep original prompt and characters info
        originalPrompt: frame.originalPrompt || frame.prompt,
        charactersInFrame: frame.charactersInFrame
      };
    });
    
    setScriptFrames(updatedFrames);
  };

  // Reset character names to original
  const resetCharacterNames = () => {
    setScriptFrames(JSON.parse(JSON.stringify(originalScriptFrames)));
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
                onClick={replaceCharacterNames}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                title="将脚本中的角色名称替换为映射的角色名称"
              >
                替换角色
              </button>
              <button
                onClick={resetCharacterNames}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                title="重置为原始的角色名称"
              >
                重置角色
              </button>
              <button
                onClick={generateAllImages}
                disabled={loading || !imageSize}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? (batchProgress ? `生成中 (${batchProgress.current + 1}/${batchProgress.total})` : '生成中...') : '批量生成分镜图'}
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
          
          {/* Batch Generation Progress Bar */}
          {batchProgress && (
            <div className="p-4 border-b bg-blue-50">
              <div className="flex justify-between text-sm mb-2">
                <span>批量生成进度 - 正在处理第 {batchProgress.currentFrame} 帧</span>
                <span>{batchProgress.current + 1} / {batchProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((batchProgress.current + 1) / batchProgress.total) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">
                请耐心等待，每张图片生成需要 10-30 秒...
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">序号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[300px]">脚本文案</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">角色</th>
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
                              {getDisplayPrompt(frame)}
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
                    <td className="px-4 py-4">
                      {(() => {
                        // Use saved charactersInFrame or extract from original prompt
                        const charactersToShow = frame.charactersInFrame || extractCharactersFromPrompt(frame.originalPrompt || frame.prompt);
                        if (charactersToShow.length === 0) return <span className="text-sm text-gray-400">-</span>;
                        
                        const characterDetails = getCharacterDetails(charactersToShow);
                        return (
                          <div className="flex flex-wrap gap-2">
                            {characterDetails.map((char, idx) => (
                              <div key={idx} className="flex flex-col items-center">
                                {char.image ? (
                                  <img
                                    src={char.image}
                                    alt={char.name}
                                    className="w-10 h-14 object-cover rounded cursor-pointer hover:shadow-lg transition-shadow"
                                    style={{ objectFit: 'contain', backgroundColor: '#f9fafb' }}
                                    onClick={() => setExpandedCharPreview(char.image)}
                                    title={`${char.originalName} → ${char.name}`}
                                  />
                                ) : (
                                  <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center">
                                    <span className="text-xs text-gray-500">无</span>
                                  </div>
                                )}
                                <span className="text-xs mt-1 text-center truncate max-w-[60px]" title={char.name}>
                                  {char.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      {generatingFrames.has(frame.frame_number) ? (
                        <div className="flex flex-col items-center justify-center w-20 h-20">
                          <Loader className="w-6 h-6 animate-spin text-blue-500" />
                          {frame.progress && (
                            <div className="text-xs text-gray-500 mt-1 text-center">{frame.progress}</div>
                          )}
                        </div>
                      ) : frame.generated_images && frame.generated_images.length > 0 ? (
                        <div className="relative">
                          <div className="relative group">
                            <img
                              src={frame.generated_images[currentImageIndex[frame.frame_number] || frame.generated_images.length - 1]}
                              alt={`Frame ${frame.frame_number}`}
                              className="w-20 h-20 object-cover rounded cursor-pointer"
                              onClick={() => setPreviewImage(frame.generated_images![currentImageIndex[frame.frame_number] || frame.generated_images!.length - 1])}
                            />
                            <button
                              onClick={() => setPreviewImage(frame.generated_images![currentImageIndex[frame.frame_number] || frame.generated_images!.length - 1])}
                              className="absolute inset-0 bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
                            >
                              <Maximize2 className="w-6 h-6" />
                            </button>
                          </div>
                          {/* Navigation buttons for multiple images */}
                          {frame.generated_images.length > 1 && (
                            <div className="flex justify-between mt-1">
                              <button
                                onClick={() => {
                                  const currentIdx = currentImageIndex[frame.frame_number] || frame.generated_images!.length - 1;
                                  const newIdx = currentIdx > 0 ? currentIdx - 1 : frame.generated_images!.length - 1;
                                  setCurrentImageIndex(prev => ({ ...prev, [frame.frame_number]: newIdx }));
                                }}
                                className="p-1 bg-gray-200 hover:bg-gray-300 rounded-full"
                                title="上一张"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <span className="text-xs text-gray-500">
                                {(currentImageIndex[frame.frame_number] || frame.generated_images.length - 1) + 1}/{frame.generated_images.length}
                              </span>
                              <button
                                onClick={() => {
                                  const currentIdx = currentImageIndex[frame.frame_number] || frame.generated_images!.length - 1;
                                  const newIdx = currentIdx < frame.generated_images!.length - 1 ? currentIdx + 1 : 0;
                                  setCurrentImageIndex(prev => ({ ...prev, [frame.frame_number]: newIdx }));
                                }}
                                className="p-1 bg-gray-200 hover:bg-gray-300 rounded-full"
                                title="下一张"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
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
                        {!frame.generated_images || frame.generated_images.length === 0 ? (
                          // Show generate button if no image
                          <button
                            onClick={() => generateSingleImage(frame.frame_number)}
                            disabled={generatingFrames.has(frame.frame_number) || !imageSize}
                            className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
                            title="生成图片"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        ) : (
                          // Show regenerate and download if image exists
                          <>
                            <button
                              onClick={() => generateSingleImage(frame.frame_number)}
                              disabled={generatingFrames.has(frame.frame_number) || !imageSize}
                              className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
                              title="重新生成（添加新图片）"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const currentIdx = currentImageIndex[frame.frame_number] || frame.generated_images!.length - 1;
                                downloadImage(frame.generated_images![currentIdx], frame.frame_number);
                              }}
                              className="text-green-500 hover:text-green-700"
                              title="下载当前图片"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
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