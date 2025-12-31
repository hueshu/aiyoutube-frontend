import React, { useState, useEffect } from 'react';
import { Upload, Download, Copy, Loader, Check } from 'lucide-react';
import { API_URL } from '../config/api';
import JSZip from 'jszip';

interface ImageFile {
  id: string;
  name: string;
  file: File;
  preview: string;
}

type AIModel = 'gemini-flash' | 'gemini-pro' | 'claude';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('VITE_GEMINI_API_KEY is not configured');
}
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

// Full prompt document content
const PROMPT_DOCUMENT = `# 分镜图片信息提取与Prompt生成指南

## 任务目标
根据已有的分镜图片,提取画面信息并生成标准化的分镜prompt,用于重新生成分镜图。

---

## 提取步骤

### 第一步:识别图片中的基本信息
仔细观察图片,按以下顺序提取信息:

1. **场景数量**: 这是第几个分镜?
2. **角色数量**: 画面中有几个角色?
3. **场景类型**: 室内/室外/特殊环境
4. **光线状态**: 白天/黄昏/夜晚/特殊光线

### 第二步:详细分析每个元素

#### 1. 主体分析(角色)

**角色识别**
- 记录为:角色A、角色B、角色C...
- 数量:画面中有几个角色
- 位置关系:谁在左/右/前/后

**表情描述**
- 必须先说明**情绪名称**:愤怒、惊讶、开心、悲伤、恐惧等
- 然后描述**具体特征**:
  - 眼睛:瞪大/眯起/半闭/怒视
  - 嘴巴:张开/紧闭/上扬/下垂
  - 眉毛:上扬/紧锁/舒展
  - 其他:脸红/流汗/皱鼻

**示例**:
\`\`\`
✅ 正确:愤怒,眉头紧锁,牙关紧咬,眼睛瞪大
❌ 错误:眉头紧锁,牙关紧咬 (缺少情绪名称)
\`\`\`

**姿态描述**(重要:必须是静态瞬间)
- 身体朝向:面向哪里(正面/侧面/背面)
- 身体角度:直立/前倾/后仰/弯腰
- 手臂位置:
  - 举起(到哪里:胸前/头顶/身侧)
  - 垂下(自然垂/握拳)
  - 伸出(指向哪里)
  - 交叉(胸前/身后)
- 腿部姿态:
  - 站姿:并拢/分开/弓步
  - 坐姿:端坐/侧坐/翘腿
  - 跪/蹲/跳跃的定格姿态
- 重心位置:在哪只脚/前倾/后仰

**姿态描述禁忌**(这些词汇必须避免):
- ❌ 颤抖、摇晃、抖动
- ❌ 正在...、慢慢...、逐渐...
- ❌ 转头、转身(只能说"头转向左侧45度")

**姿态示例**:
\`\`\`
✅ 正确:右拳收在腰侧,左拳护在下巴前,双脚前后站立,重心在前脚
✅ 正确:身体前倾45度,双手撑在桌面,膝盖微曲
❌ 错误:身体颤抖着后退
❌ 错误:正在转身
\`\`\`

#### 2. 环境分析

**空间位置**
- 具体地点:办公室/街道/公园/餐厅...
- 区域细节:角落/中央/窗边/门口...

**可见物体**
- 家具:桌子/椅子/柜子的位置和状态
- 装饰:墙上的画/窗帘/地毯
- 道具:桌上的物品/散落的东西

**光线状态**
- 光源:阳光/灯光/烛光/月光
- 光线方向:从哪里照来
- 阴影:有哪些阴影

**氛围细节**
- 色调:温暖/冷色/昏暗/明亮
- 天气迹象:雨滴/阳光/乌云

**环境描述禁忌**:
- ❌ 声音(音乐/说话声/噪音)
- ❌ 气味(香味/臭味)
- ❌ 触感(柔软/冰冷)
- ❌ 心理活动

#### 3. 时间与天气

**时间**
- 具体时刻:早晨6点/下午3点/深夜12点
- 或时段:早晨/中午/下午/黄昏/夜晚/深夜

**天气**
- 室外:晴天/阴天/雨天/雪天/雾天
- 室内:直接写"室内"

#### 4. 镜头语言

**视角选择**
- 平视:与角色眼睛同高
- 俯视:从上往下看
- 仰视:从下往上看
- 鸟瞰:正上方垂直看
- 主观视角:从角色眼睛看出去
- 过肩视角:从一个角色肩后看另一个

**景别选择**
- 特写:面部或物体细节
- 近景:胸部以上
- 中景:膝盖以上  
- 全景:完整人物及周围环境
- 远景:大范围环境,人物较小

### 第三步:生成标准格式Prompt

#### 单个角色格式:
\`\`\`
[主体]
角色:角色A
表情:愤怒,眉头紧锁,牙关紧咬
姿态:右拳举到头侧最高点,身体后仰,重心在后脚
[环境]
办公室内,角色A站在办公桌前,桌上文件凌乱,咖啡杯在桌边
[时间]
晚上8点
[天气]
室内
[视角]
平视
[景别]
中景
\`\`\`

#### 多角色格式(含位置):
\`\`\`
[主体]
角色:角色A,角色B
位置:角色A在左前方,角色B在右侧靠近门口
表情:
- 角色A:惊讶,眼睛瞪大,嘴巴微张
- 角色B:冷漠,眉头微皱,嘴角下垂
姿态:
- 角色A:双手握拳放在胸前,身体略微后仰
- 角色B:双臂交叉抱胸,身体笔直站立
[环境]
会议室内,长桌中央有文件散落,窗帘半拉,光线昏暗
[时间]
下午5点
[天气]
室内
[视角]
全景
[景别]
全景
\`\`\`

#### 无人场景格式:
\`\`\`
[主体]
角色:无
表情:无
姿态:汽车停在路边,车门半开,车灯还亮着
[环境]
深夜的街道,路灯昏暗,地上有水迹反光,远处有建筑轮廓
[时间]
凌晨2点
[天气]
雨后
[视角]
平视
[景别]
全景
\`\`\`

---

## 第四步:生成动态过程描述(CSV第三列)

虽然分镜prompt是静态的,但需要补充动态过程描述,用于理解前后分镜的连接。

### 动态描述包含:

**1. 表情变化过程**
- 从...转为.../变成.../闪过...
- 例:"表情从愤怒转为后悔"

**2. 动作完整流程**
- 可以用"颤抖/摇晃/转动"等词
- 例:"手臂颤抖着举起,然后重重拍向桌面"

**3. 角色互动**
- 推开/拉住/甩开/扶起
- 例:"角色A推开角色B,转身走向门口"

**4. 性格体现**
- 通过副词强化
- 例:"狠狠地摔门而出"/"小心翼翼地靠近"

**5. 环境连锁反应**
- 例:"桌子剧烈震动,咖啡杯倒下洒满文件"

**动态描述示例**:
\`\`\`
角色A手臂颤抖着抬起,拳头握紧,然后狠狠砸向桌面。桌子剧烈震动,咖啡杯倒下,咖啡洒满文件。角色A表情从愤怒转为震惊,然后是后悔,双手颤抖着看着被毁的文件。
\`\`\`

---

## 第五步:角色特征提取(CSV第四列)

从画面中提取角色的**外观特征**,用于保持角色一致性。

### 标准格式:
\`\`\`
角色A:性别年龄(服装,发色发型)
\`\`\`

### 提取要素:

**1. 基础身份** (必须)
- 性别年龄:中年男人/年轻女人/小男孩/老奶奶

**2. 服装颜色** (必须)
- 颜色+款式:蓝色西装/红色连衣裙/黑色T恤

**3. 发型发色** (必须)
- 颜色:黑发/金发/白发/棕发/光头
- 样式:短发/长发/马尾/卷发/盘起

**4. 显著特征** (可选,用于区分)
- 眼镜/胡子/疤痕/帽子

### 正确示例:
\`\`\`
✅ 角色A:中年男人(蓝色西装,黑发短发,戴眼镜)
✅ 角色B:年轻女人(红色连衣裙,金发长发)
✅ 角色C:小男孩(校服,棕色短发)
✅ 角色D:老爷爷(格子衬衫,白发稀疏,拄拐杖)
\`\`\`

### 错误示例:
\`\`\`
❌ 角色A:蓝色西装,黑发 (没说性别年龄)
❌ 角色B:高大魁梧的男人 (不要用体型词)
❌ 角色C:英俊的年轻人 (不要用外貌评价)
\`\`\`

### 非人类角色:
\`\`\`
角色E:金毛犬(脖子上红色项圈)
角色F:黑猫(蓝色眼睛)
\`\`\`

---

## CSV完整格式输出

### 表头:
\`\`\`csv
分镜数,分镜提示词,动态过程描述,角色特征
\`\`\`

### 内容行示例:
\`\`\`csv
1,"[主体]
角色:角色A
表情:愤怒,眉头紧锁,牙关紧咬
姿态:右拳举到头侧最高点,身体后仰,重心在后脚
[环境]
办公室内,角色A站在办公桌前,桌上文件凌乱,咖啡杯在桌边
[时间]
晚上8点
[天气]
室内
[视角]
平视
[景别]
中景","角色A手臂颤抖着抬起,拳头握紧,然后狠狠拍向桌面。桌子剧烈震动,咖啡杯倒下洒满文件。角色A表情从愤怒转为后悔,身体微微颤抖","角色A:中年男人(蓝色西装,黑发短发)"
\`\`\`

---

## 质量检查清单

在生成prompt后,请检查:

### 静态描述检查(第二列):
- [ ] 表情包含情绪名称了吗?
- [ ] 姿态是完全静态的吗?(没有"颤抖""转动"等词)
- [ ] 环境描述只有视觉元素吗?(没有声音气味)
- [ ] 时间和天气明确了吗?
- [ ] 视角和景别选择了吗?

### 动态描述检查(第三列):
- [ ] 描述了完整的动作过程吗?
- [ ] 体现了性格特征吗?
- [ ] 包含了表情变化吗?
- [ ] 有角色互动细节吗?(如果多人)
- [ ] 字数在60-120字之间吗?

### 角色特征检查(第四列):
- [ ] 说明了性别年龄吗?
- [ ] 描述了服装吗?
- [ ] 说明了发型发色吗?
- [ ] 同场景的角色能区分开吗?
- [ ] 格式简洁(15-25字)吗?

---

## 常见错误对照表

| 错误 | 正确 |
|------|------|
| 表情:眼睛瞪大,嘴巴张开 | 表情:惊讶,眼睛瞪大,嘴巴张开 |
| 姿态:身体颤抖着后退 | 姿态:身体后仰,重心在后脚,双手举到胸前 |
| 姿态:正在转身逃跑 | 姿态:身体转向门口,右脚在前呈冲刺姿态 |
| 环境:房间里响起音乐 | 环境:房间角落有音响设备,指示灯亮着 |
| 角色A:高大的男人 | 角色A:中年男人(黑色西装,短发) |

---

## 批量处理建议

处理多张分镜图时:

1. **保持角色一致性**
   - 同一角色的特征描述要完全一致
   - 建议先整理一份角色对照表

2. **注意分镜连贯性**
   - 时间/地点的合理过渡
   - 角色位置的逻辑延续

3. **最后添加完整信息**
   \`\`\`
   【角色设定】
   角色A:女性,28岁,公司职员
   角色B:男性,35岁,公司经理
   
   【故事梗概】
   (简要说明这组分镜讲述的故事)
   \`\`\`

---

## 重要提醒

1. **静态 vs 动态**
   - 第二列(分镜提示词):绝对静态,照片能拍到的瞬间
   - 第三列(动态过程):可以有动态词汇

2. **情绪名称优先**
   - 表情描述必须先说情绪(愤怒/开心/悲伤...)
   - 然后才说具体特征(眉头紧锁...)

3. **简洁准确**
   - 角色特征控制在15-25字
   - 突出最关键的识别特征

4. **服务于重生成**
   - 提取的prompt要足够详细,能还原画面
   - 但不要过度描述,保持重点突出
`;

