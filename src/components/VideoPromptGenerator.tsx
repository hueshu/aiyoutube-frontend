import React, { useState, useEffect } from 'react';
import { Upload, Download, Copy, Loader, Image as ImageIcon, FileText, Check, Languages, Edit3, Save, Link, Unlink, Video, Clock, Clipboard } from 'lucide-react';
import { API_URL } from '../config/api';
import JSZip from 'jszip';
import {
  uploadImage,
  submitBatchTasks as submitBatchTasksHailuo,
  regenerateTask as regenerateTaskHailuo,
  pollTasksStatus as pollTasksStatusHailuo
} from '../services/hailuoTasksService';
import {
  submitBatchTasks as submitBatchTasksJiMeng,
  regenerateTask as regenerateTaskJiMeng,
  pollTasksStatus as pollTasksStatusJiMeng
} from '../services/jimengTasksService';
import {
  submitBatchTasks as submitBatchTasksVeo,
  pollTasksStatus as pollTasksStatusVeo,
  regenerateTask as regenerateTaskVeo
} from '../services/veoTasksService';
import {
  submitBatchTasks as submitBatchTasksSora,
  pollTasksStatus as pollTasksStatusSora,
  regenerateTask as regenerateTaskSora
} from '../services/soraTasksService';
import { snapshotService } from '../services/snapshotService';
import {
  createVideoPrompt,
  getSnapshotsWithPrompts,
  getVideoPromptById
} from '../services/videoPromptsService';

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
  originalPrompt?: string;  // 原始 prompt（包含角色占位符）
  characterMappings?: Record<string, string>;  // 角色映射关系
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('VITE_GEMINI_API_KEY is not configured');
}
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

type AIModel = 'gemini-flash' | 'gemini-pro' | 'claude';
type VideoModel = 'hailuo' | 'jimeng-official' | 'jimeng-yunwu' | 'veo-3.1-fast' | 'sora-2-hd';
type AspectRatio = '16x9' | '9x16';

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

// 角色占位符工具函数
const detectCharacterPlaceholders = (text: string): string[] => {
  if (!text) return [];

  const chinesePattern = /角色[A-Z]/g;
  const englishPattern = /Character [A-Z]/gi;

  const chineseMatches = text.match(chinesePattern) || [];
  const englishMatches = text.match(englishPattern) || [];

  // 去重并排序
  return [...new Set([...chineseMatches, ...englishMatches])].sort();
};

const replaceCharacters = (
  text: string,
  mappings: Record<string, string>
): string => {
  let result = text;

  Object.entries(mappings).forEach(([placeholder, description]) => {
    if (description && description.trim()) {
      // 全局替换，忽略大小写（针对英文）
      const regex = new RegExp(placeholder, 'gi');
      result = result.replace(regex, description);
    }
  });

  return result;
};

