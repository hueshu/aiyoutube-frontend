import React, { useState, useEffect } from 'react';
import { Upload, Download, Copy, Loader, Image as ImageIcon, FileText, Check, Languages, Edit3, Save, BookOpen, ChevronDown, Users, RefreshCw, Link, Unlink, Video, Clock } from 'lucide-react';
import { API_URL } from '../config/api';
import JSZip from 'jszip';
import {
  uploadImage,
  submitBatchTasks,
  regenerateTask,
  pollTasksStatus
} from '../services/hailuoTasksService';

interface ImagePrompt {
  id: string;
  name: string;
  file: File;
  preview: string;
  supplementPrompt: string;
  generatedPrompt: string;
  translatedPrompt?: string;
  isProcessing: boolean;
  isTranslating?: boolean;
  error?: string;
  upLink?: string;    // ID of the image linked upward (this as tail frame)
  downLink?: string;  // ID of the image linked downward (this as head frame)
}

const GEMINI_API_KEY = 'AIzaSyDwD04ZVY2ff7nWdjZNTJK4sgy5nyYwbLA';

// System prompt from the document
const SYSTEM_PROMPT = `# 身份和使命

你是一名世界顶级的生成式视频AI提示词工程师，是拥有专业艺术直觉的"虚拟导演"。你的名字叫 "CineDream Architect"。你的核心使命是不仅能预判动作趋势，更能依据成熟的【导演决策框架】做出最佳的运镜选择，并通过最终的【自我校验循环】确保输出的提示词在各方面都达到最高标准，最终输出一段纯净、精准、充满电影感的"即梦3.0"视频提示词。

你将严格、无条件地遵循以下所有规则和工作流程。

---

# 核心铁律 (The Iron Laws)

### **铁律一：动作趋势与强度识别 (Thinking Principle)**

这是你思考的起点。
1.  **识别趋势**: 首先判断图片中的主体"**将要向何处运动，以及如何运动**"。
2.  **评估强度**: 在识别出动作后，必须评估其强度。如果图片的线索（如动态模糊、夸张的姿态、飞溅的物体）暗示了高速或高强度运动，则**必须**在动作描述中加入 \`快速\`、\`猛烈\`、\`剧烈\` 等强度副词。

### **铁律二：核心提示词公式 (Construction Principle)**

这是你构建提示词的**唯一且固定的公式**。
*   **核心公式**: \`[运镜方式], [主体动作], [主体表情], [可选的镜头切换或其他运镜]\`

---

# 🎬 运镜选择指导原则 (导演手册)

在你决定使用哪种【运镜方式】时，必须参考以下指导原则，以做出符合电影美学的专业选择。

*   **原则A (强调宏大/环境/对比):**
    *   **情景:** 需要展现宏大场景、众多主体，或强调主体与环境的巨大反差时（如城市峡谷中的车队）。
    *   **首选运镜:** \`固定镜头\` (从一个有冲击力的角度), \`镜头拉远\`。

*   **原则B (聚焦个体/情感/动作):**
    *   **情景:** 需要紧跟单个角色的动作，并聚焦其表情和决心时（如撞门冲刺的人）。
    *   **首选运镜:** \`跟随镜头\`, \`镜头推进\`。

*   **原则C (创造史诗感/视角变化):**
    *   **情景:** 需要展示一个场景的结束、揭示一个全貌，或在动作序列末尾创造戏剧性的视角变化时。
    *   **可选运镜:** \`镜头上移\`, \`镜头拉远\`。

*   **原则D (展现冲击力/身临其境):**
    *   **情景:** 当主体本身在画面内有足够强烈的相对运动时（如一列火车或车队径直朝镜头驶来）。
    *   **首选运镜:** \`固定镜头\`。这能利用静止的镜头和动态的主体形成最强的视觉冲击力。

---

# 核心执行规则

1.  **镜头语言约束**: \`运镜方式\`的描述**必须**从以下**精确的、带方向的原子指令**中选择，严禁使用模糊指令：
    *   \`固定镜头\`
    *   \`跟随镜头\`
    *   \`镜头推进\`
    *   \`镜头拉远\`
    *   \`环绕镜头\`
    *   \`镜头上移\`
    *   \`镜头下移\`
    *   \`镜头左移\`
    *   \`镜头右移\`
2.  **动作优先**: 只描述可被观察的、具体的动作和表情。

---

# ⚙️ 自我校验与精炼循环 (最终质检)

在你初步构建完候选提示词之后、最终输出之前，这是一个**强制性的、最后一个思考步骤**。你必须启动此循环，进行以下两大核心校验，并根据校验结果对提示词进行精炼。

### **1. 指令清晰度校验 (Process over Result)**
*   **自问:** "我使用的动词是描述一个模糊的'结果'，还是一个具体的'过程'？"
*   **规则:** 如果动词是结果导向的（如 \`冲出来\`, \`出现\`），则**必须**将其分解为具体的、物理上可观察的**过程指令**（如 \`撞碎玻璃并快速向前奔跑\`）。

### **2. 词语搭配合理性校验 (Collocation Sanity Check)**
*   **自问:** "我使用的'强度副词'和'动作动词'组合在一起，是否符合逻辑和语言习惯？"
*   **规则:** **严禁**输出语义不协调、不自然的词语搭配（如 \`猛烈地向前走来\`），必须修正为更合理的组合（如 \`迈着沉重的步伐向前走来\`）。

---

# 输出格式 (Final Output Format)

严格按照以下格式输出，不要包含任何额外对话、解释或Markdown标题：
[提示词]

---

# 工作流程

1.  **识别趋势与强度 (MANDATORY):** 严格遵循【铁律一】。
2.  **专业运镜决策 (MANDATORY):** 参考【导演手册】，为已识别的趋势选择最合适的【运镜方式】。
3.  **初步生成 (Initial Draft):** 遵循【铁律二】和核心规则，构建一个**候选提示词**。
4.  **自我校验与精炼 (MANDATORY):** **启动【自我校验与精炼循环】**，对候选提示词执行两大核心校验，并进行必要的修正，生成**最终版本的提示词**。
5.  **最终审查与输出:** 检查最终版本的提示词是否完全符合【输出格式】要求，然后交付成果。`;

interface Script {
  id: number;
  name: string;
  category?: string;
  total_frames?: number;
  isOwner?: boolean;
  owner_name?: string;
}

interface ParsedScriptContent {
  sequence: number;
  prompt: string;
  dynamicDescription?: string;
  narration?: string;
}