// System instruction for output format
const SYSTEM_INSTRUCTION = `你必须严格按照CSV格式输出,包含四列:分镜数,分镜提示词,动态过程描述,角色特征。
每个分镜一行,所有文本字段都用双引号包裹。
角色特征格式示例:角色A:中年男人(蓝色西装,黑发短发),多角色用分号分隔。
不要添加任何额外的解释或说明,只输出CSV格式的内容。`;

const VideoScriptGenerator: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [supplementPrompt, setSupplementPrompt] = useState<string>('');
  const [csvOutput, setCsvOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedState, setCopiedState] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // AI Model selection state
  const [selectedModel, setSelectedModel] = useState<AIModel>(() => {
    return (localStorage.getItem('scriptGeneratorModel') as AIModel) || 'gemini-pro';
  });

  // Update supplement prompt when images change
  useEffect(() => {
    if (images.length > 0) {
      setSupplementPrompt(`一共${images.length}个分镜。`);
    }
  }, [images.length]);

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

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    // 按文件名排序
    const sortedFiles = Array.from(files).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const newImages: ImageFile[] = [];

    for (const file of sortedFiles) {
      if (file.type.startsWith('image/')) {
        // 图片文件 - 直接添加
        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          file: file,
          preview: URL.createObjectURL(file)
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
            preview: previewUrl
          });
        } catch (error) {
          console.error(`提取视频第一帧失败: ${file.name}`, error);
          alert(`处理视频失败: ${file.name}\n${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    }

    // 合并并重新排序（因为视频文件名会改变）
    const allImages = [...images, ...newImages].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    setImages(allImages);
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

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (files.length > 0) {
      const fileList = new DataTransfer();
      files.forEach(file => fileList.items.add(file));
      handleFileUpload(fileList.files);
    }
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

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };

  // Generate with Claude API (multi-image)
  const generateWithClaude = async (images: Array<{ file: File }>, supplementPrompt: string) => {
    try {
      // Convert images to base64
      const imageContents = await Promise.all(
        images.map(async (img) => ({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: img.file.type,
            data: await fileToBase64(img.file)
          }
        }))
      );

      // Build messages with PROMPT_DOCUMENT, supplementPrompt, and images
      const requestBody = {
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        system: SYSTEM_INSTRUCTION,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT_DOCUMENT },
              { type: 'text', text: supplementPrompt },
              ...imageContents
            ]
          }
        ]
      };

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
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData, null, 2));
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  };

  // Generate script
  const handleGenerate = async () => {
    if (images.length === 0) {
      alert('请至少上传一张图片');
      return;
    }

    setIsProcessing(true);
    setCsvOutput('');

    try {
      let text: string;

      if (selectedModel === 'claude') {
        // Use Claude API
        text = await generateWithClaude(images, supplementPrompt);
      } else {
        // Use Gemini API (Flash or Pro)
        const geminiModel = selectedModel === 'gemini-flash' ? 'gemini-2.5-flash' : 'gemini-3-pro-preview';

        const imageParts = await Promise.all(
          images.map(async (img) => ({
            inline_data: {
              mime_type: img.file.type,
              data: await fileToBase64(img.file)
            }
          }))
        );

        const generateResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
              },
              contents: [
                {
                  parts: [
                    { text: PROMPT_DOCUMENT },
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
          throw new Error(JSON.stringify(errorData, null, 2));
        }

        const data = await generateResponse.json();
        text = data.candidates[0].content.parts[0].text;
      }

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

  // Download TXT
  const downloadCSV = () => {
    const blob = new Blob([csvOutput], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video_script_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 批量下载所有图片（打包为ZIP）
  const downloadAllImages = async () => {
    if (images.length === 0) return;

    const zip = new JSZip();

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const paddedIndex = String(i + 1).padStart(3, '0');
      const fileName = `${paddedIndex}_${img.name}`;

      const arrayBuffer = await img.file.arrayBuffer();
      zip.file(fileName, arrayBuffer);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `分镜图片_${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            分镜图片信息提取
          </h1>
          <p className="text-gray-600">
            上传分镜图片,提取画面信息并生成标准化的分镜Prompt（CSV格式,包含4列:分镜数、分镜提示词、动态过程描述、角色特征）
          </p>
        </div>

        {/* Step 1: Upload Images */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-800">
                第一步：上传图片（自动按文件名排序）
              </h2>

              {/* Upload Area - Inline */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg px-4 py-2 transition-colors inline-block ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">点击上传或拖拽图片/视频到此处</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            {images.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={downloadAllImages}
                  className="px-4 py-2 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>批量下载</span>
                </button>
                <button
                  onClick={() => setImages([])}
                  className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
                >
                  清空图片
                </button>
              </div>
            )}
          </div>

          {/* Image List */}
          {images.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">已上传 {images.length} 张图片</p>
              <div className="flex flex-wrap gap-2">
                {images.map((img, index) => (
                  <div key={img.id} className="relative group">
                    <div className="h-[150px] flex items-center justify-center bg-gray-100 rounded border overflow-hidden p-1">
                      <img
                        src={img.preview}
                        alt={img.name}
                        className="max-h-full max-w-full object-contain"
                        style={{ maxWidth: '200px' }}
                      />
                    </div>
                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                      #{index + 1}
                    </div>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      删除
                    </button>
                    <p className="text-xs text-gray-600 mt-0.5 text-center truncate max-w-[200px]">{img.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Supplement Prompt */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            第二步：补充Prompt
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

        {/* Step 3: Select AI Model */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            第三步：选择AI模型
          </h2>
          <div className="flex space-x-4">
            <button
              onClick={() => {
                setSelectedModel('gemini-flash');
                localStorage.setItem('scriptGeneratorModel', 'gemini-flash');
              }}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                selectedModel === 'gemini-flash'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Gemini 2.5 Flash
            </button>
            <button
              onClick={() => {
                setSelectedModel('gemini-pro');
                localStorage.setItem('scriptGeneratorModel', 'gemini-pro');
              }}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                selectedModel === 'gemini-pro'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Gemini 3
            </button>
            <button
              onClick={() => {
                setSelectedModel('claude');
                localStorage.setItem('scriptGeneratorModel', 'claude');
              }}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                selectedModel === 'claude'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Claude Sonnet 4.5
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            当前模型：{selectedModel === 'gemini-flash' ? 'Gemini 2.5 Flash' : selectedModel === 'gemini-pro' ? 'Gemini 3' : 'Claude Sonnet 4.5'}
          </p>
        </div>

        {/* Generate Button */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={handleGenerate}
            disabled={isProcessing || images.length === 0}
            className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <span>提取分镜信息（CSV格式）</span>
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
                  <span>下载txt</span>
                </button>
              </div>
            </div>
            <textarea
              value={csvOutput}
              readOnly
              className="w-full h-[1536px] border rounded-md p-4 font-mono text-sm resize-none bg-gray-50"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoScriptGenerator;