const VideoPromptGenerator: React.FC = () => {
  const [images, setImages] = useState<ImagePrompt[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingPrompts, setEditingPrompts] = useState<Set<string>>(new Set());

  // Video prompts save/import states
  const [showSavePromptModal, setShowSavePromptModal] = useState(false);
  const [showImportPromptModal, setShowImportPromptModal] = useState(false);
  const [workSnapshots, setWorkSnapshots] = useState<any[]>([]);
  const [snapshotsWithPrompts, setSnapshotsWithPrompts] = useState<any[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');

  // Script import states
  const [showImportScriptModal, setShowImportScriptModal] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [scriptScope, setScriptScope] = useState<'mine' | 'system'>('mine');
  const [userScripts, setUserScripts] = useState<any[]>([]);
  const [systemScripts, setSystemScripts] = useState<any[]>([]);

  // AI Model selection state (for prompt generation)
  const [selectedModel, setSelectedModel] = useState<AIModel>(() => {
    // Load from localStorage or default to gemini-pro
    return (localStorage.getItem('aiModel') as AIModel) || 'gemini-pro';
  });

  // Video Model selection state (for video generation)
  const [selectedVideoModel, setSelectedVideoModel] = useState<VideoModel>(() => {
    // Load from localStorage or default to jimeng-official
    return (localStorage.getItem('videoModel') as VideoModel) || 'jimeng-official';
  });

  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(() => {
    // Load from localStorage or default to 9x16
    return (localStorage.getItem('aspectRatio') as AspectRatio) || '9x16';
  });

  // Video generation states - unified for both Hailuo and JiMeng
  const [videoTasks, setVideoTasks] = useState<Map<string, string[]>>(new Map()); // imageId -> taskId[] mapping (support multiple versions)
  const [taskStatuses, setTaskStatuses] = useState<Map<string, any>>(new Map()); // taskId -> task status
  const [isSubmittingTasks, setIsSubmittingTasks] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Modal states for batch video generation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAllVideosCompleteModal, setShowAllVideosCompleteModal] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [completedVideoCount, setCompletedVideoCount] = useState(0);
  const [failedVideoCount, setFailedVideoCount] = useState(0);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Character mapping states
  const [showCharacterMappingModal, setShowCharacterMappingModal] = useState(false);
  const [detectedCharacters, setDetectedCharacters] = useState<string[]>([]);
  const [characterDescriptions, setCharacterDescriptions] = useState<Record<string, string>>({});
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const [savedCharacterMappings, setSavedCharacterMappings] = useState<Record<string, string>>(() => {
    // 从 localStorage 加载历史映射
    const saved = localStorage.getItem('characterMappings');
    return saved ? JSON.parse(saved) : {};
  });

  // Modal states for single video regeneration
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerateImageId, setRegenerateImageId] = useState<string | null>(null);

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

  // Load work snapshots and video prompts when component mounts
  useEffect(() => {
    loadWorkSnapshots();
    loadSnapshotsWithPrompts();
    // Load scripts for import functionality
    loadUserScripts();
    loadSystemScripts();
  }, []);

  // Load user scripts
  const loadUserScripts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/scripts?scope=mine`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const scriptsData = data.scripts?.results || data.scripts || [];
        setUserScripts(scriptsData);
      }
    } catch (error) {
      console.error('Failed to load user scripts:', error);
    }
  };

  // Load system scripts
  const loadSystemScripts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/scripts?scope=system`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const scriptsData = data.scripts?.results || data.scripts || [];
        setSystemScripts(scriptsData);
      }
    } catch (error) {
      console.error('Failed to load system scripts:', error);
    }
  };

  // Load work snapshots for save functionality
  const loadWorkSnapshots = async () => {
    try {
      const snapshots = await snapshotService.getSnapshots();
      setWorkSnapshots(snapshots);
    } catch (error) {
      console.error('Failed to load work snapshots:', error);
    }
  };

  // Load snapshots with video prompts for import functionality
  const loadSnapshotsWithPrompts = async () => {
    try {
      const snapshots = await getSnapshotsWithPrompts();
      setSnapshotsWithPrompts(snapshots);
    } catch (error) {
      console.error('Failed to load snapshots with prompts:', error);
    }
  };

  // Handle save video prompts
  const handleSaveVideoPrompts = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const snapshotId = parseInt(formData.get('snapshotId') as string);
    const promptName = formData.get('promptName') as string;

    // Collect all prompts data
    const promptsData = images
      .filter(img => img.generatedPrompt)
      .map(img => {
        // 如果有原始 prompt 和角色映射，保存原始版本（带占位符）
        let promptToSave = img.generatedPrompt;
        if (img.originalPrompt && img.characterMappings) {
          promptToSave = img.originalPrompt;
        }

        return {
          generatedPrompt: promptToSave,
          translatedPrompt: img.translatedPrompt || ''
        };
      });

    if (promptsData.length === 0) {
      alert('没有可保存的提示词');
      return;
    }

    try {
      await createVideoPrompt({ snapshotId, promptName, promptsData });
      alert('保存成功！');
      setShowSavePromptModal(false);
      // Reload snapshots with prompts
      loadSnapshotsWithPrompts();
    } catch (error) {
      console.error('Failed to save video prompts:', error);
      alert('保存失败，请重试');
    }
  };

  // Handle import video prompts
  const handleImportVideoPrompts = async () => {
    if (!selectedPromptId) {
      alert('请选择要导入的提示词');
      return;
    }

    try {
      const promptData = await getVideoPromptById(parseInt(selectedPromptId));
      const currentImageCount = images.length;
      const promptCount = promptData.promptsData.length;

      // Check if counts match
      if (currentImageCount !== promptCount) {
        const minCount = Math.min(currentImageCount, promptCount);
        const confirmed = window.confirm(
          `当前有${currentImageCount}张图片，导入的prompts有${promptCount}条，将按顺序导入前${minCount}条，是否继续？`
        );
        if (!confirmed) return;
      }

      // 检测角色占位符
      const allCharacters = new Set<string>();
      promptData.promptsData.forEach((promptItem: any) => {
        if (promptItem.generatedPrompt) {
          const chars = detectCharacterPlaceholders(promptItem.generatedPrompt);
          chars.forEach(c => allCharacters.add(c));
        }
      });

      if (allCharacters.size > 0) {
        // 有角色占位符，显示对话框
        const charactersArray = Array.from(allCharacters).sort();
        const initialMappings: Record<string, string> = {};

        // 预填充历史映射
        charactersArray.forEach(char => {
          if (savedCharacterMappings[char]) {
            initialMappings[char] = savedCharacterMappings[char];
          }
        });

        setDetectedCharacters(charactersArray);
        setCharacterDescriptions(initialMappings);
        setPendingImportData({
          type: 'video-prompts',
          data: promptData.promptsData
        });
        setShowCharacterMappingModal(true);
        setShowImportPromptModal(false);
        setSelectedPromptId('');
      } else {
        // 没有角色占位符，直接导入
        applyVideoPromptsData(promptData.promptsData, {});
        setShowImportPromptModal(false);
        setSelectedPromptId('');
      }
    } catch (error) {
      console.error('Failed to import video prompts:', error);
      alert('导入失败，请重试');
    }
  };

  // Handle import script dynamic description
  const handleImportScriptDynamicDescription = async () => {
    if (!selectedScriptId) {
      alert('请选择要导入的脚本');
      return;
    }

    try {
      // Fetch script details with parsed_content
      const response = await fetch(`${API_URL}/scripts/${selectedScriptId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch script');
      }

      const data = await response.json();
      const script = data.script;

      if (!script.parsed_content || script.parsed_content.length === 0) {
        alert('该脚本没有可导入的内容');
        return;
      }

      const imageCount = images.length;
      const scriptFrameCount = script.parsed_content.length;

      // Check if counts match
      if (imageCount !== scriptFrameCount) {
        const minCount = Math.min(imageCount, scriptFrameCount);
        const confirmed = window.confirm(
          `当前有${imageCount}张图片，脚本有${scriptFrameCount}个分镜，将按顺序导入前${minCount}条动态描述，是否继续？`
        );
        if (!confirmed) return;
      }

      // Check if any existing prompts will be overwritten
      const hasExistingPrompts = images.some(img => img.generatedPrompt);
      if (hasExistingPrompts) {
        const confirmed = window.confirm('将覆盖已有的提示词，是否继续？');
        if (!confirmed) return;
      }

      // 检测角色占位符
      const allCharacters = new Set<string>();
      script.parsed_content.forEach((frame: any) => {
        if (frame.dynamicDescription) {
          const chars = detectCharacterPlaceholders(frame.dynamicDescription);
          chars.forEach(c => allCharacters.add(c));
        }
      });

      if (allCharacters.size > 0) {
        // 有角色占位符，显示对话框
        const charactersArray = Array.from(allCharacters).sort();
        const initialMappings: Record<string, string> = {};

        // 预填充历史映射
        charactersArray.forEach(char => {
          if (savedCharacterMappings[char]) {
            initialMappings[char] = savedCharacterMappings[char];
          }
        });

        setDetectedCharacters(charactersArray);
        setCharacterDescriptions(initialMappings);
        setPendingImportData({
          type: 'script',
          data: script.parsed_content
        });
        setShowCharacterMappingModal(true);
      } else {
        // 没有角色占位符，直接导入
        applyScriptData(script.parsed_content, {});
      }
    } catch (error) {
      console.error('Failed to import script dynamic description:', error);
      alert('导入失败，请重试');
    }
  };

  // 应用脚本数据（新增函数）
  const applyScriptData = (parsedContent: any[], mappings: Record<string, string>) => {
    setImages(prev => prev.map((img, index) => {
      if (index < parsedContent.length) {
        const frame = parsedContent[index];
        if (frame.dynamicDescription) {
          const original = frame.dynamicDescription;
          const replaced = Object.keys(mappings).length > 0
            ? replaceCharacters(original, mappings)
            : original;

          return {
            ...img,
            originalPrompt: Object.keys(mappings).length > 0 ? original : undefined,
            generatedPrompt: replaced,
            characterMappings: Object.keys(mappings).length > 0 ? mappings : undefined
          };
        }
      }
      return img;
    }));

    alert('导入成功！');
    setShowImportScriptModal(false);
    setSelectedScriptId('');
  };

  // 应用粘贴数据（新增函数 - 处理 JSON 格式）
  const applyPasteDataFromJson = (parsedData: any[], mappings: Record<string, string>) => {
    const minCount = Math.min(parsedData.length, images.length);

    setImages(prev => prev.map((img, index) => {
      const sceneData = parsedData[index];

      // If no corresponding JSON data, keep original
      if (!sceneData?.prompts) {
        return img;
      }

      const original = sceneData.prompts.chinese || img.generatedPrompt;
      const replaced = Object.keys(mappings).length > 0
        ? replaceCharacters(original, mappings)
        : original;

      return {
        ...img,
        originalPrompt: Object.keys(mappings).length > 0 ? original : undefined,
        generatedPrompt: replaced,
        translatedPrompt: sceneData.prompts.english || img.translatedPrompt,
        characterMappings: Object.keys(mappings).length > 0 ? mappings : undefined
      };
    }));

    alert(minCount === images.length
      ? '成功导入Prompt数据'
      : `成功导入${minCount}条Prompt数据`);
  };

  // 应用图转视频 prompt 数据（新增函数 - 处理从数据库导入的 prompts）
  const applyVideoPromptsData = (promptsData: any[], mappings: Record<string, string>) => {
    const minCount = Math.min(promptsData.length, images.length);

    setImages(prev => prev.map((img, index) => {
      if (index < promptsData.length) {
        const promptItem = promptsData[index];
        const original = promptItem.generatedPrompt;
        const replaced = Object.keys(mappings).length > 0
          ? replaceCharacters(original, mappings)
          : original;

        return {
          ...img,
          originalPrompt: Object.keys(mappings).length > 0 ? original : undefined,
          generatedPrompt: replaced,
          translatedPrompt: promptItem.translatedPrompt || '',
          characterMappings: Object.keys(mappings).length > 0 ? mappings : undefined
        };
      }
      return img;
    }));

    alert(minCount === images.length
      ? '导入成功！'
      : `成功导入${minCount}条数据`);
  };

  // 处理角色映射确认
  const handleCharacterMappingConfirm = () => {
    if (!pendingImportData) return;

    const { type, data } = pendingImportData;

    if (type === 'script') {
      // 处理脚本动态描述导入
      applyScriptData(data, characterDescriptions);
    } else if (type === 'paste') {
      // 处理粘贴 prompt 导入（JSON 格式）
      applyPasteDataFromJson(data, characterDescriptions);
    } else if (type === 'video-prompts') {
      // 处理图转视频 prompt 导入
      applyVideoPromptsData(data, characterDescriptions);
    }

    // 清理状态
    setCharacterDescriptions({});
    setPendingImportData(null);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  // 从视频文件提取第一帧
  const extractFirstFrame = async (videoFile: File, timeout = 10000): Promise<{ blob: Blob; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(videoFile);
      video.muted = true;
      video.preload = 'metadata';

      let timeoutId: number;
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          URL.revokeObjectURL(video.src);
          clearTimeout(timeoutId);
          video.remove();
        }
      };

      // 超时处理
      timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('提取第一帧超时'));
      }, timeout);

      video.addEventListener('loadedmetadata', () => {
        // 提取第一帧（0.1秒处，避免黑帧）
        video.currentTime = 0.1;
      });

      video.addEventListener('seeked', () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            cleanup();
            reject(new Error('无法创建 Canvas 上下文'));
            return;
          }

          ctx.drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const previewUrl = URL.createObjectURL(blob);
              cleanup();
              resolve({ blob, previewUrl });
            } else {
              cleanup();
              reject(new Error('无法生成图片'));
            }
          }, 'image/jpeg', 0.9);
        } catch (error) {
          cleanup();
          reject(error);
        }
      });

      video.addEventListener('error', () => {
        cleanup();
        reject(new Error('视频加载失败'));
      });
    });
  };

  // Process files (used by both file input and drag-drop)
  const processFiles = async (files: File[]) => {
    // 先对文件按名称排序（从小到大）
    const sortedFiles = [...files].sort((a, b) => {
      // 使用自然排序，正确处理数字
      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });

    const newImages: ImagePrompt[] = [];

    for (const file of sortedFiles) {
      if (file.type.startsWith('image/')) {
        // 图片文件 - 直接添加
        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          file: file,
          preview: URL.createObjectURL(file),
          supplementPrompt: '',
          generatedPrompt: '',
          isProcessing: false
        });
      } else if (file.type.startsWith('video/')) {
        // 视频文件 - 提取第一帧
        try {
          const { blob, previewUrl } = await extractFirstFrame(file);

          // 创建新的 File 对象（从视频提取的图片）
          const imageName = file.name.replace(/\.[^/.]+$/, '') + '_第一帧.jpg';
          const imageFile = new File([blob], imageName, { type: 'image/jpeg' });

          newImages.push({
            id: Math.random().toString(36).substr(2, 9),
            name: imageName,
            file: imageFile,
            preview: previewUrl,
            supplementPrompt: '',
            generatedPrompt: '',
            isProcessing: false
          });
        } catch (error) {
          console.error(`提取视频第一帧失败: ${file.name}`, error);
          alert(`处理视频失败: ${file.name}\n${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    }

    setImages(prev => [...prev, ...newImages]);
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
      file.type.startsWith('image/') || file.type.startsWith('video/')
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

      const geminiModel = selectedModel === 'gemini-flash' ? 'gemini-2.5-flash' : 'gemini-3-pro-preview';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
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
        console.error('Gemini API Error Response:', errorData);
        const errorMessage = `Gemini API 失败 (${response.status}): ${JSON.stringify(errorData, null, 2)}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Gemini API Response:', data);

      // Check if response has candidates
      if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
        const errorMessage = `Gemini API 返回格式异常: ${JSON.stringify(data, null, 2)}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      const generatedText = data.candidates[0]?.content?.parts?.[0]?.text || '';
      if (!generatedText) {
        const errorMessage = `Gemini API 未返回文本内容: ${JSON.stringify(data, null, 2)}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      console.log('Extracted text:', generatedText);
      return generatedText.trim();
    } catch (error) {
      console.error('Error generating prompt with Gemini:', error);
      // Re-throw with full error details
      if (error instanceof Error) {
        throw new Error(`Gemini 生成失败: ${error.message}`);
      }
      throw new Error(`Gemini 生成失败: ${String(error)}`);
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

      const geminiModel = selectedModel === 'gemini-flash' ? 'gemini-2.5-flash' : 'gemini-3-pro-preview';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
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
        console.error('Gemini API Error Response:', errorData);
        const errorMessage = `Gemini API 失败 (${response.status}): ${JSON.stringify(errorData, null, 2)}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Gemini API Response for paired images:', data);

      // Check if response has candidates
      if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
        const errorMessage = `Gemini API 返回格式异常: ${JSON.stringify(data, null, 2)}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      const generatedText = data.candidates[0]?.content?.parts?.[0]?.text || '';
      if (!generatedText) {
        const errorMessage = `Gemini API 未返回文本内容: ${JSON.stringify(data, null, 2)}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      console.log('Extracted text:', generatedText);
      return generatedText.trim();
    } catch (error) {
      console.error('Error generating prompt for paired images with Gemini:', error);
      // Re-throw with full error details
      if (error instanceof Error) {
        throw new Error(`Gemini 配对图生成失败: ${error.message}`);
      }
      throw new Error(`Gemini 配对图生成失败: ${String(error)}`);
    }
  };

  // Call Claude API for single image
  const generatePromptForImageClaude = async (image: ImagePrompt) => {
    try {
      const base64Image = await fileToBase64(image.file);

      const requestBody = {
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: image.file.type,
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: SYSTEM_PROMPT + (image.supplementPrompt ? `\n\n补充说明：${image.supplementPrompt}` : '') + '\n\n请分析这张图片，生成适合图转视频的提示词。'
              }
            ]
          }
        ]
      };

      // 通过后端代理调用 Claude API（解决 CORS 问题）
      const response = await fetch(
        `${API_URL}/ai-prompt/claude`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Claude API Error Response:', errorData);
        const errorMessage = `Claude API 失败 (${response.status}): ${JSON.stringify(errorData, null, 2)}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Claude API Response:', data);

      // Check if response has the expected structure
      if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
        const errorMessage = `Claude API 返回格式异常: ${JSON.stringify(data, null, 2)}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      const generatedText = data.content[0]?.text || '';
      if (!generatedText) {
        const errorMessage = `Claude API 未返回文本内容: ${JSON.stringify(data, null, 2)}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      console.log('Extracted text:', generatedText);
      return generatedText.trim();
    } catch (error) {
      console.error('Error generating prompt with Claude:', error);
      // Re-throw with full error details
      if (error instanceof Error) {
        throw new Error(`Claude 生成失败: ${error.message}`);
      }
      throw new Error(`Claude 生成失败: ${String(error)}`);
    }
  };

  // Generate prompt for paired images using Claude (head and tail frames)
  const generatePromptForPairedImagesClaude = async (headImage: ImagePrompt, tailImage: ImagePrompt) => {
    try {
      const base64HeadImage = await fileToBase64(headImage.file);
      const base64TailImage = await fileToBase64(tailImage.file);

      const pairedPrompt = '这两张图作为首尾帧。第一个图作为首帧，第二个图作为尾帧。就是从第一个图的状态，运镜变化到第二个图的状态。';

      const requestBody = {
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: headImage.file.type,
                  data: base64HeadImage
                }
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: tailImage.file.type,
                  data: base64TailImage
                }
              },
              {
                type: 'text',
                text: SYSTEM_PROMPT + `\n\n补充说明：${pairedPrompt}\n\n请分析这两张图片，生成适合图转视频的提示词，描述从第一张图到第二张图的运镜变化。`
              }
            ]
          }
        ]
      };

      // 通过后端代理调用 Claude API（解决 CORS 问题）
      const response = await fetch(
        `${API_URL}/ai-prompt/claude`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Claude API Error Response:', errorData);
        const errorMessage = `Claude API 失败 (${response.status}): ${JSON.stringify(errorData, null, 2)}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Claude API Response for paired images:', data);

      // Check if response has the expected structure
      if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
        const errorMessage = `Claude API 返回格式异常: ${JSON.stringify(data, null, 2)}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      const generatedText = data.content[0]?.text || '';
      if (!generatedText) {
        const errorMessage = `Claude API 未返回文本内容: ${JSON.stringify(data, null, 2)}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      console.log('Extracted text:', generatedText);
      return generatedText.trim();
    } catch (error) {
      console.error('Error generating prompt for paired images with Claude:', error);
      // Re-throw with full error details
      if (error instanceof Error) {
        throw new Error(`Claude 配对图生成失败: ${error.message}`);
      }
      throw new Error(`Claude 配对图生成失败: ${String(error)}`);
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

  // Paste prompts from clipboard
  const handlePastePrompts = async () => {
    try {
      // Read from clipboard
      const clipboardText = await navigator.clipboard.readText();

      // Parse JSON
      const parsedData = JSON.parse(clipboardText);

      // Validate format
      if (!Array.isArray(parsedData)) {
        alert('JSON格式错误：应该是数组格式');
        return;
      }

      // Check if array is empty
      if (parsedData.length === 0) {
        alert('JSON数据为空，无法导入');
        return;
      }

      // Check if count matches, but allow import with warning
      const minCount = Math.min(parsedData.length, images.length);
      if (parsedData.length !== images.length) {
        alert(`数量不匹配：JSON有${parsedData.length}条，图片有${images.length}张。将导入前${minCount}条数据`);
      }

      // 检测角色占位符
      const allCharacters = new Set<string>();
      parsedData.forEach((sceneData: any) => {
        if (sceneData?.prompts?.chinese) {
          const chars = detectCharacterPlaceholders(sceneData.prompts.chinese);
          chars.forEach(c => allCharacters.add(c));
        }
      });

      if (allCharacters.size > 0) {
        // 有角色占位符，显示对话框
        const charactersArray = Array.from(allCharacters).sort();
        const initialMappings: Record<string, string> = {};

        // 预填充历史映射
        charactersArray.forEach(char => {
          if (savedCharacterMappings[char]) {
            initialMappings[char] = savedCharacterMappings[char];
          }
        });

        setDetectedCharacters(charactersArray);
        setCharacterDescriptions(initialMappings);
        setPendingImportData({
          type: 'paste',
          data: parsedData
        });
        setShowCharacterMappingModal(true);
      } else {
        // 没有角色占位符，直接导入
        applyPasteDataFromJson(parsedData, {});
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        alert('JSON格式错误：无法解析剪贴板内容');
      } else if (error instanceof Error && error.message.includes('clipboard')) {
        alert('无法读取剪贴板，请检查浏览器权限');
      } else {
        alert('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
      }
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
        if (selectedModel === 'claude') {
          prompt = await generatePromptForPairedImagesClaude(image, tailImage);
        } else {
          prompt = await generatePromptForPairedImages(image, tailImage);
        }
      } else {
        // Generate for single image
        if (selectedModel === 'claude') {
          prompt = await generatePromptForImageClaude(image);
        } else {
          prompt = await generatePromptForImage(image);
        }
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
      const errorMessage = error instanceof Error ? error.message : '生成失败';
      console.error('Generate single error:', errorMessage);
      setImages(prev => prev.map(img =>
        (img.id === imageId || (isPaired && img.id === tailImage?.id))
          ? { ...img, error: errorMessage, isProcessing: false }
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

      // 如果已有生成内容，则跳过
      if (image.generatedPrompt) continue;

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
          if (selectedModel === 'claude') {
            prompt = await generatePromptForPairedImagesClaude(image, tailImage);
          } else {
            prompt = await generatePromptForPairedImages(image, tailImage);
          }
        } else {
          // Generate for single image
          if (selectedModel === 'claude') {
            prompt = await generatePromptForImageClaude(image);
          } else {
            prompt = await generatePromptForImage(image);
          }
        }

        setImages(prev => prev.map(img =>
          img.id === image.id
            ? { ...img, generatedPrompt: prompt, isProcessing: false }
            : (isPaired && img.id === tailImage?.id)
            ? { ...img, isProcessing: false }
            : img
        ));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '生成失败';
        console.error('Generate batch error:', errorMessage);
        setImages(prev => prev.map(img =>
          (img.id === image.id || (isPaired && img.id === tailImage?.id))
            ? { ...img, error: errorMessage, isProcessing: false }
            : img
        ));
      }

      // Add delay to avoid rate limiting
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsProcessingAll(false);

    // 显示完成提示
    const processedCount = images.filter(img => {
      // 跳过尾帧
      if (img.upLink && !img.downLink) return false;
      return img.generatedPrompt;
    }).length;
    alert(`Prompt 生成完成！共成功生成 ${processedCount} 个提示词。`);
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
      img.id === id ? {
        ...img,
        generatedPrompt: value,
        originalPrompt: undefined,      // 清除原始 prompt，保存时使用修改后的版本
        characterMappings: undefined    // 清除角色映射
      } : img
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
    console.log('[DEBUG] handleBatchGenerateVideos called!');
    console.log('[DEBUG] Images count:', images.length);
    console.log('[DEBUG] Images with prompts:', images.filter(img => img.generatedPrompt).length);

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
   * Handle batch video generation - Step 2: Execute submission (background mode)
   */
  const executeSubmission = async () => {
    // Hide confirm modal immediately, no progress modal blocking
    setShowConfirmModal(false);
    setIsSubmittingTasks(true);

    // Show starting toast
    setToastMessage({ type: 'success', message: '正在后台提交任务...' });

    // Create timeout promise (300 seconds)
    const TIMEOUT_MS = 300000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时（300秒），请检查网络后重试')), TIMEOUT_MS)
    );

    try {
      // Race between actual submission and timeout
      await Promise.race([
        (async () => {
          // Step 1: Upload images to R2
          const uploadedImages = await uploadImagesToR2();

          if (uploadedImages.length === 0) {
            throw new Error('图片上传失败，请重试');
          }

          // Step 2: Build tasks array
          const isSora = selectedVideoModel === 'sora-2-hd';
          const tasks: any[] = [];

          for (const img of images) {
            // For Sora: Process all images individually (no head-tail pairing)
            // For others: Skip tail frames (they're processed with head frames)
            if (!isSora && img.upLink && !img.downLink) continue;

            const uploadedImg = uploadedImages.find(u => u.id === img.id);
            if (!uploadedImg) continue;

            // Sora doesn't support head-tail pairing
            if (isSora) {
              tasks.push({
                imageUrl: uploadedImg.imageUrl,
                promptCn: img.generatedPrompt,
                promptEn: img.translatedPrompt
              });
            } else {
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
          }

          // Step 3: Submit tasks using selected video model
          // Determine which service to use and provider
          const isVeo = selectedVideoModel === 'veo-3.1-fast';
          const isJiMeng = selectedVideoModel === 'jimeng-official' || selectedVideoModel === 'jimeng-yunwu';

          console.log('[DEBUG] Video model selection:', {
            selectedVideoModel,
            isVeo,
            isSora,
            isJiMeng,
            selectedAspectRatio,
            tasksCount: tasks.length
          });

          // Call appropriate service
          const { taskIds } = isVeo
            ? await submitBatchTasksVeo(tasks, selectedAspectRatio)
            : isSora
            ? await submitBatchTasksSora(tasks as any, selectedAspectRatio)
            : isJiMeng
            ? await submitBatchTasksJiMeng(tasks, selectedVideoModel === 'jimeng-yunwu' ? 'yunwu' : 'official')
            : await submitBatchTasksHailuo(tasks);

          console.log('[DEBUG] Submission result:', { taskIds });

          // Map image IDs to task IDs
          // IMPORTANT: Must match the same filtering logic as task construction above
          let taskIndex = 0;
          const newMapping = new Map(videoTasks);
          for (const img of images) {
            if (img.upLink && !img.downLink) continue; // Skip tail frames

            // Check if image was successfully uploaded (same check as task construction)
            const uploadedImg = uploadedImages.find(u => u.id === img.id);
            if (!uploadedImg) continue; // Skip images that failed to upload

            if (taskIndex < taskIds.length) {
              const existingTasks = newMapping.get(img.id) || [];
              newMapping.set(img.id, [...existingTasks, taskIds[taskIndex]]);
              taskIndex++;
            }
          }
          setVideoTasks(newMapping);

          // Step 4: Start polling all tasks
          startPollingTasks();

          // Success: show auto-dismiss toast
          setToastMessage({ type: 'success', message: `成功提交 ${taskIds.length} 个视频生成任务！` });
          setTimeout(() => setToastMessage(null), 4000);
        })(),
        timeoutPromise
      ]);
    } catch (error: any) {
      console.error('Batch generate error:', error);
      // Clear any pending toast
      setToastMessage(null);
      // Error/timeout: require user confirmation
      alert(`提交失败: ${error.message}`);
    } finally {
      setIsSubmittingTasks(false);
    }
  };

  /**
   * Start polling tasks status
   * Always polls all unfinished tasks from videoTasks Map
   */
  const startPollingTasks = () => {
    // Don't clear existing interval - let it continue polling all tasks
    // Only create new interval if there isn't one running
    if (pollingInterval) {
      return; // Already polling, no need to restart
    }

    const pollTasks = async () => {
      try {
        // Get fresh reference to videoTasks by using state updater function
        setVideoTasks(currentTasks => {
          // Get all taskIds from current videoTasks Map
          const allTaskIds = Array.from(currentTasks.values()).flat();

          if (allTaskIds.length > 0) {
            // Poll all tasks using selected video model (async, but we don't await here to avoid blocking state update)
            const isVeo = selectedVideoModel === 'veo-3.1-fast';
            const isSora = selectedVideoModel === 'sora-2-hd';
            const isJiMeng = selectedVideoModel === 'jimeng-official' || selectedVideoModel === 'jimeng-yunwu';
            const pollFn = isVeo
              ? pollTasksStatusVeo
              : isSora
              ? pollTasksStatusSora
              : isJiMeng
              ? pollTasksStatusJiMeng
              : pollTasksStatusHailuo;
            pollFn(allTaskIds).then(tasks => {
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

                // 统计完成和失败的任务数
                const completed = tasks.filter(t => t.status === 'completed').length;
                const failed = tasks.filter(t => t.status === 'failed').length;
                setCompletedVideoCount(completed);
                setFailedVideoCount(failed);

                // 显示完成提示
                if (tasks.length > 0) {
                  setShowAllVideosCompleteModal(true);
                }
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
   * Execute regenerate video - Step 2: Execute submission (background mode)
   */
  const executeRegenerateVideo = async () => {
    if (!regenerateImageId) return;

    const img = images.find(i => i.id === regenerateImageId);
    if (!img || !img.generatedPrompt) return;

    // Hide confirm modal immediately, no progress modal blocking
    setShowRegenerateConfirm(false);
    setRegenerateImageId(null);

    // Show starting toast
    setToastMessage({ type: 'success', message: '正在后台提交任务...' });

    // Create timeout promise (300 seconds)
    const TIMEOUT_MS = 300000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时（300秒），请检查网络后重试')), TIMEOUT_MS)
    );

    // Store regenerateImageId in local variable since we cleared the state
    const currentImageId = regenerateImageId;

    try {
      await Promise.race([
        (async () => {
          // Upload image if not already uploaded
          const uploadedImages = await uploadImagesToR2();
          const uploadedImg = uploadedImages.find(u => u.id === currentImageId);
          if (!uploadedImg) {
            throw new Error('图片上传失败');
          }

          const isPaired = !!img.downLink;
          const tailImage = isPaired ? images.find(i => i.id === img.downLink) : null;
          const uploadedTailImg = isPaired && tailImage ? uploadedImages.find(u => u.id === tailImage.id) : null;

          const imageUrls = isPaired && uploadedTailImg
            ? [uploadedImg.imageUrl, uploadedTailImg.imageUrl]
            : [uploadedImg.imageUrl];

          const isJiMeng = selectedVideoModel === 'jimeng-official' || selectedVideoModel === 'jimeng-yunwu';
          const isVeo = selectedVideoModel === 'veo-3.1-fast';
          const isSora = selectedVideoModel === 'sora-2-hd';

          let taskId: string;

          if (isSora) {
            // Sora only supports single image
            const result = await regenerateTaskSora({
              imageUrl: uploadedImg.imageUrl,
              promptCn: img.generatedPrompt,
              promptEn: img.translatedPrompt,
              aspectRatio: selectedAspectRatio
            });
            taskId = result.taskId;
          } else if (isVeo) {
            const result = await regenerateTaskVeo({
              imageUrls,
              promptCn: img.generatedPrompt,
              promptEn: img.translatedPrompt,
              imageCount: imageUrls.length,
              aspectRatio: selectedAspectRatio
            });
            taskId = result.taskId;
          } else if (isJiMeng) {
            const result = await regenerateTaskJiMeng({
              imageUrls,
              promptCn: img.generatedPrompt,
              promptEn: img.translatedPrompt,
              imageCount: imageUrls.length,
              provider: selectedVideoModel === 'jimeng-yunwu' ? 'yunwu' : 'official'
            });
            taskId = result.taskId;
          } else {
            // Hailuo
            const result = await regenerateTaskHailuo({
              imageUrls,
              promptCn: img.generatedPrompt,
              promptEn: img.translatedPrompt,
              imageCount: imageUrls.length
            });
            taskId = result.taskId;
          }

          // Update mapping - add new taskId to existing array
          const newMapping = new Map(videoTasks);
          const existingTasks = newMapping.get(currentImageId) || [];
          newMapping.set(currentImageId, [...existingTasks, taskId]);
          setVideoTasks(newMapping);

          // Start polling all tasks (including this new one)
          startPollingTasks();

          // Success: show auto-dismiss toast
          setToastMessage({ type: 'success', message: '重新生成任务已提交！' });
          setTimeout(() => setToastMessage(null), 4000);
        })(),
        timeoutPromise
      ]);
    } catch (error: any) {
      console.error('Regenerate error:', error);
      // Clear any pending toast
      setToastMessage(null);
      // Error/timeout: require user confirmation
      alert(`提交失败: ${error.message || '重新生成失败'}`);
    }
  };

  /**
   * Handle batch download videos - support multiple versions
   */
  const handleBatchDownloadVideos = async () => {
    try {
      // Get all images with taskIds
      const imagesWithTasks = Array.from(videoTasks.entries())
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
          const { taskId, task } = completedTasks[versionIndex];

          const prompt = img.generatedPrompt || 'video';
          const cleanPrompt = prompt.substring(0, 50).replace(/[/\\:*?\"<>|]/g, '_');

          // Filename format: 001.mp4 (single version) or 001-1.mp4, 001-2.mp4 (multiple versions)
          const filename = completedTasks.length > 1
            ? `${imageIndex}-${versionIndex + 1}_${cleanPrompt}.mp4`
            : `${imageIndex}_${cleanPrompt}.mp4`;

          // Use proxy URL for JiMeng videos (to avoid CORS issues)
          let videoUrl = task.videoUrl;
          const isJiMeng = selectedVideoModel === 'jimeng-official' || selectedVideoModel === 'jimeng-yunwu';
          if (isJiMeng && task.videoUrl.includes('volces.com')) {
            videoUrl = `${API_URL}/jimeng-tasks/download/${taskId}`;
          }

          videosToDownload.push({ filename, url: videoUrl });
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
          // Add auth header for proxy requests
          const fetchOptions: RequestInit = {};
          if (video.url.includes('/jimeng-tasks/download/')) {
            const token = localStorage.getItem('token');
            if (token) {
              fetchOptions.headers = {
                'Authorization': `Bearer ${token}`
              };
            }
          }

          const response = await fetch(video.url, fetchOptions);
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
   * Handle single video download with custom filename
   */
  const handleDownloadSingleVideo = async (videoUrl: string, filename: string) => {
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
      {/* Character Mapping Modal */}
      {showCharacterMappingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              设置角色描述
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              检测到 {detectedCharacters.length} 个角色占位符，请输入具体描述：
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
              {detectedCharacters.map(character => (
                <div key={character}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {character}
                  </label>
                  <input
                    type="text"
                    value={characterDescriptions[character] || ''}
                    onChange={(e) => {
                      setCharacterDescriptions(prev => ({
                        ...prev,
                        [character]: e.target.value
                      }));
                    }}
                    placeholder="例如：紫头发女人"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCharacterMappingModal(false);
                  setCharacterDescriptions({});
                  setPendingImportData(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  // 检查是否所有角色都填写了描述
                  const allFilled = detectedCharacters.every(char =>
                    characterDescriptions[char] && characterDescriptions[char].trim()
                  );

                  if (!allFilled) {
                    alert('请为所有角色输入描述');
                    return;
                  }

                  // 保存到历史映射
                  const updatedMappings = { ...savedCharacterMappings, ...characterDescriptions };
                  setSavedCharacterMappings(updatedMappings);
                  localStorage.setItem('characterMappings', JSON.stringify(updatedMappings));

                  // 处理导入数据
                  handleCharacterMappingConfirm();

                  setShowCharacterMappingModal(false);
                }}
                disabled={!detectedCharacters.every(char =>
                  characterDescriptions[char] && characterDescriptions[char].trim()
                )}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  detectedCharacters.every(char =>
                    characterDescriptions[char] && characterDescriptions[char].trim()
                  )
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {toastMessage.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <span className="w-5 h-5 flex items-center justify-center font-bold">!</span>
            )}
            <span>{toastMessage.message}</span>
          </div>
        </div>
      )}

      {/* All Videos Complete Modal */}
      {showAllVideosCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">视频生成完成！</h3>
            </div>
            <div className="text-gray-600 text-center mb-2">
              <p className="mb-2">
                成功生成 <span className="font-bold text-green-600">{completedVideoCount}</span> 个视频
              </p>
              {failedVideoCount > 0 && (
                <p className="text-red-600">
                  失败 <span className="font-bold">{failedVideoCount}</span> 个
                </p>
              )}
            </div>
            <p className="text-sm text-gray-500 text-center mb-6">
              您可以在右侧第四列查看视频结果，或使用「批量下载视频」按钮下载所有视频。
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowAllVideosCompleteModal(false)}
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
          <p className="text-gray-600 mb-4">
            上传图片，使用 AI 模型生成适合图转视频的提示词
          </p>

          {/* Model Selectors */}
          <div className="space-y-3">
            {/* AI Model Selector (for prompt generation) */}
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-4 py-2 border border-gray-200">
              <span className="text-sm font-medium text-gray-700 min-w-[80px]">文案模型:</span>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="aiModel"
                  value="gemini-flash"
                  checked={selectedModel === 'gemini-flash'}
                  onChange={(e) => {
                    setSelectedModel(e.target.value as AIModel);
                    localStorage.setItem('aiModel', e.target.value);
                  }}
                  className="mr-1.5 w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Gemini Flash</span>
              </label>
              <label className="flex items-center cursor-pointer ml-3">
                <input
                  type="radio"
                  name="aiModel"
                  value="gemini-pro"
                  checked={selectedModel === 'gemini-pro'}
                  onChange={(e) => {
                    setSelectedModel(e.target.value as AIModel);
                    localStorage.setItem('aiModel', e.target.value);
                  }}
                  className="mr-1.5 w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Gemini 3</span>
              </label>
              <label className="flex items-center cursor-pointer ml-3">
                <input
                  type="radio"
                  name="aiModel"
                  value="claude"
                  checked={selectedModel === 'claude'}
                  onChange={(e) => {
                    setSelectedModel(e.target.value as AIModel);
                    localStorage.setItem('aiModel', e.target.value);
                  }}
                  className="mr-1.5 w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Claude</span>
              </label>
            </div>

            {/* Video Model Selector (for video generation) */}
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-4 py-2 border border-gray-200">
              <span className="text-sm font-medium text-gray-700 min-w-[80px]">视频模型:</span>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="videoModel"
                  value="jimeng-official"
                  checked={selectedVideoModel === 'jimeng-official'}
                  onChange={(e) => {
                    setSelectedVideoModel(e.target.value as VideoModel);
                    localStorage.setItem('videoModel', e.target.value);
                  }}
                  className="mr-1.5 w-4 h-4 text-purple-600"
                />
                <span className="text-sm text-gray-700">即梦（官方）</span>
              </label>
              <label className="flex items-center cursor-pointer ml-3">
                <input
                  type="radio"
                  name="videoModel"
                  value="jimeng-yunwu"
                  checked={selectedVideoModel === 'jimeng-yunwu'}
                  onChange={(e) => {
                    setSelectedVideoModel(e.target.value as VideoModel);
                    localStorage.setItem('videoModel', e.target.value);
                  }}
                  className="mr-1.5 w-4 h-4 text-purple-600"
                />
                <span className="text-sm text-gray-700">即梦（云雾接口）</span>
              </label>
              <label className="flex items-center cursor-pointer ml-3">
                <input
                  type="radio"
                  name="videoModel"
                  value="hailuo"
                  checked={selectedVideoModel === 'hailuo'}
                  onChange={(e) => {
                    setSelectedVideoModel(e.target.value as VideoModel);
                    localStorage.setItem('videoModel', e.target.value);
                  }}
                  className="mr-1.5 w-4 h-4 text-purple-600"
                />
                <span className="text-sm text-gray-700">海螺</span>
              </label>
              <label className="flex items-center cursor-pointer ml-3">
                <input
                  type="radio"
                  name="videoModel"
                  value="veo-3.1-fast"
                  checked={selectedVideoModel === 'veo-3.1-fast'}
                  onChange={(e) => {
                    setSelectedVideoModel(e.target.value as VideoModel);
                    localStorage.setItem('videoModel', e.target.value);
                  }}
                  className="mr-1.5 w-4 h-4 text-purple-600"
                />
                <span className="text-sm text-gray-700">Veo 3.1 Fast</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="videoModel"
                  value="sora-2-hd"
                  checked={selectedVideoModel === 'sora-2-hd'}
                  onChange={(e) => {
                    setSelectedVideoModel(e.target.value as VideoModel);
                    localStorage.setItem('videoModel', e.target.value);
                  }}
                  className="mr-1.5 w-4 h-4 text-purple-600"
                />
                <span className="text-sm text-gray-700">Sora 2 HD</span>
              </label>
            </div>

            {/* Aspect Ratio Selector (Veo and Sora both support 16x9 and 9x16) */}
            {(selectedVideoModel === 'veo-3.1-fast' || selectedVideoModel === 'sora-2-hd') && (
              <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-4 py-2 border border-gray-200">
                <span className="text-sm font-medium text-gray-700 min-w-[80px]">视频比例:</span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="aspectRatio"
                    value="9x16"
                    checked={selectedAspectRatio === '9x16'}
                    onChange={(e) => {
                      setSelectedAspectRatio(e.target.value as AspectRatio);
                      localStorage.setItem('aspectRatio', e.target.value);
                    }}
                    className="mr-1.5 w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">9x16 (竖屏)</span>
                </label>
                <label className="flex items-center cursor-pointer ml-3">
                  <input
                    type="radio"
                    name="aspectRatio"
                    value="16x9"
                    checked={selectedAspectRatio === '16x9'}
                    onChange={(e) => {
                      setSelectedAspectRatio(e.target.value as AspectRatio);
                      localStorage.setItem('aspectRatio', e.target.value);
                    }}
                    className="mr-1.5 w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">16x9 (横屏)</span>
                </label>
              </div>
            )}
          </div>
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
                  拖拽图片或视频到此处或点击上传
                </p>
                <p className="text-xs text-gray-500">
                  支持批量上传多张图片，视频将自动提取第一帧
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>选择图片/视频</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
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
                  onClick={() => setShowSavePromptModal(true)}
                  disabled={images.filter(img => img.generatedPrompt).length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    images.filter(img => img.generatedPrompt).length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  保存Prompt
                </button>

                <button
                  onClick={() => setShowImportPromptModal(true)}
                  disabled={images.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    images.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-teal-500 text-white hover:bg-teal-600'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  导入图转视频Prompt
                </button>

                <button
                  onClick={() => setShowImportScriptModal(true)}
                  disabled={images.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    images.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  导入脚本动态描述
                </button>

                <button
                  onClick={handlePastePrompts}
                  disabled={images.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    images.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  <Clipboard className="w-4 h-4" />
                  粘贴Prompt
                </button>

                <button
                  onClick={handleProcessAll}
                  disabled={isProcessingAll || images.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    isProcessingAll
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {isProcessingAll ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      一键生成 Prompt
                    </>
                  )}
                </button>

                <button
                  onClick={handleBatchTranslate}
                  disabled={images.filter(img => img.generatedPrompt && !img.translatedPrompt).length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    images.filter(img => img.generatedPrompt && !img.translatedPrompt).length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <Languages className="w-4 h-4" />
                  批量翻译
                </button>

                <button
                  onClick={() => handleDownloadAll(false)}
                  disabled={images.filter(img => img.generatedPrompt).length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    images.filter(img => img.generatedPrompt).length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  下载中文版
                </button>

                <button
                  onClick={() => handleDownloadAll(true)}
                  disabled={images.filter(img => img.translatedPrompt).length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    images.filter(img => img.translatedPrompt).length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  下载英文版
                </button>

                <button
                  onClick={handleBatchGenerateVideos}
                  disabled={isSubmittingTasks || images.length === 0 || images.filter(img => img.generatedPrompt).length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    isSubmittingTasks || images.length === 0 || images.filter(img => img.generatedPrompt).length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  {isSubmittingTasks ? '提交中...' : '批量生成视频'}
                </button>

                <button
                  onClick={() => setShowBatchDownloadConfirm(true)}
                  disabled={Array.from(taskStatuses.values()).filter(t => t.status === 'completed').length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    Array.from(taskStatuses.values()).filter(t => t.status === 'completed').length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  <Download className="w-4 h-4" />
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


        {/* Image Cards */}
        <div className="grid grid-cols-1 gap-3">
          {images.map((image, index) => {
            // Skip images that are tail frames in a pair (have upLink but are not also head frames)
            if (image.upLink && !image.downLink) {
              return null;
            }

            // Calculate actual row number (excluding tail frames)
            const rowNumber = images.slice(0, index).filter(img => !(img.upLink && !img.downLink)).length + 1;
            const formattedRowNumber = String(rowNumber).padStart(3, '0');

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

                {/* Link buttons - vertical layout (hide for Sora) */}
                {selectedVideoModel !== 'sora-2-hd' && (
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
                )}

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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(image.generatedPrompt, image.id)}
                            disabled={!image.generatedPrompt}
                            className={`flex items-center gap-1 text-xs ${
                              !image.generatedPrompt
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-blue-500 hover:text-blue-700'
                            }`}
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
                        </div>
                      </div>
                      <textarea
                        value={image.generatedPrompt}
                        onChange={(e) => updateGeneratedPrompt(image.id, e.target.value)}
                        placeholder={image.error || "等待生成..."}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                          image.error ? 'border-red-300 text-red-500' : 'border-gray-300 bg-white'
                        }`}
                        rows={7}
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
                          const taskIds = videoTasks.get(image.id) || [];

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
                              // Generate filename similar to batch download
                              const prompt = image.generatedPrompt || 'video';
                              const cleanPrompt = prompt.substring(0, 50).replace(/[/\\:*?\"<>|]/g, '_');
                              const filename = taskIds.length > 1
                                ? `${formattedRowNumber}-${versionNumber}_${cleanPrompt}.mp4`
                                : `${formattedRowNumber}_${cleanPrompt}.mp4`;

                              return (
                                <div key={taskId} className="relative group">
                                  <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded z-10">
                                    版本 {versionNumber}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadSingleVideo(task.videoUrl, filename);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 z-10"
                                    title="下载此版本"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
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

      {/* Save Prompt Modal */}
      {showSavePromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">保存图转视频Prompt</h3>
            {workSnapshots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">请先在 workspace 创建工作记录</p>
                <button
                  onClick={() => setShowSavePromptModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  关闭
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveVideoPrompts}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      选择工作记录
                    </label>
                    <select
                      name="snapshotId"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {workSnapshots.map((snapshot: any) => {
                        const snapshotTime = new Date(snapshot.createdAt).toLocaleString('zh-CN');
                        const snapshotName = snapshot.customName || snapshot.snapshotName;
                        return (
                          <option key={snapshot.id} value={snapshot.id}>
                            {snapshotTime} - {snapshotName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prompt名称
                    </label>
                    <input
                      type="text"
                      name="promptName"
                      required
                      placeholder="例如：第一版提示词"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSavePromptModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                  >
                    保存
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Import Prompt Modal */}
      {showImportPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">导入图转视频Prompt</h3>
            {snapshotsWithPrompts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">没有可导入的提示词记录</p>
                <button
                  onClick={() => setShowImportPromptModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  关闭
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    选择要导入的Prompt
                  </label>
                  <select
                    value={selectedPromptId}
                    onChange={(e) => setSelectedPromptId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">请选择...</option>
                    {snapshotsWithPrompts.map(snapshot =>
                      snapshot.prompts.map((prompt: any) => {
                        const snapshotTime = new Date(snapshot.createdAt).toLocaleString('zh-CN');
                        const snapshotName = snapshot.customName || snapshot.snapshotName;
                        const displayText = `${snapshotTime} - ${snapshotName} - ${prompt.promptName}`;
                        return (
                          <option key={prompt.promptId} value={prompt.promptId}>
                            {displayText}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowImportPromptModal(false);
                      setSelectedPromptId('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleImportVideoPrompts}
                    disabled={!selectedPromptId}
                    className={`flex-1 px-4 py-2 rounded-lg ${
                      selectedPromptId
                        ? 'bg-teal-500 text-white hover:bg-teal-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    导入
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Script Modal */}
      {showImportScriptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">导入脚本动态描述</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  脚本类型
                </label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="scriptScope"
                      value="mine"
                      checked={scriptScope === 'mine'}
                      onChange={(e) => {
                        setScriptScope(e.target.value as 'mine' | 'system');
                        setSelectedScriptId('');
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">我的脚本</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="scriptScope"
                      value="system"
                      checked={scriptScope === 'system'}
                      onChange={(e) => {
                        setScriptScope(e.target.value as 'mine' | 'system');
                        setSelectedScriptId('');
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">系统库</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择脚本
                </label>
                <select
                  value={selectedScriptId}
                  onChange={(e) => setSelectedScriptId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">请选择...</option>
                  {(scriptScope === 'mine' ? userScripts : systemScripts).map(script => (
                    <option key={script.id} value={script.id}>
                      {script.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowImportScriptModal(false);
                    setSelectedScriptId('');
                    setScriptScope('mine');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={handleImportScriptDynamicDescription}
                  disabled={!selectedScriptId}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    selectedScriptId
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPromptGenerator;