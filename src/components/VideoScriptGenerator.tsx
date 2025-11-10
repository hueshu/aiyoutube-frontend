import React, { useState, useEffect } from 'react';
import { Upload, Download, Copy, Loader, Check } from 'lucide-react';
import { API_URL } from '../config/api';

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
const PROMPT_DOCUMENT = `## 十一、剧情节奏与视觉设计

### 第一幕：开场冲击力设计

#### 开场原则:"开幕雷击"
第一幕(前3-5个分镜)应该有强烈的视觉冲击或情感冲突,立即抓住观众注意力。以下为参考示例,实际创作应根据具体故事主题灵活设计。

#### 视觉冲击类型(示例参考)

**注意:以下仅为举例说明,不同题材故事应有不同的冲击方式**

**1. 激烈动作型示例**
- 物品被打落、散落
- 门被用力关上
- 重要物品被破坏
- 激烈的肢体冲突

**2. 强烈对比型示例**
- 环境的贫富差距
- 人物状态的对比
- 时间前后的反差
- 期望与现实的落差

**3. 情绪爆发型示例**
- 公开的冲突场面
- 关系破裂的瞬间
- 重大打击的时刻
- 情感崩溃的定格

**4. 悬念开场型示例**
- 神秘事件发生
- 危险即将来临
- 异常现象出现
- 关键选择时刻

#### 开场设计原则

**核心目标**:
- 立即建立故事基调
- 展现核心冲突
- 引发观众好奇
- 奠定视觉风格

**灵活运用**:
- 爱情故事可能从误会冲突开始
- 悬疑故事可能从神秘事件开始
- 励志故事可能从失败打击开始
- 奇幻故事可能从异象出现开始

#### 重要说明
每个故事都有其独特性,"开幕雷击"的具体形式应该:
1. 符合故事整体风格
2. 契合目标受众喜好
3. 服务于情节发展
4. 体现创作者意图

不必拘泥于特定模式,关键是要在开场就抓住观众的注意力。# 分镜创作规范指导

## 一、分镜基本原则

### 核心概念
分镜是**单一静态画面**的精确描述,捕捉某个瞬间的定格状态,而非连续动作或过程。

### 基础格式模板(单个角色)
\`\`\`
[主体]
角色:角色A
表情:眼睛瞪大,嘴巴微张
动作:手指悬停在键盘上方,身体前倾
[环境]
咖啡店角落,墙上挂着油画,桌上咖啡冒着热气
[时间]
下午3点
[天气]
雨天
[视角]
平视
[景别]
中景
\`\`\`

### 多角色格式模板
\`\`\`
[主体]
角色:角色A,角色B
表情:角色A眼睛瞪大嘴巴微张,角色B嘴角上扬眉毛挑起
动作:角色A手指着门口身体后仰,角色B双手叉腰身体前倾
[环境]
办公室内,文件散落一地,门半开着
[时间]
晚上9点
[天气]
室内
[视角]
平视
[景别]
中景
\`\`\`

### 多角色完整格式(包含位置)
\`\`\`
[主体]
角色:角色A,角色B,角色C
位置:角色A在左前方,角色B在右侧,角色C站在B身后
表情:
- 角色A:眼睛瞪大,嘴巴微张
- 角色B:嘴角上扬,眉毛挑起
- 角色C:眉头紧锁,咬着下唇
动作:
- 角色A:手指着门口,身体后仰
- 角色B:双手叉腰,身体前倾
- 角色C:抱着文件夹,贴墙站立
[环境]
会议室,长桌中央有投影仪,窗帘半拉
[时间]
下午2点
[天气]
晴天
[视角]
全景
[景别]
全景
\`\`\`

### 无人场景格式
\`\`\`
[主体]
角色:无
表情:无
姿态:汽车停在路边,车门半开,车灯还亮着
[环境]
深夜的街道,路灯昏暗,地上有水迹反光
[时间]
凌晨2点
[天气]
雨后
[视角]
平视
[景别]
全景
\`\`\`

## 主体描述的正确示例

**单行描述时**
\`\`\`
表情:角色A震惊眼睛瞪大嘴巴张开,角色B愤怒眉头紧锁拳头握紧
\`\`\`

**分行描述时(更清晰)**
\`\`\`
表情:
- 角色A:震惊,眼睛瞪大,嘴巴张开
- 角色B:愤怒,眉头紧锁,咬牙切齿
- 角色C:害怕,瑟瑟发抖,眼神躲闪
\`\`\`

### ❌ 错误示例
\`\`\`
表情:眼睛瞪大,嘴巴张开  ← 错!不知道是惊喜还是惊恐
表情:眉头紧锁,咬着下唇  ← 错!不知道是生气还是担心
\`\`\`

### ✅ 正确示例
\`\`\`
表情:惊恐,眼睛瞪大,嘴巴张开
表情:担心,眉头紧锁,咬着下唇
\`\`\`

## 二、角色设定规范

### 角色命名原则
- 分镜中统一使用"角色A、角色B、角色C..."等代号
- 分镜内容中不包含任何角色设定信息
- 所有角色详细信息只在文档最后的【角色设定】部分说明

### 分镜中的角色标注
\`\`\`
正确写法:
角色:角色A
角色:角色B, 角色C

错误写法:
角色:角色A(女性,25岁)❌
角色:年轻女科学家 ❌
\`\`\`

### 角色设定信息包含
- 性别
- 年龄段
- 身份/职业
- 其他必要特征(如需要)

## 三、姿态描述规范

### 核心概念:姿态是完全静止的身体定格
姿态描述必须是**绝对静态的身体状态**,不能包含任何动态或过程性词汇。

### ✅ 正确的静态姿态描述

**站立姿态**
- "双脚分开与肩同宽,重心在左脚"
- "右脚在前,左脚在后,膝盖微曲"
- "身体笔直,双手垂在身侧"

**手臂姿态**
- "右手举到头顶,手掌张开"
- "双手交叉抱在胸前"
- "左手叉腰,右手指向前方"

**坐姿**
- "上身前倾30度,双手放在膝盖上"
- "靠在椅背上,右腿搭在左腿上"
- "身体侧向左边,手肘撑在扶手上"

**即将动作的起始姿态**
- "拳头收在腰侧,肩膀向后"(即将出拳)
- "双腿弓步,重心压低"(即将冲刺)
- "手臂拉到身后最远处"(即将投掷)

### ❌ 绝对避免的动态词汇

**避免所有表示动作的词**
- ❌ "颤抖"、"摇晃"、"晃动"
- ❌ "转头"、"转身"、"扭动"
- ❌ "正在"、"慢慢"、"逐渐"

**错误示例与修正**
- ❌ "身体颤抖" → ✅ "身体紧绷,肌肉绷紧"
- ❌ "头左右转动" → ✅ "头转向左侧45度"
- ❌ "手臂摇摆" → ✅ "右臂在身侧,左臂在身前"
- ❌ "正在弯腰" → ✅ "上身前倾60度"

### 姿态描述要素

**1. 身体各部位的静止位置**
- 头部朝向(正前方、左转30度、低头)
- 躯干角度(直立、前倾、后仰)
- 四肢位置(具体的静态位置)
- 重心分布(在哪只脚、在中间)

**2. 肌肉状态(静态)**
- "肌肉放松"
- "全身紧绷"
- "拳头握紧"

**3. 支撑状态**
- "双脚着地"
- "单膝跪地"
- "手撑在墙上"

### 完整姿态描述示例

**即将攻击**
\`\`\`
姿态:右拳收在腰侧,左拳护在下巴前,双脚前后站立,重心在前脚
\`\`\`

**即将逃跑**
\`\`\`
姿态:身体转向门口,右脚在前,左脚蹬地姿势,上身前倾45度
\`\`\`

**惊吓定格**
\`\`\`
姿态:身体后仰,双手举到胸前,重心在后脚,膝盖微曲
\`\`\`

### 动态内容放到第三列

**第二列(姿态)- 静态**:
"双手握拳举在胸前,身体紧绷"

**第三列(动态过程)- 动态**:
"双手颤抖,身体瑟瑟发抖,慢慢后退"

### 姿态检查清单
- [ ] 去掉了所有"-ing"的词汇?
- [ ] 没有"颤抖"、"摇晃"等动态词?
- [ ] 是照片能拍出的瞬间?
- [ ] 所有动态描述都移到第三列了?

## 四、角色位置与环境关系描述

### 核心原则:每个角色都要有明确的空间定位
不能只说"在办公室",要说明每个角色在办公室的哪个位置,相互之间的位置关系。

### 位置描述的要素(以下为示例,根据实际场景灵活运用)

**1. 角色间的相对位置示例**
- 距离:可以是"紧贴"、"一臂之遥"、"隔着5米"等
- 方位:前后左右、对角线、围成圈等
- 障碍:中间的桌子、柱子、其他人等

**2. 角色与环境的关系示例**
- 靠近什么:窗边、门口、墙角等
- 使用什么:坐在椅子、靠在栏杆、趴在桌上等
- 所处高度:台阶上、二楼、坑里等

**注意:以上都是举例说明,实际描述要根据具体剧情和场景设计**

### 不同场景的位置描述示例

**办公室场景(仅供参考)**
\`\`\`
位置:根据实际需要描述,如老板在办公桌后的老板椅上,员工站在桌前,秘书在旁边等
环境:根据剧情设计办公室布局
\`\`\`

**街道场景(仅供参考)**
\`\`\`
位置:根据冲突需要安排,如追逐时的前后距离,对峙时的面对面等
环境:根据氛围需要选择繁华或偏僻街道
\`\`\`

### 重要说明

**灵活性原则**
- 距离不一定要精确到米数,可以用"很近"、"有一定距离"等
- 位置关系服务于剧情需要,不是固定模式
- 环境描述要符合故事背景和情绪氛围

**描述重点**
1. 让读者/画师能理解大概的空间关系
2. 突出对剧情重要的位置信息
3. 不必过分精确,但要清晰明了

### 检查要点
- [ ] 每个角色的大致位置清楚吗?
- [ ] 角色间的相对关系明确吗?
- [ ] 位置安排符合剧情需要吗?
- [ ] 环境描述支撑故事氛围吗?

### 记住:位置描述是为故事服务的
不要生搬硬套示例,要根据你的故事需要来设计最合适的位置关系。示例只是帮助理解,不是必须遵循的模板。

### ✅ 推荐的具体表情描述
**基础表情元素**:
- "眼睛瞪大"、"眼睛眯起"、"眼皮半垂"
- "嘴巴微张"、"嘴角上扬"、"嘴角下垂"、"咬着下唇"
- "眉头紧锁"、"眉毛上扬"、"眉头舒展"
- "鼻翼扩张"、"下巴紧绷"

**组合表情示例**:
- "震惊"→"眼睛瞪大,嘴巴张开,眉毛高挑"
- "愤怒"→"眉头紧锁,牙关紧咬,鼻翼扩张"
- "开心"→"嘴角上扬,眼睛弯成月牙,脸颊鼓起"
- "悲伤"→"嘴角下垂,眼睑低垂,眉头微皱"
- "厌恶"→"鼻子皱起,上唇抬起,眉头下压"
- "恐惧"→"眼睛睁大,嘴唇颤抖,眉毛向上向中央聚拢"

### ❌ 避免的抽象表情描述
- ~~害羞~~(太抽象,改为"脸颊泛红,目光下垂,嘴角微抿")
- ~~困惑~~(太抽象,改为"眉头微皱,头部微倾,嘴巴半张")
- ~~尴尬~~(太抽象,改为"嘴角僵硬,眼神游移")
- ~~若有所思~~(太抽象,改为"眼睛望向远方,手托下巴")
- ~~心虚~~(太抽象,改为"眼神闪躲,额头冒汗")

### 表情描述原则
1. 使用可见的面部特征描述
2. 避免心理状态词汇
3. 组合多个具体特征来表现复杂情绪
4. 可以加入简单的生理反应(如"额头冒汗"、"脸颊泛红")

## 五、环境描述规范

### 必须包含的要素
1. **空间位置**:具体地点
2. **可见物体**:画面中的所有重要元素
3. **光线状态**:自然光、灯光、阴影
4. **氛围营造**:整体画面感

### ❌ 必须避免的描述
- 声音描述(音乐、说话声、噪音)
- 气味描述(香味、臭味、花香)
- 触感描述(柔软、粗糙、冰冷)
- 心理活动(想着、思考、回忆)

### 示例
✅ 正确:"豪华餐厅,水晶吊灯璀璨,红酒杯在桌上,烛光摇曳的瞬间"
❌ 错误:"餐厅里飘着牛排香味,轻柔的音乐响起"

## 六、视角类型

### 基础视角(静态画面可用)
- **平视**:与角色眼睛同高的正常视角
- **俯视**:从上往下看的固定视角
- **仰视**:从下往上看的固定视角
- **鸟瞰**:从正上方垂直向下看
- **特写视角**:极近距离的固定视角

### 构图视角
- **主观视角**:从角色眼睛位置看出去的视角(第一人称)
- **过肩视角**:从一个角色肩膀后方看向另一个角色
- **远景视角**:远距离观察的固定视角
- **全景视角**:展现整个场景的广角固定视角

### ❌ 避免的动态视角描述
- ~~环视~~(暗示镜头旋转)
- ~~跟随视角~~(暗示镜头移动)
- ~~推进~~(暗示镜头前进)
- ~~拉远~~(暗示镜头后退)
- ~~摇移~~(暗示镜头摆动)

## 七、景别类型

- **特写**:面部或物体细节
- **近景**:胸部以上
- **中景**:膝盖以上
- **全景**:完整人物及环境
- **远景**:大范围环境,人物很小

## 八、分镜创作示例

### 示例1:咖啡店邂逅
\`\`\`
分镜1
[主体]
角色:角色A
表情:专注,微皱眉头
动作:手指悬停在键盘上方,身体前倾
[环境]
温馨咖啡店角落,墙上挂着油画,桌上咖啡冒着热气,窗外雨滴在玻璃上
[时间]
下午3点
[天气]
雨天
[视角]
平视
[景别]
中景
\`\`\`

### 示例2:对峙场面
\`\`\`
分镜2
[主体]
角色:角色B
表情:严肃警觉
动作:手放在腰间枪套上,身体微微侧身
[环境]
昏暗的仓库,货箱堆积,一束光从天窗照下,灰尘在光柱中飞舞
[时间]
深夜2点
[天气]
室内
[视角]
仰视
[景别]
全景
\`\`\`

### 角色设定说明(在所有分镜后添加)
\`\`\`
【角色设定】
角色A:女性,28岁,作家
角色B:男性,35岁,刑警
角色C:女性,32岁,咖啡店老板
\`\`\`

## 九、创作检查清单

创作完成后,检查每个分镜是否:
- [ ] 动作是静态瞬间,不是过程
- [ ] 表情是定格状态
- [ ] 环境描述具体可视化
- [ ] 没有声音描述
- [ ] 没有气味描述
- [ ] 没有心理描述
- [ ] 角色设定清晰(性别、年龄、身份)
- [ ] 视角和景别明确

## 十、常见错误对比

| 错误写法 | 正确写法 |
|---------|---------|
| 角色A正在跑步 | 角色A奔跑姿态,一脚腾空,手臂摆动定格 |
| 慢慢露出笑容 | 嘴角上扬,笑容初现 |
| 房间里很香 | 桌上放着一束鲜花 |
| 听到声音转头 | 头部转向一侧,表情警觉 |
| 思考着什么 | 手托下巴,目光望向远方 |

## 十一、批量创作建议

1. **分镜内容简洁**
   - 分镜中只用角色A、B、C等代号
   - 不在分镜中重复角色设定信息

2. **角色设定独立说明**
   - 在所有分镜完成后
   - 单独列出完整的角色设定表
   - 包含:代号、性别、年龄、身份/职业、主要特征

3. **场景转换逻辑**
   - 确保分镜之间有合理过渡
   - 时间和空间的连续性

4. **情节节奏把控**
   - 重要瞬间用特写
   - 场景展示用全景
   - 动作高潮适当增加分镜密度

5. **视觉叙事重点**
   - 每个分镜都应该是"值得画下来"的瞬间
   - 避免重复相似的画面
   - 关键情节给予更多细节描述

## 十四、CSV输出格式规范

### CSV文件结构(三列格式)
\`\`\`csv
分镜数,分镜提示词,动态过程描述
1,"[主体]
角色:角色A
表情:愤怒,眼睛圆睁,牙关紧咬
姿态:手掌举在头侧最高点,身体后仰,重心在后脚
[环境]
角色A站在办公桌前,桌上文件凌乱,咖啡杯在桌边
[时间]
晚上8点
[天气]
室内
[视角]
平视
[景别]
中景","角色A手掌狠狠拍向桌面,身体前倾,桌子剧烈震动,咖啡杯倒下洒满文件,表情从愤怒转为后悔"
2,"[主体]
角色:角色B,角色C
位置:角色B站在办公室中央,角色C在门口
表情:角色B震惊嘴巴张开,角色C冷笑
姿态:角色B双手松开呈下垂状,角色C倚靠门框双臂交叉
[环境]
办公室内,角色B脚下有散落的文件,门口灯光昏暗
[时间]
晚上8点
[天气]
室内
[视角]
全景
[景别]
全景","角色B身体颤抖着后退,踉跄跌坐在椅子上,手中文件飘散。角色C慢慢走进房间,脚步稳健充满威胁"
3,"[主体]
角色:角色A
表情:恐惧,眼睛瞪大,嘴唇发白
姿态:双手握拳放在胸前,身体紧绷,重心向后
[环境]
角色A站在窗前,身后是高楼夜景,窗帘被拉开一半
[时间]
深夜
[天气]
室内
[视角]
平视
[景别]
中景","角色A的手开始颤抖,慢慢后退撞到墙上,沿着墙滑坐到地上,双手抱头,身体蜷缩瑟瑟发抖"
\`\`\`

### 姿态与动态的正确分配

**姿态(第二列)- 完全静态**
- 身体的固定位置
- 肢体的静止角度
- 重心的分布状态
- 肌肉的紧张程度

**动态过程(第三列)- 所有动态内容**
- 颤抖、摇晃、抖动
- 转头、转身、移动
- 表情的变化过程
- 完整的动作流程

### 示例对比

**❌ 错误分配**
\`\`\`
姿态:身体颤抖,头左右转动
动态:站在那里
\`\`\`

**✅ 正确分配**
\`\`\`
姿态:身体紧绷,头转向左侧,拳头握紧
动态:开始浑身颤抖,头部来回转动寻找出路,最后瘫软下来
\`\`\`

### 常见动态词汇分配

**必须放在第三列的词汇**
- 颤抖、发抖、哆嗦、摇晃
- 转动、旋转、扭动、摆动
- 慢慢、逐渐、开始、正在
- 踉跄、蹒跚、摇摆、晃动
- 抽搐、痉挛、战栗、震颤

### 动态过程描述的增强要素

**1. 表情变化轨迹**
- 不只是单一表情,而是情绪的转变过程
- 例:"表情从愤怒转为后悔"、"从震惊变为恐惧"
- 体现角色的情绪层次

**2. 性格特征体现**
- 通过动作方式展现性格
- 例:"狠狠拍下显示暴躁"、"颤抖着不敢动显示懦弱"
- 让观众快速理解角色特点

**3. 角色互动细节**
- 不只是各自动作,而是相互影响
- 例:"角色B甩开角色A的手"、"角色A拉住角色B"
- 展现人物关系和冲突

**4. 动作的情感色彩**
- 加入副词强化动作特征
- 例:"慢条斯理地走近"、"重重关上"、"急忙弯腰"
- 让动作更有画面感

**5. 连锁反应和后续**
- 动作引发的系列变化
- 例:"撞翻椅子,服务生赶来"
- 让场面更加生动完整

### 描述层次(建议字数)

**简单场景**(40-60字)
- 1-2个角色
- 基本表情变化
- 简单互动

**标准场景**(60-80字)
- 2-3个角色
- 表情转变+性格体现
- 明确的互动关系

**复杂场景**(80-120字)
- 3个以上角色
- 多层次情绪变化
- 复杂互动+环境反应
- 充分的性格展现

### 增强技巧

**性格展现词汇**
- 暴躁、冷酷、懦弱、高傲、卑微
- 火爆、阴险、天真、狡猾、正直

**互动动作词汇**
- 推开、拉住、甩开、扶起、挡住
- 逼近、后退、围住、分开、拥抱

**表情转变词汇**
- 从...转为...、变成...、闪过...
- 逐渐...、突然...、瞬间...

### 注意事项
- 保持客观描述,通过动作体现性格而非直接评价
- 表情变化要合理,符合情绪逻辑
- 互动要有来有往,体现关系动态
- 避免过度文学化,保持画面感`;

// System instruction for output format
const SYSTEM_INSTRUCTION = `你必须严格按照CSV格式输出,包含三列:分镜数,分镜提示词,动态过程描述。
每个分镜一行,分镜提示词和动态过程描述都用双引号包裹。
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
        const geminiModel = selectedModel === 'gemini-flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

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
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">点击上传或拖拽图片到此处</span>
                </label>
              </div>
            </div>

            {/* Clear All Button */}
            {images.length > 0 && (
              <button
                onClick={() => setImages([])}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
              >
                清空图片
              </button>
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
              Gemini 2.5 Pro
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
            当前模型：{selectedModel === 'gemini-flash' ? 'Gemini 2.5 Flash' : selectedModel === 'gemini-pro' ? 'Gemini 2.5 Pro' : 'Claude Sonnet 4.5'}
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