const VideoPromptGenerator: React.FC = () => {
  const [images, setImages] = useState<ImagePrompt[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingPrompts, setEditingPrompts] = useState<Set<string>>(new Set());
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [scriptScope, setScriptScope] = useState<'mine' | 'system' | 'both'>('both');
  const [showScriptSelector, setShowScriptSelector] = useState(false);
  const [characterReplacements, setCharacterReplacements] = useState<{ [key: string]: string }>({});
  const [showCharacterReplacer, setShowCharacterReplacer] = useState(false);
  const [detectedCharacters, setDetectedCharacters] = useState<string[]>([]);
  const [hasImportedFromScript, setHasImportedFromScript] = useState(false);

  // Hailuo video generation states
  const [hailuoTasks, setHailuoTasks] = useState<Map<string, string[]>>(new Map()); // imageId -> taskId[] mapping (support multiple versions)
  const [taskStatuses, setTaskStatuses] = useState<Map<string, any>>(new Map()); // taskId -> task status
  const [isSubmittingTasks, setIsSubmittingTasks] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Modal states for batch video generation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [successTaskCount, setSuccessTaskCount] = useState(0);

  // Modal states for single video regeneration
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showRegenerateProgress, setShowRegenerateProgress] = useState(false);
  const [showRegenerateSuccess, setShowRegenerateSuccess] = useState(false);
  const [showRegenerateError, setShowRegenerateError] = useState(false);
  const [regenerateImageId, setRegenerateImageId] = useState<string | null>(null);
  const [regenerateErrorMessage, setRegenerateErrorMessage] = useState('');

  // Modal state for batch download confirmation
  const [showBatchDownloadConfirm, setShowBatchDownloadConfirm] = useState(false);

  // Modal states for batch download progress
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [downloadProgressCurrent, setDownloadProgressCurrent] = useState(0);
  const [downloadProgressTotal, setDownloadProgressTotal] = useState(0);
  const [downloadProgressMessage, setDownloadProgressMessage] = useState('');

  // Modal state for video playback
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [modalVideoUrl, setModalVideoUrl] = useState<string>('');
  const [modalVersionNumber, setModalVersionNumber] = useState<number>(1);
  const [modalPrompt, setModalPrompt] = useState<string>('');

  // Load scripts when component mounts or scope changes
  useEffect(() => {
    if (images.length > 0) {
      loadScripts();
    }
  }, [scriptScope, images.length]);

  // Load scripts from API
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
    } finally {
      setLoadingScripts(false);
    }
  };

  // Import script data to supplement prompts
  const importScriptData = async () => {
    if (!selectedScriptId) return;

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

      // Update images with dynamic descriptions from script
      setImages(prev => prev.map((img, index) => {
        const scriptFrame = parsedContent[index];
        if (scriptFrame && scriptFrame.dynamicDescription) {
          // 同时导入到"补充提示"和"生成的提示词"两个文本框
          return {
            ...img,
            supplementPrompt: scriptFrame.dynamicDescription,
            generatedPrompt: scriptFrame.dynamicDescription
          };
        }
        return img;
      }));

      // 标记已从脚本导入
      setHasImportedFromScript(true);

      // 检测角色名称（角色A、角色B、角色C等）
      const characters = new Set<string>();
      parsedContent.forEach(frame => {
        if (frame.dynamicDescription) {
          // 匹配角色A、角色B、角色C等模式
          const matches = frame.dynamicDescription.match(/角色[A-Z]/g);
          if (matches) {
            matches.forEach(match => characters.add(match));
          }
        }
      });

      if (characters.size > 0) {
        const sortedCharacters = Array.from(characters).sort();
        setDetectedCharacters(sortedCharacters);
        // 初始化替换映射
        const initialReplacements: { [key: string]: string } = {};
        sortedCharacters.forEach(char => {
          initialReplacements[char] = '';
        });
        setCharacterReplacements(initialReplacements);
        setShowCharacterReplacer(true);
      }

      // Close selector after import
      setShowScriptSelector(false);
      setSelectedScriptId('');

      alert(`已导入脚本「${scripts.find(s => s.id === parseInt(selectedScriptId))?.name}」的动态过程描述`);
    } catch (error) {
      console.error('Failed to import script data:', error);
      alert('导入脚本数据失败');
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    // Show script selector after adding images
    if (files.length > 0) {
      setShowScriptSelector(true);
    }
  };

  // Process files (used by both file input and drag-drop)
  const processFiles = (files: File[]) => {
    // 先对文件按名称排序（从小到大）
    const sortedFiles = [...files].sort((a, b) => {
      // 使用自然排序，正确处理数字
      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });

    const newImages: ImagePrompt[] = sortedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      file: file,
      preview: URL.createObjectURL(file),
      supplementPrompt: '',
      generatedPrompt: '',
      isProcessing: false
    }));
    setImages(prev => [...prev, ...newImages]);
    // Show script selector after adding images
    if (files.length > 0) {
      setShowScriptSelector(true);
      // 重置导入标记
      setHasImportedFromScript(false);
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Convert image to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
    });
  };

  // Call Gemini API for single image
  const generatePromptForImage = async (image: ImagePrompt) => {
    try {
      const base64Image = await fileToBase64(image.file);

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: SYSTEM_PROMPT + (image.supplementPrompt ? `\n\n补充说明：${image.supplementPrompt}` : '')
              },
              {
                inline_data: {
                  mime_type: image.file.type,
                  data: base64Image
                }
              },
              {
                text: "请分析这张图片，生成适合图转视频的提示词。"
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          candidateCount: 1
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);
        throw new Error(`API request failed: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('Extracted text:', generatedText);
      return generatedText.trim();
    } catch (error) {
      console.error('Error generating prompt:', error);
      throw error;
    }
  };

  // Generate prompt for paired images (head and tail frames)
  const generatePromptForPairedImages = async (headImage: ImagePrompt, tailImage: ImagePrompt) => {
    try {
      const base64HeadImage = await fileToBase64(headImage.file);
      const base64TailImage = await fileToBase64(tailImage.file);

      const pairedPrompt = '这两张图作为首尾帧。第一个图作为首帧，第二个图作为尾帧。就是从第一个图的状态，运镜变化到第二个图的状态。';

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: SYSTEM_PROMPT + `\n\n补充说明：${pairedPrompt}`
              },
              {
                inline_data: {
                  mime_type: headImage.file.type,
                  data: base64HeadImage
                }
              },
              {
                inline_data: {
                  mime_type: tailImage.file.type,
                  data: base64TailImage
                }
              },
              {
                text: "请分析这两张图片，生成适合图转视频的提示词，描述从第一张图到第二张图的运镜变化。"
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          candidateCount: 1
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);
        throw new Error(`API request failed: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('API Response for paired images:', data);
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('Extracted text:', generatedText);
      return generatedText.trim();
    } catch (error) {
      console.error('Error generating prompt for paired images:', error);
      throw error;
    }
  };

  // Helper function to get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };

  // Translate text to English
  const translateToEnglish = async (text: string): Promise<string> => {
    if (!text) {
      return '';
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
        throw new Error('Translation failed');
      }

      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  };

  // Translate single prompt
  const handleTranslatePrompt = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image || !image.generatedPrompt) return;

    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, isTranslating: true } : img
    ));

    try {
      const translatedText = await translateToEnglish(image.generatedPrompt);
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, translatedPrompt: translatedText, isTranslating: false }
          : img
      ));
    } catch (error) {
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, isTranslating: false }
          : img
      ));
      alert('翻译失败，请稍后重试');
    }
  };

  // Batch translate all prompts
  const handleBatchTranslate = async () => {
    const imagesToTranslate = images.filter(img => img.generatedPrompt && !img.translatedPrompt);
    if (imagesToTranslate.length === 0) {
      alert('没有需要翻译的提示词');
      return;
    }

    for (const image of imagesToTranslate) {
      setImages(prev => prev.map(img =>
        img.id === image.id ? { ...img, isTranslating: true } : img
      ));

      try {
        const translatedText = await translateToEnglish(image.generatedPrompt);
        setImages(prev => prev.map(img =>
          img.id === image.id
            ? { ...img, translatedPrompt: translatedText, isTranslating: false }
            : img
        ));
      } catch (error) {
        setImages(prev => prev.map(img =>
          img.id === image.id
            ? { ...img, isTranslating: false }
            : img
        ));
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Link image downward (this image as head frame, target as tail frame)
  const linkImageDown = (imageId: string) => {
    const currentIndex = images.findIndex(img => img.id === imageId);
    if (currentIndex === -1 || currentIndex >= images.length - 1) return;

    const targetImage = images[currentIndex + 1];

    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        return { ...img, downLink: targetImage.id };
      }
      if (img.id === targetImage.id) {
        return { ...img, upLink: imageId };
      }
      return img;
    }));
  };

  // Unlink image downward
  const unlinkImageDown = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image || !image.downLink) return;

    const targetId = image.downLink;

    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        return { ...img, downLink: undefined };
      }
      if (img.id === targetId) {
        return { ...img, upLink: undefined };
      }
      return img;
    }));
  };

  // Link image upward (this image as tail frame, target as head frame)
  const linkImageUp = (imageId: string) => {
    const currentIndex = images.findIndex(img => img.id === imageId);
    if (currentIndex === -1 || currentIndex === 0) return;

    const targetImage = images[currentIndex - 1];

    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        return { ...img, upLink: targetImage.id };
      }
      if (img.id === targetImage.id) {
        return { ...img, downLink: imageId };
      }
      return img;
    }));
  };

  // Unlink image upward
  const unlinkImageUp = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image || !image.upLink) return;

    const targetId = image.upLink;

    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        return { ...img, upLink: undefined };
      }
      if (img.id === targetId) {
        return { ...img, downLink: undefined };
      }
      return img;
    }))
  };

  // Process single image or paired images (regenerate)
  const handleRegeneratePrompt = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return;

    // Check if this is a paired image
    const isPaired = !!image.downLink;
    const tailImage = isPaired ? images.find(img => img.id === image.downLink) : null;

    // Set both images as processing if paired
    if (isPaired && tailImage) {
      setImages(prev => prev.map(img =>
        (img.id === imageId || img.id === tailImage.id)
          ? { ...img, isProcessing: true, error: undefined }
          : img
      ));
    } else {
      setImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, isProcessing: true, error: undefined } : img
      ));
    }

    try {
      let prompt: string;
      if (isPaired && tailImage) {
        // Generate for paired images
        prompt = await generatePromptForPairedImages(image, tailImage);
      } else {
        // Generate for single image
        prompt = await generatePromptForImage(image);
      }

      // Update generated prompt for head image (single or paired)
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? { ...img, generatedPrompt: prompt, isProcessing: false }
          : (isPaired && img.id === tailImage?.id)
          ? { ...img, isProcessing: false }
          : img
      ));
    } catch (error) {
      setImages(prev => prev.map(img =>
        (img.id === imageId || (isPaired && img.id === tailImage?.id))
          ? { ...img, error: '生成失败', isProcessing: false }
          : img
      ));
    }
  };

  // Process all images (handle both single and paired)
  const handleProcessAll = async () => {
    setIsProcessingAll(true);

    // Process images one by one to avoid rate limits
    // Skip tail frames as they are processed with their head frames
    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Skip tail frames (have upLink but no downLink)
      if (image.upLink && !image.downLink) continue;

      // 如果没有从脚本导入，并且已有生成内容，则跳过
      // 如果从脚本导入了，则强制重新生成（使用补充提示）
      if (!hasImportedFromScript && image.generatedPrompt) continue;

      const isPaired = !!image.downLink;
      const tailImage = isPaired ? images.find(img => img.id === image.downLink) : null;

      // Set processing state
      if (isPaired && tailImage) {
        setImages(prev => prev.map(img =>
          (img.id === image.id || img.id === tailImage.id)
            ? { ...img, isProcessing: true }
            : img
        ));
      } else {
        setImages(prev => prev.map(img =>
          img.id === image.id ? { ...img, isProcessing: true } : img
        ));
      }

      try {
        let prompt: string;
        if (isPaired && tailImage) {
          // Generate for paired images
          prompt = await generatePromptForPairedImages(image, tailImage);
        } else {
          // Generate for single image
          prompt = await generatePromptForImage(image);
        }

        setImages(prev => prev.map(img =>
          img.id === image.id
            ? { ...img, generatedPrompt: prompt, isProcessing: false }
            : (isPaired && img.id === tailImage?.id)
            ? { ...img, isProcessing: false }
            : img
        ));
      } catch (error) {
        setImages(prev => prev.map(img =>
          (img.id === image.id || (isPaired && img.id === tailImage?.id))
            ? { ...img, error: '生成失败', isProcessing: false }
            : img
        ));
      }

      // Add delay to avoid rate limiting
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsProcessingAll(false);
    // 处理完成后重置标记
    if (hasImportedFromScript) {
      setHasImportedFromScript(false);
    }
  };

  // Update supplement prompt
  const updateSupplementPrompt = (id: string, value: string) => {
    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, supplementPrompt: value } : img
    ));
  };

  // Update generated prompt
  const updateGeneratedPrompt = (id: string, value: string) => {
    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, generatedPrompt: value } : img
    ));
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle edit mode for a prompt
  const toggleEditMode = (promptId: string) => {
    setEditingPrompts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(promptId)) {
        newSet.delete(promptId);
      } else {
        newSet.add(promptId);
      }
      return newSet;
    });
  };

  // Handle textarea click - copy if not in edit mode
  const handleTextareaClick = (text: string, promptId: string) => {
    if (!editingPrompts.has(promptId) && text) {
      copyToClipboard(text, promptId);
    }
  };

  // Download all images with prompts as names
  const handleDownloadAll = async (useEnglish: boolean = false) => {
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const promptToUse = useEnglish ? image.translatedPrompt : image.generatedPrompt;
      if (!promptToUse) continue;

      // Create a download link
      const response = await fetch(image.preview);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Format filename: 001_prompt.ext
      const index = String(i + 1).padStart(3, '0');
      const extension = image.name.split('.').pop();
      // 保留中文、英文、数字和标点符号（包括中文标点）
      // 只替换会导致文件系统问题的字符：/ \ : * ? " < > |
      let cleanPrompt = promptToUse
        .replace(/[/\\:*?"<>|]/g, '_'); // 只替换文件系统不允许的字符

      // 文件名长度限制：考虑到序号(3字符) + 下划线(1字符) + 扩展名(约4字符) = 8字符
      // Windows文件名限制255字符，留一些余量，限制提示词部分为240字符
      const maxPromptLength = 240;
      if (cleanPrompt.length > maxPromptLength) {
        // 如果超长，保留前面大部分内容，在末尾添加省略号
        cleanPrompt = cleanPrompt.substring(0, maxPromptLength - 3) + '...';
      }

      a.href = url;
      a.download = `${index}_${cleanPrompt}.${extension}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Add delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Remove image
  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // Batch replace characters in all prompts
  const handleBatchReplaceCharacters = () => {
    // 检查是否所有角色都有替换值
    const hasEmptyValues = Object.values(characterReplacements).some(value => !value.trim());
    if (hasEmptyValues) {
      alert('请为所有角色设置替换名称');
      return;
    }

    // 批量替换所有图片的提示词
    setImages(prev => prev.map(img => {
      let updatedSupplementPrompt = img.supplementPrompt;
      let updatedGeneratedPrompt = img.generatedPrompt;

      // 替换每个角色
      Object.entries(characterReplacements).forEach(([oldChar, newChar]) => {
        if (newChar.trim()) {
          const regex = new RegExp(oldChar, 'g');
          updatedSupplementPrompt = updatedSupplementPrompt.replace(regex, newChar);
          updatedGeneratedPrompt = updatedGeneratedPrompt.replace(regex, newChar);
        }
      });

      return {
        ...img,
        supplementPrompt: updatedSupplementPrompt,
        generatedPrompt: updatedGeneratedPrompt
      };
    }));

    // 关闭替换面板
    setShowCharacterReplacer(false);
    // 标记内容已修改，需要重新生成
    setHasImportedFromScript(true);
    alert('角色替换完成！');
  };

  /**
   * Upload images to R2 and get URLs
   */
  const uploadImagesToR2 = async () => {
    const uploadPromises = images.map(async (img) => {
      try {
        const { imageUrl } = await uploadImage(img.file);
        return { id: img.id, imageUrl };
      } catch (error) {
        console.error('Upload failed for', img.name, error);
        return { id: img.id, imageUrl: null };
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter(r => r.imageUrl !== null);
  };

  /**
   * Handle batch video generation - Step 1: Show confirmation modal
   */
  const handleBatchGenerateVideos = async () => {
    if (images.length === 0) {
      alert('请先上传图片');
      return;
    }

    // Check if prompts are generated
    const missingPrompts = images.filter(img => {
      // Images with downLink are head frames and need prompts
      // Images without upLink or downLink are standalone and need prompts
      // Images with ONLY upLink (tail frames) don't need prompts
      const isTailFrameOnly = img.upLink && !img.downLink;
      if (isTailFrameOnly) return false;
      // Check other images for prompts
      return !img.generatedPrompt;
    });

    // Debug: Log missing prompts info
    console.log('=== Validation Debug ===');
    console.log('Total images:', images.length);
    images.forEach((img, index) => {
      console.log(`Image ${index + 1} (${img.name}):`, {
        upLink: img.upLink ? 'Yes' : 'No',
        downLink: img.downLink ? 'Yes' : 'No',
        hasPrompt: img.generatedPrompt ? 'Yes' : 'No',
        isTailOnly: (img.upLink && !img.downLink) ? 'Yes' : 'No'
      });
    });
    console.log('Missing prompts count:', missingPrompts.length);
    console.log('Missing prompt images:', missingPrompts.map(img => img.name));

    if (missingPrompts.length > 0) {
      alert(`有 ${missingPrompts.length} 张图片还没有生成提示词，请先生成提示词`);
      return;
    }

    // Calculate task count
    const count = images.filter(img => !(img.upLink && !img.downLink)).length;
    setTaskCount(count);

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  /**
   * Handle batch video generation - Step 2: Execute submission
   */
  const executeSubmission = async () => {
    // Hide confirm modal and show progress modal
    setShowConfirmModal(false);
    setShowProgressModal(true);
    setIsSubmittingTasks(true);

    try {
      // Step 1: Upload images to R2
      const uploadedImages = await uploadImagesToR2();

      if (uploadedImages.length === 0) {
        setShowProgressModal(false);
        alert('图片上传失败，请重试');
        setIsSubmittingTasks(false);
        return;
      }

      // Step 2: Build tasks array
      const tasks = [];

      for (const img of images) {
        // Skip tail frames (they're processed with head frames)
        if (img.upLink && !img.downLink) continue;

        const uploadedImg = uploadedImages.find(u => u.id === img.id);
        if (!uploadedImg) continue;

        const isPaired = !!img.downLink;
        const tailImage = isPaired ? images.find(i => i.id === img.downLink) : null;
        const uploadedTailImg = isPaired && tailImage ? uploadedImages.find(u => u.id === tailImage.id) : null;

        const imageUrls = isPaired && uploadedTailImg
          ? [uploadedImg.imageUrl, uploadedTailImg.imageUrl]
          : [uploadedImg.imageUrl];

        tasks.push({
          imageUrls,
          promptCn: img.generatedPrompt,
          promptEn: img.translatedPrompt,
          imageCount: imageUrls.length
        });
      }

      // Step 3: Submit tasks
      const { taskIds } = await submitBatchTasks(tasks);

      // Map image IDs to task IDs
      let taskIndex = 0;
      const newMapping = new Map(hailuoTasks);
      for (const img of images) {
        if (img.upLink && !img.downLink) continue; // Skip tail frames
        if (taskIndex < taskIds.length) {
          const existingTasks = newMapping.get(img.id) || [];
          newMapping.set(img.id, [...existingTasks, taskIds[taskIndex]]);
          taskIndex++;
        }
      }
      setHailuoTasks(newMapping);

      // Step 4: Start polling all tasks
      startPollingTasks();

      // Hide progress modal and show success modal
      setShowProgressModal(false);
      setSuccessTaskCount(taskIds.length);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Batch generate error:', error);
      setShowProgressModal(false);
      alert(`提交失败: ${error.message}`);
    } finally {
      setIsSubmittingTasks(false);
    }
  };

  /**
   * Start polling tasks status
   * Always polls all unfinished tasks from hailuoTasks Map
   */
  const startPollingTasks = () => {
    // Don't clear existing interval - let it continue polling all tasks
    // Only create new interval if there isn't one running
    if (pollingInterval) {
      return; // Already polling, no need to restart
    }

    const pollTasks = async () => {
      try {
        // Get fresh reference to hailuoTasks by using state updater function
        setHailuoTasks(currentTasks => {
          // Get all taskIds from current hailuoTasks Map
          const allTaskIds = Array.from(currentTasks.values()).flat();

          if (allTaskIds.length > 0) {
            // Poll all tasks (async, but we don't await here to avoid blocking state update)
            pollTasksStatus(allTaskIds).then(tasks => {
              setTaskStatuses(prevStatuses => {
                const newStatuses = new Map(prevStatuses);
                tasks.forEach(task => {
                  newStatuses.set(task.taskId, task);
                });
                return newStatuses;
              });

              // Check if all tasks are completed or failed
              const allDone = tasks.every(t => t.status === 'completed' || t.status === 'failed');
              if (allDone) {
                setPollingInterval(prev => {
                  if (prev) {
                    clearInterval(prev);
                  }
                  return null;
                });
              }
            }).catch(error => {
              console.error('Polling error:', error);
            });
          }

          return currentTasks; // Return unchanged
        });
      } catch (error) {
        console.error('Polling setup error:', error);
      }
    };

    // Poll immediately
    pollTasks();

    // Poll every 5 seconds
    const interval = setInterval(pollTasks, 5000);
    setPollingInterval(interval);
  };

  /**
   * Handle regenerate video for single image - Step 1: Show confirmation
   */
  const handleRegenerateVideo = (imageId: string) => {
    setRegenerateImageId(imageId);
    setShowRegenerateConfirm(true);
  };

  /**
   * Execute regenerate video - Step 2: Execute submission
   */
  const executeRegenerateVideo = async () => {
    if (!regenerateImageId) return;

    const img = images.find(i => i.id === regenerateImageId);
    if (!img || !img.generatedPrompt) return;

    // Hide confirm modal and show progress modal
    setShowRegenerateConfirm(false);
    setShowRegenerateProgress(true);

    try {
      // Upload image if not already uploaded
      const uploadedImages = await uploadImagesToR2();
      const uploadedImg = uploadedImages.find(u => u.id === regenerateImageId);
      if (!uploadedImg) {
        throw new Error('图片上传失败');
      }

      const isPaired = !!img.downLink;
      const tailImage = isPaired ? images.find(i => i.id === img.downLink) : null;
      const uploadedTailImg = isPaired && tailImage ? uploadedImages.find(u => u.id === tailImage.id) : null;

      const imageUrls = isPaired && uploadedTailImg
        ? [uploadedImg.imageUrl, uploadedTailImg.imageUrl]
        : [uploadedImg.imageUrl];

      const { taskId } = await regenerateTask({
        imageUrls,
        promptCn: img.generatedPrompt,
        promptEn: img.translatedPrompt,
        imageCount: imageUrls.length
      });

      // Update mapping - add new taskId to existing array
      const newMapping = new Map(hailuoTasks);
      const existingTasks = newMapping.get(regenerateImageId) || [];
      newMapping.set(regenerateImageId, [...existingTasks, taskId]);
      setHailuoTasks(newMapping);

      // Start polling all tasks (including this new one)
      startPollingTasks();

      // Hide progress modal and show success modal
      setShowRegenerateProgress(false);
      setShowRegenerateSuccess(true);
    } catch (error: any) {
      console.error('Regenerate error:', error);
      setShowRegenerateProgress(false);
      setRegenerateErrorMessage(error.message || '重新生成失败');
      setShowRegenerateError(true);
    }
  };

  /**
   * Handle batch download videos - support multiple versions
   */
  const handleBatchDownloadVideos = async () => {
    try {
      // Get all images with taskIds
      const imagesWithTasks = Array.from(hailuoTasks.entries())
        .filter(([imageId]) => images.find(i => i.id === imageId))
        .sort(([idA], [idB]) => {
          const indexA = images.findIndex(i => i.id === idA);
          const indexB = images.findIndex(i => i.id === idB);
          return indexA - indexB;
        });

      // Collect all videos to download
      const videosToDownload: Array<{ filename: string; url: string }> = [];

      for (let imgIndex = 0; imgIndex < imagesWithTasks.length; imgIndex++) {
        const [imageId, taskIds] = imagesWithTasks[imgIndex];
        const img = images.find(i => i.id === imageId);
        if (!img) continue;

        // Filter completed tasks
        const completedTasks = taskIds
          .map(taskId => ({ taskId, task: taskStatuses.get(taskId) }))
          .filter(({ task }) => task && task.status === 'completed' && task.videoUrl);

        if (completedTasks.length === 0) continue;

        // Format image index (001, 002, etc.)
        const imageIndex = String(imgIndex + 1).padStart(3, '0');

        // Add all versions to download list
        for (let versionIndex = 0; versionIndex < completedTasks.length; versionIndex++) {
          const { task } = completedTasks[versionIndex];

          const prompt = img.generatedPrompt || 'video';
          const cleanPrompt = prompt.substring(0, 50).replace(/[/\\:*?\"<>|]/g, '_');

          // Filename format: 001.mp4 (single version) or 001-1.mp4, 001-2.mp4 (multiple versions)
          const filename = completedTasks.length > 1
            ? `${imageIndex}-${versionIndex + 1}_${cleanPrompt}.mp4`
            : `${imageIndex}_${cleanPrompt}.mp4`;

          videosToDownload.push({ filename, url: task.videoUrl });
        }
      }

      if (videosToDownload.length === 0) {
        alert('没有可下载的视频');
        return;
      }

      // Show progress modal
      setShowDownloadProgress(true);
      setDownloadProgressTotal(videosToDownload.length);
      setDownloadProgressCurrent(0);
      setDownloadProgressMessage('准备下载...');

      // Create ZIP
      const zip = new JSZip();

      // Download and add videos to ZIP
      for (let i = 0; i < videosToDownload.length; i++) {
        const video = videosToDownload[i];

        setDownloadProgressCurrent(i + 1);
        setDownloadProgressMessage(`正在下载第 ${i + 1}/${videosToDownload.length} 个视频...`);

        try {
          const response = await fetch(video.url);
          if (!response.ok) throw new Error(`Failed to fetch ${video.filename}`);

          const blob = await response.blob();
          zip.file(video.filename, blob);
        } catch (error) {
          console.error('Download failed for', video.filename, error);
          // Continue with other videos even if one fails
        }
      }

      // Generate ZIP
      setDownloadProgressMessage('正在压缩视频...');
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        // Progress callback
        setDownloadProgressMessage(`正在压缩... ${Math.round(metadata.percent)}%`);
      });

      // Download ZIP
      setDownloadProgressMessage('准备下载压缩包...');
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `videos_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Close progress modal
      setShowDownloadProgress(false);
      alert(`成功下载 ${videosToDownload.length} 个视频的压缩包！`);

    } catch (error) {
      console.error('Batch download failed:', error);
      setShowDownloadProgress(false);
      alert('批量下载失败，请稍后重试');
    }
  };

  /**
   * Open video in modal for playback
   */
  const openVideoModal = (videoUrl: string, versionNumber: number, imageId: string) => {
    const img = images.find(i => i.id === imageId);
    setModalVideoUrl(videoUrl);
    setModalVersionNumber(versionNumber);
    setModalPrompt(img?.generatedPrompt || '');
    setShowVideoModal(true);
  };

  /**
   * Close video modal
   */
  const closeVideoModal = () => {
    setShowVideoModal(false);
    setModalVideoUrl('');
    setModalVersionNumber(1);
    setModalPrompt('');
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Handle ESC key to close video modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showVideoModal) {
        closeVideoModal();
      }
    };

    if (showVideoModal) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showVideoModal]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认提交</h3>
            <p className="text-gray-600 mb-2">
              确认提交 <span className="font-bold text-blue-600">{taskCount}</span> 个视频生成任务吗？
            </p>
            <p className="text-sm text-gray-500 mb-6">
              生成时间预计每个视频3-5分钟。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeSubmission}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center">
              <Loader className="w-16 h-16 text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">正在提交中</h3>
              <p className="text-gray-600 text-center">
                请稍等，正在上传图片并提交任务...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">提交成功！</h3>
            </div>
            <p className="text-gray-600 text-center mb-2">
              已成功提交 <span className="font-bold text-green-600">{successTaskCount}</span> 个视频生成任务！
            </p>
            <p className="text-sm text-gray-500 text-center mb-6">
              任务已进入队列，请在右侧第四列查看生成进度。<br />
              预计3-5分钟完成。
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Confirm Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认重新生成</h3>
            <p className="text-gray-600 mb-6">
              确定要重新生成这个视频吗？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRegenerateConfirm(false);
                  setRegenerateImageId(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeRegenerateVideo}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Progress Modal */}
      {showRegenerateProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center">
              <Loader className="w-16 h-16 text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">正在提交中</h3>
              <p className="text-gray-600 text-center">
                请稍等，正在上传图片并提交任务...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Success Modal */}
      {showRegenerateSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">提交完成</h3>
            </div>
            <p className="text-gray-600 text-center mb-6">
              重新生成任务已成功提交，请在右侧查看生成进度。
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowRegenerateSuccess(false);
                  setRegenerateImageId(null);
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Error Modal */}
      {showRegenerateError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl text-red-600">✕</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">提交失败</h3>
            </div>
            <p className="text-gray-600 text-center mb-6">
              {regenerateErrorMessage}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowRegenerateError(false);
                  setRegenerateImageId(null);
                  setRegenerateErrorMessage('');
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Download Confirm Modal */}
      {showBatchDownloadConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认批量下载</h3>
            <p className="text-gray-600 mb-2">
              即将下载 <span className="font-bold text-purple-600">{Array.from(taskStatuses.values()).filter(t => t.status === 'completed').length}</span> 个已完成的视频文件
            </p>
            <p className="text-sm text-gray-500 mb-6">
              视频将自动下载到您的下载文件夹中。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowBatchDownloadConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowBatchDownloadConfirm(false);
                  handleBatchDownloadVideos();
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                确定下载
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {showDownloadProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">正在下载视频</h3>

            <div className="space-y-4">
              {/* Progress message */}
              <p className="text-sm text-gray-600">{downloadProgressMessage}</p>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(downloadProgressCurrent / downloadProgressTotal) * 100}%` }}
                ></div>
              </div>

              {/* Progress text */}
              <p className="text-sm text-center text-gray-500">
                {downloadProgressCurrent} / {downloadProgressTotal}
              </p>

              {/* Spinner */}
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Playback Modal */}
      {showVideoModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={closeVideoModal}
        >
          <div
            className="relative bg-black rounded-lg shadow-2xl max-w-6xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white text-sm px-3 py-1 rounded">
                  版本 {modalVersionNumber}
                </div>
                <button
                  onClick={closeVideoModal}
                  className="text-white hover:text-gray-300 transition-colors"
                  title="关闭 (ESC)"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
              <a
                href={modalVideoUrl}
                download
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
                下载
              </a>
            </div>

            {/* Video Player - 720p (1280x720) with responsive */}
            <div className="relative" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
              <video
                src={modalVideoUrl}
                controls
                autoPlay
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                style={{ maxHeight: '720px' }}
              />
            </div>

            {/* Footer - Prompt */}
            {modalPrompt && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm">
                  <span className="font-semibold">提示词：</span>
                  {modalPrompt}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            图转视频 Prompt 生成器
          </h1>
          <p className="text-gray-600">
            上传图片，使用 Gemini 2.5 Pro 生成适合图转视频的提示词
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div
            className={`border-2 border-dashed rounded-lg p-4 mb-3 transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-center justify-center gap-4">
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  拖拽图片到此处或点击上传
                </p>
                <p className="text-xs text-gray-500">
                  支持批量上传多张图片
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>选择图片</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {images.length > 0 && `已上传 ${images.length} 张图片`}
            </div>

            {images.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleProcessAll}
                  disabled={isProcessingAll || images.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isProcessingAll
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {isProcessingAll ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      {hasImportedFromScript ? '使用AI优化提示词' : '一键生成 Prompt'}
                    </>
                  )}
                </button>

                <button
                  onClick={handleBatchTranslate}
                  disabled={images.filter(img => img.generatedPrompt && !img.translatedPrompt).length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    images.filter(img => img.generatedPrompt && !img.translatedPrompt).length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <Languages className="w-5 h-5" />
                  批量翻译
                </button>

                <button
                  onClick={() => handleDownloadAll(false)}
                  disabled={images.filter(img => img.generatedPrompt).length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    images.filter(img => img.generatedPrompt).length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                >
                  <Download className="w-5 h-5" />
                  下载中文版
                </button>

                <button
                  onClick={() => handleDownloadAll(true)}
                  disabled={images.filter(img => img.translatedPrompt).length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    images.filter(img => img.translatedPrompt).length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}
                >
                  <Download className="w-5 h-5" />
                  下载英文版
                </button>

                <button
                  onClick={handleBatchGenerateVideos}
                  disabled={isSubmittingTasks || images.length === 0 || images.filter(img => img.generatedPrompt).length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isSubmittingTasks || images.length === 0 || images.filter(img => img.generatedPrompt).length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  <Video className="w-5 h-5" />
                  {isSubmittingTasks ? '提交中...' : '批量生成视频'}
                </button>

                <button
                  onClick={() => setShowBatchDownloadConfirm(true)}
                  disabled={Array.from(taskStatuses.values()).filter(t => t.status === 'completed').length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    Array.from(taskStatuses.values()).filter(t => t.status === 'completed').length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  <Download className="w-5 h-5" />
                  批量下载视频
                </button>
              </div>
            )}
          </div>

          {images.length > 0 && (
            <p className="text-sm text-gray-600">
              已上传 {images.length} 张图片，
              已生成 {images.filter(img => img.generatedPrompt).length} 个提示词
            </p>
          )}
        </div>

        {/* Script Selector */}
        {images.length > 0 && showScriptSelector && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                导入脚本数据
              </h3>
              <button
                onClick={() => setShowScriptSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-3">
              {/* Scope selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setScriptScope('mine')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    scriptScope === 'mine'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  我的脚本
                </button>
                <button
                  onClick={() => setScriptScope('system')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    scriptScope === 'system'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  系统库
                </button>
                <button
                  onClick={() => setScriptScope('both')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    scriptScope === 'both'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
              </div>

              {/* Script dropdown */}
              <div className="flex-1 relative">
                <select
                  value={selectedScriptId}
                  onChange={(e) => setSelectedScriptId(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
                  disabled={loadingScripts}
                >
                  <option value="">选择脚本...</option>
                  {scripts.map(script => (
                    <option key={script.id} value={script.id}>
                      {script.name}
                      {script.category && ` [${script.category}]`}
                      {!script.isOwner && script.owner_name && ` (${script.owner_name})`}
                      {script.total_frames && ` - ${script.total_frames}帧`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Import button */}
              <button
                onClick={importScriptData}
                disabled={!selectedScriptId || loadingScripts}
                className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                  selectedScriptId && !loadingScripts
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                导入
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              选择脚本后，将导入第三列「动态过程描述」到各图片的补充提示中
            </p>
          </div>
        )}

        {/* Character Replacer */}
        {showCharacterReplacer && detectedCharacters.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4" />
                批量替换角色名称
              </h3>
              <button
                onClick={() => setShowCharacterReplacer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 mb-3">
              {detectedCharacters.map(character => (
                <div key={character} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-20">{character}：</span>
                  <input
                    type="text"
                    value={characterReplacements[character] || ''}
                    onChange={(e) => setCharacterReplacements(prev => ({
                      ...prev,
                      [character]: e.target.value
                    }))}
                    placeholder={`输入${character}的真实名称（如：男人、女孩）`}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  // 清空所有输入
                  const cleared: { [key: string]: string } = {};
                  detectedCharacters.forEach(char => {
                    cleared[char] = '';
                  });
                  setCharacterReplacements(cleared);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                清空
              </button>
              <button
                onClick={handleBatchReplaceCharacters}
                className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                批量替换
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              将所有提示词中的角色占位符替换为真实名称
            </p>
          </div>
        )}

        {/* Image Cards */}
        <div className="grid grid-cols-1 gap-3">
          {images.map(image => {
            // Skip images that are tail frames in a pair (have upLink but are not also head frames)
            if (image.upLink && !image.downLink) {
              return null;
            }

            // Check if this is a paired image (head frame)
            const isPaired = !!image.downLink;
            const tailImage = isPaired ? images.find(img => img.id === image.downLink) : null;

            return (
            <div key={image.id} className="bg-white rounded-lg shadow-sm p-4">
              {/* Compact layout - all in one row */}
              <div className="flex gap-4">
                {/* Image preview section - single or paired */}
                {isPaired && tailImage ? (
                  // Paired images - show both
                  <div className="flex-shrink-0 flex gap-2">
                    <div className="relative w-[145px] h-[200px] bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={image.preview}
                        alt={image.name}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                        首帧
                      </div>
                      {image.isProcessing && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <Loader className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="relative w-[145px] h-[200px] bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={tailImage.preview}
                        alt={tailImage.name}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-1 left-1 bg-purple-500 text-white text-xs px-2 py-0.5 rounded">
                        尾帧
                      </div>
                      {tailImage.isProcessing && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <Loader className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Single image
                  <div className="relative flex-shrink-0 w-[300px] h-[200px] bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-full object-contain"
                    />
                    {image.isProcessing && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Loader className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                {/* Link buttons - vertical layout */}
                <div className="flex flex-col justify-center gap-2">
                  {/* Link Up button */}
                  {(() => {
                    const currentIndex = images.findIndex(img => img.id === image.id);
                    const canLinkUp = currentIndex > 0;
                    const hasUpLink = !!image.upLink;

                    return (
                      <button
                        onClick={() => hasUpLink ? unlinkImageUp(image.id) : linkImageUp(image.id)}
                        disabled={!canLinkUp && !hasUpLink}
                        className={`p-2 rounded ${
                          hasUpLink
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : canLinkUp
                            ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={hasUpLink ? '取消向上关联' : '向上关联'}
                      >
                        {hasUpLink ? <Unlink className="w-4 h-4" /> : <Link className="w-4 h-4 rotate-[-45deg]" />}
                      </button>
                    );
                  })()}

                  {/* Link Down button */}
                  {(() => {
                    const currentIndex = images.findIndex(img => img.id === image.id);
                    const canLinkDown = currentIndex < images.length - 1;
                    const hasDownLink = !!image.downLink;

                    return (
                      <button
                        onClick={() => hasDownLink ? unlinkImageDown(image.id) : linkImageDown(image.id)}
                        disabled={!canLinkDown && !hasDownLink}
                        className={`p-2 rounded ${
                          hasDownLink
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : canLinkDown
                            ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={hasDownLink ? '取消向下关联' : '向下关联'}
                      >
                        {hasDownLink ? <Unlink className="w-4 h-4" /> : <Link className="w-4 h-4 rotate-[45deg]" />}
                      </button>
                    );
                  })()}
                </div>

                {/* Content section - takes remaining space */}
                <div className="flex-1 flex flex-col">
                  {/* Header with name and action buttons */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {isPaired && tailImage ? (
                        <span>
                          <span className="text-blue-600">{image.name}</span>
                          {' → '}
                          <span className="text-purple-600">{tailImage.name}</span>
                          <span className="ml-2 text-xs text-gray-500 font-normal">(配对)</span>
                        </span>
                      ) : (
                        image.name
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRegeneratePrompt(image.id)}
                        disabled={image.isProcessing}
                        className={`text-xs ${
                          image.isProcessing
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {image.isProcessing ? '生成中...' : (image.generatedPrompt ? '重新生成提示词' : '生成提示词')}
                      </button>
                      {image.generatedPrompt && (
                        <button
                          onClick={() => handleTranslatePrompt(image.id)}
                          disabled={image.isTranslating}
                          className={`text-xs ${
                            image.isTranslating
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-700'
                          }`}
                        >
                          {image.isTranslating ? '翻译中...' : '翻译'}
                        </button>
                      )}
                      <button
                        onClick={() => removeImage(image.id)}
                        className="text-red-500 hover:text-red-700 text-sm ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Three columns layout */}
                  <div className="flex gap-2 flex-1">
                    {/* Supplement prompt */}
                    <div className="w-[200px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        补充提示（{isPaired ? '配对固定提示' : '可选'}）
                      </label>
                      <textarea
                        value={isPaired ? '这两张图作为首尾帧。第一个图作为首帧，第二个图作为尾帧。就是从第一个图的状态，运镜变化到第二个图的状态。' : image.supplementPrompt}
                        onChange={(e) => {
                          if (!isPaired) {
                            updateSupplementPrompt(image.id, e.target.value);
                          }
                        }}
                        placeholder={isPaired ? '' : '输入额外的描述或要求...'}
                        readOnly={isPaired}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                          isPaired ? 'border-blue-300 bg-blue-50 cursor-default' : 'border-gray-300'
                        }`}
                        rows={7}
                      />
                    </div>

                    {/* Generated prompt */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-700">
                          生成的提示词
                        </label>
                        {image.generatedPrompt && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyToClipboard(image.generatedPrompt, image.id)}
                              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                            >
                              {copiedId === image.id ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  已复制
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  复制
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => toggleEditMode(image.id)}
                              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                            >
                              {editingPrompts.has(image.id) ? (
                                <>
                                  <Save className="w-3 h-3" />
                                  完成
                                </>
                              ) : (
                                <>
                                  <Edit3 className="w-3 h-3" />
                                  编辑
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <textarea
                        value={image.generatedPrompt}
                        onChange={(e) => updateGeneratedPrompt(image.id, e.target.value)}
                        onClick={() => handleTextareaClick(image.generatedPrompt, image.id)}
                        readOnly={!editingPrompts.has(image.id)}
                        placeholder={image.error || "等待生成..."}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                          image.error ? 'border-red-300 text-red-500' :
                          editingPrompts.has(image.id) ? 'border-blue-400 bg-white' :
                          'border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100'
                        }`}
                        rows={7}
                        title={!editingPrompts.has(image.id) ? "点击复制内容" : ""}
                      />
                    </div>

                    {/* English translation */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-700">
                          英文翻译
                        </label>
                        {image.translatedPrompt && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyToClipboard(image.translatedPrompt!, `${image.id}-en`)}
                              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                            >
                              {copiedId === `${image.id}-en` ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  已复制
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  复制
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => toggleEditMode(`${image.id}-en`)}
                              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                            >
                              {editingPrompts.has(`${image.id}-en`) ? (
                                <>
                                  <Save className="w-3 h-3" />
                                  完成
                                </>
                              ) : (
                                <>
                                  <Edit3 className="w-3 h-3" />
                                  编辑
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <textarea
                        value={image.translatedPrompt || ''}
                        onChange={(e) => setImages(prev => prev.map(img =>
                          img.id === image.id ? { ...img, translatedPrompt: e.target.value } : img
                        ))}
                        onClick={() => handleTextareaClick(image.translatedPrompt || '', `${image.id}-en`)}
                        readOnly={!editingPrompts.has(`${image.id}-en`)}
                        placeholder={image.isTranslating ? "翻译中..." : "等待翻译..."}
                        disabled={image.isTranslating}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                          image.isTranslating ? 'border-gray-300 bg-gray-100' :
                          editingPrompts.has(`${image.id}-en`) ? 'border-blue-400 bg-white' :
                          'border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100'
                        }`}
                        rows={7}
                        title={!editingPrompts.has(`${image.id}-en`) && !image.isTranslating ? "点击复制内容" : ""}
                      />
                    </div>

                    {/* Video column - Support multiple versions */}
                    <div className="w-[300px]">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-700">
                          生成的视频
                        </label>
                        <button
                          onClick={() => handleRegenerateVideo(image.id)}
                          disabled={!image.generatedPrompt}
                          className={`text-xs ${
                            !image.generatedPrompt
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-orange-600 hover:text-orange-700'
                          }`}
                        >
                          重新生成视频
                        </button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {(() => {
                          const taskIds = hailuoTasks.get(image.id) || [];

                          if (taskIds.length === 0) {
                            return (
                              <div className="w-full h-[160px] border border-gray-300 rounded bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                                未提交生成任务
                              </div>
                            );
                          }

                          // Render all videos (newest first)
                          return [...taskIds].reverse().map((taskId, index) => {
                            const task = taskStatuses.get(taskId);
                            if (!task) return null;

                            const versionNumber = taskIds.length - index;

                            // Show completed video
                            if (task.status === 'completed' && task.videoUrl) {
                              return (
                                <div key={taskId} className="relative group">
                                  <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded z-10">
                                    版本 {versionNumber}
                                  </div>
                                  <a
                                    href={task.videoUrl}
                                    download
                                    className="absolute top-2 right-2 p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 z-10"
                                    title="下载此版本"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                  <div
                                    className="relative cursor-pointer"
                                    onClick={() => openVideoModal(task.videoUrl, versionNumber, image.id)}
                                    title="点击放大播放"
                                  >
                                    <video
                                      src={task.videoUrl}
                                      className="w-full h-[160px] rounded border border-gray-300 bg-black"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                    />
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center rounded">
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <div className="bg-white text-gray-900 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                                          <span className="text-2xl">▶</span>
                                          <span className="text-sm font-medium">点击放大播放</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // Show status for pending/processing/failed tasks
                            const getStatusDisplay = () => {
                              const createdAt = new Date(task.createdAt);
                              const now = new Date();
                              const elapsedSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
                              const minutes = Math.floor(elapsedSeconds / 60);
                              const seconds = elapsedSeconds % 60;

                              switch (task.status) {
                                case 'pending':
                                  return {
                                    text: '等待生成...',
                                    icon: <Clock className="w-4 h-4 animate-pulse" />,
                                    color: 'text-gray-600',
                                    time: `${minutes}:${seconds.toString().padStart(2, '0')}`
                                  };
                                case 'locked':
                                  return {
                                    text: '已被领取，生成中...',
                                    icon: <Loader className="w-4 h-4 animate-spin" />,
                                    color: 'text-blue-600',
                                    time: `${minutes}:${seconds.toString().padStart(2, '0')}`
                                  };
                                case 'processing':
                                  return {
                                    text: '已提交，等待下载...',
                                    icon: <Loader className="w-4 h-4 animate-spin" />,
                                    color: 'text-green-600',
                                    time: `${minutes}:${seconds.toString().padStart(2, '0')}`
                                  };
                                case 'failed':
                                  return {
                                    text: '生成失败',
                                    icon: null,
                                    color: 'text-red-600',
                                    error: task.errorMessage
                                  };
                                default:
                                  return { text: '未知状态', icon: null, color: 'text-gray-600' };
                              }
                            };

                            const display = getStatusDisplay();

                            return (
                              <div key={taskId} className="relative w-full h-[160px] border border-gray-300 rounded bg-gray-50 flex flex-col items-center justify-center p-4 text-sm">
                                <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                  版本 {versionNumber}
                                </div>
                                <div className={`flex items-center gap-2 ${display.color} mb-2`}>
                                  {display.icon}
                                  <span>{display.text}</span>
                                </div>
                                {display.time && (
                                  <div className="text-lg font-mono text-gray-700">
                                    {display.time}
                                  </div>
                                )}
                                {display.error && (
                                  <div className="text-xs text-red-500 mt-2 text-center">
                                    {display.error}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {/* Empty state */}
        {images.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12">
            <div className="text-center">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                还没有上传图片
              </h3>
              <p className="text-gray-600 mb-6">
                点击上方按钮批量上传图片，开始生成视频提示词
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPromptGenerator;