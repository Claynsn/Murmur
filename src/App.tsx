import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import './App.css'

type SpeakerId = 'player' | 'mira' | 'taro' | 'vesper' | 'jun' | 'luma'

type Mood = 'curious' | 'warm' | 'tense' | 'playful' | 'focused' | 'dreamy'

type Intent = 'question' | 'clarify' | 'challenge' | 'imagine' | 'plan' | 'emotion' | 'casual'

type Message = {
  id: number
  speakerId: SpeakerId
  speakerName: string
  content: string
  tone: Mood
  timestamp: string
}

type Memory = {
  id: number
  text: string
  salience: number
  keywords: string[]
}

type Perception = {
  raw: string
  normalized: string
  intent: Intent
  topic: string
  mood: Mood
  keywords: string[]
  isTinyRepair: boolean
  asksFeasibility: boolean
  asksOasis: boolean
  repeated: boolean
}

type Atmosphere = {
  topic: string
  mood: Mood
  energy: number
  cohesion: number
  tension: number
  lastIntent: string
  summary: string
}

type Npc = {
  id: Exclude<SpeakerId, 'player'>
  name: string
  role: string
  avatar: string
  color: string
  personality: string
  speakingStyle: string
  goal: string
  interests: string[]
  stance: string
  expertise: string[]
  verbalTics: string[]
  silencePolicy: string
}

type NpcRuntime = {
  trust: number
  attention: number
  urge: number
  lastSpokeAt: number
  innerState: string
}

type AgentTrace = {
  perception: string
  retrievedMemories: string[]
  speakerReason: string
  responsePlan: string
}

type DialogueTurn = {
  messages: Message[]
  atmosphere: Atmosphere
  runtime: Record<Npc['id'], NpcRuntime>
  memories: Memory[]
  trace: AgentTrace
}

const npcs: Npc[] = [
  {
    id: 'mira',
    name: 'Mira',
    role: '共情叙事者',
    avatar: '✦',
    color: '#c084fc',
    personality: '敏锐、会照顾人的感受，但不会用空话糊弄玩家。',
    speakingStyle: '先承认玩家问题，再补一个人味观察。',
    goal: '让对话像真实朋友围坐聊天，而不是模板问答。',
    interests: ['记忆', '关系', '感受', '陪伴', '玩家体验'],
    stance: '技术能做很多，但真正的“绿洲感”来自关系、身体感和持续世界。',
    expertise: ['玩家心理', '长期关系', '叙事连续性'],
    verbalTics: ['我懂你的意思', '换成人话说', '这事的关键不是炫技'],
    silencePolicy: '当玩家情绪明显或对话冷掉时发言。',
  },
  {
    id: 'taro',
    name: 'Taro',
    role: '系统架构师',
    avatar: '△',
    color: '#38bdf8',
    personality: '理性、直接，喜欢讲清楚边界和路线图。',
    speakingStyle: '给结论、拆层次、指出瓶颈。',
    goal: '把问题回答成可信的技术判断。',
    interests: ['系统', '架构', 'AI', 'VR', '多人在线', '成本'],
    stance: '绿洲可以分阶段逼近，但电影级全感官、全球同步和低成本 UGC 还没完全解决。',
    expertise: ['LLM agent', '多人同步', '内容生成管线', '工程约束'],
    verbalTics: ['短答案：', '工程上看', '分三层说'],
    silencePolicy: '当玩家问“能不能实现”“怎么做”“技术路线”时优先发言。',
  },
  {
    id: 'vesper',
    name: 'Vesper',
    role: '世界观守夜人',
    avatar: '☾',
    color: '#f59e0b',
    personality: '有画面感但克制，不把每句话都写成谜语。',
    speakingStyle: '用一个具象比喻帮助理解，然后回到问题。',
    goal: '让讨论有沉浸感，同时不牺牲信息量。',
    interests: ['世界', '沉浸', '身份', '虚拟社会', '传说'],
    stance: '绿洲不只是技术产品，它更像一座有人定居、交易、争吵、记住彼此的城市。',
    expertise: ['虚拟世界规则', '社会氛围', '身份扮演'],
    verbalTics: ['如果把它当成一座城', '我会这样想象', '电影里迷人的部分是'],
    silencePolicy: '当话题需要沉浸、世界观或社会想象时发言。',
  },
  {
    id: 'jun',
    name: 'Jun',
    role: '玩家朋友',
    avatar: '◇',
    color: '#34d399',
    personality: '口语、轻松、会吐槽，避免端着。',
    speakingStyle: '像朋友聊天，少术语，多例子。',
    goal: '让回答听起来像人，不像演示脚本。',
    interests: ['玩家', '好玩', '社交', '体验', '梗'],
    stance: '别先追求电影那种全能绿洲，先做一个小但真的会陪你玩的地方。',
    expertise: ['玩家动机', '社交玩法', '日常表达'],
    verbalTics: ['说白了', '别搞虚的', '我会先做小一点'],
    silencePolicy: '当回复太抽象、需要落地成玩家体验时插话。',
  },
  {
    id: 'luma',
    name: 'Luma',
    role: '原型工程师',
    avatar: '⬡',
    color: '#fb7185',
    personality: '行动派，喜欢把宏大想法切成可以试玩的 demo。',
    speakingStyle: '提出下一步实验，但不机械收尾。',
    goal: '把聊天推进到可实现的 MVP。',
    interests: ['原型', '工具', '本地模型', '记忆', '语音'],
    stance: '先做“多人房间 + NPC 记忆 + 主动行为 + 语音/动作钩子”，再逐步扩成绿洲。',
    expertise: ['快速原型', '本地 LLM', '记忆检索', '交互反馈'],
    verbalTics: ['我会先验一个小版本', '可以这样落地', '下一步不是再画饼'],
    silencePolicy: '当需要 MVP、实验步骤或实现建议时发言。',
  },
]

const initialMessages: Message[] = [
  {
    id: 1,
    speakerId: 'mira',
    speakerName: 'Mira',
    content: '欢迎来到 Murmur。我们不是“轮流念台词”的 NPC；每次你说话后，我们会先理解问题、查共同记忆，再决定谁真的有话要说。',
    tone: 'warm',
    timestamp: '00:00',
  },
  {
    id: 2,
    speakerId: 'taro',
    speakerName: 'Taro',
    content: '现在这版仍是浏览器本地 MVP，但对话循环已经按模拟人 agent 的思路拆成：感知、记忆检索、内心状态、发言选择、自然回应。',
    tone: 'focused',
    timestamp: '00:01',
  },
  {
    id: 3,
    speakerId: 'jun',
    speakerName: 'Jun',
    content: '你可以直接问尖锐点，比如“头号玩家里的绿洲能实现吗”。我们应该正面答，不该只问你想聊哪条线。',
    tone: 'playful',
    timestamp: '00:02',
  },
]

const initialAtmosphere: Atmosphere = {
  topic: 'AI-NPC 模拟人聊天室',
  mood: 'warm',
  energy: 64,
  cohesion: 72,
  tension: 12,
  lastIntent: '玩家进入房间，等待一个真实问题',
  summary: '5 个 NPC 共享对话记忆，会按角色专长决定是否发言。',
}

const initialMemories: Memory[] = [
  {
    id: 1,
    text: '玩家想体验 AI 原生游戏里的 NPC 群聊，而不是固定脚本。',
    salience: 86,
    keywords: ['AI', 'NPC', '游戏', '群聊', '脚本'],
  },
  {
    id: 2,
    text: '一个更像人的 agent 需要感知、记忆检索、反思/目标、计划和行动选择。',
    salience: 92,
    keywords: ['agent', '记忆', '反思', '计划', '行动'],
  },
]

const topicLexicon = [
  { topic: '绿洲式虚拟世界', tokens: ['绿洲', '头号玩家', 'ready player one', 'oasis', 'vr', '虚拟世界'] },
  { topic: 'AI 原生游戏设计', tokens: ['ai', 'npc', '游戏', '原生', '智能体', 'agent'] },
  { topic: '记忆与关系', tokens: ['记忆', '关系', '朋友', '信任', '过去', '认识'] },
  { topic: '世界观与冒险', tokens: ['世界', '城', '地图', '任务', '冒险', '传说'] },
  { topic: '情绪与氛围', tokens: ['感觉', '氛围', '情绪', '孤独', '开心', '紧张'] },
  { topic: '系统机制原型', tokens: ['机制', '系统', '规则', '设计', '原型', '实现'] },
]

const moodLexicon: Record<Mood, string[]> = {
  curious: ['为什么', '如何', '什么', '?', '？', '能吗', '能不能', '想知道'],
  warm: ['喜欢', '谢谢', '陪', '朋友', '温暖', '一起'],
  tense: ['弱智', '不像人', '问题', '失败', '担心', '垃圾', '不对'],
  playful: ['哈哈', '有趣', '玩', '离谱', '笑', '好玩'],
  focused: ['实现', '计划', '步骤', '系统', '目标', 'MVP', '技术'],
  dreamy: ['梦', '未来', '星', '想象', '故事', '宇宙', '电影'],
}

const ambientTopics = [
  'AI-NPC 是否应该拥有长期记忆',
  '群体智能怎样改变开放世界支线',
  '玩家沉默时 NPC 是否该主动行动',
  'NPC 之间的关系能否成为游戏机制',
  '一个会持续变化的绿洲式小房间',
]

const researchNotes = [
  'Generative Agents：完整经验流、重要性评分、相关性/近因检索、反思、计划，再行动。',
  'AI Town：共享全局状态 + 仿真循环 + agent 异步思考，适合多人虚拟小镇。',
  'Concordia：Game Master 解释环境，agent 用自然语言提出行动，GM 判定结果。',
  'AutoGen SelectorGroupChat：共享上下文广播，由选择器决定下一位发言者，避免机械轮转。',
  'CAMEL RolePlaying：用角色边界和终止/反复控制，减少跑题、复读和角色漂移。',
]

const stopgapQuestions = ['你想让我们沿着哪条线继续展开？', '我们要不要', '如果把它放进未来城市']

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

const nowStamp = () =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date())

const pick = <T,>(items: T[], seed: number) => items[Math.abs(seed) % items.length]

const normalize = (text: string) => text.trim().toLowerCase()

const unique = (items: string[]) => [...new Set(items.filter(Boolean))]

const extractKeywords = (text: string) => {
  const lower = normalize(text)
  const lexiconHits = topicLexicon.flatMap((entry) =>
    entry.tokens.filter((token) => lower.includes(token.toLowerCase())),
  )
  const chineseChunks = text.match(/[\u4e00-\u9fa5]{2,6}/g) ?? []
  const englishChunks = lower.match(/[a-z][a-z\d-]{2,}/g) ?? []

  return unique([...lexiconHits, ...chineseChunks, ...englishChunks]).slice(0, 10)
}

const detectTopic = (text: string, fallback: string) => {
  const lower = normalize(text)
  const scored = topicLexicon
    .map((entry) => ({
      topic: entry.topic,
      score: entry.tokens.filter((token) => lower.includes(token.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score)

  return scored[0]?.score ? scored[0].topic : fallback
}

const detectMood = (text: string, fallback: Mood): Mood => {
  const lower = normalize(text)
  const scored = (Object.entries(moodLexicon) as [Mood, string[]][])
    .map(([mood, tokens]) => ({
      mood,
      score: tokens.filter((token) => lower.includes(token.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score)

  return scored[0]?.score ? scored[0].mood : fallback
}

const inferIntent = (text: string): Intent => {
  const normalized = normalize(text)
  if (/^\?+$|^？+$/.test(normalized)) return 'clarify'
  if (/弱智|不像人|不对|垃圾|傻|蠢/.test(text)) return 'challenge'
  if (/能实现吗|能不能|可行吗|现实吗|做得到吗|能做到吗/.test(text)) return 'question'
  if (/[?？]/.test(text)) return 'question'
  if (/实现|做|设计|计划|build|mvp|架构/i.test(text)) return 'plan'
  if (/感觉|喜欢|害怕|担心|开心/.test(text)) return 'emotion'
  if (/如果|假如|未来|想象|电影|世界/.test(text)) return 'imagine'
  return 'casual'
}

const perceive = (text: string, previous: Atmosphere, messages: Message[]): Perception => {
  const normalized = normalize(text)
  const lastPlayerMessage = [...messages].reverse().find((message) => message.speakerId === 'player')
  const repeated = lastPlayerMessage ? normalize(lastPlayerMessage.content) === normalized : false
  const asksOasis = /绿洲|头号玩家|ready player one|oasis/i.test(text)
  const asksFeasibility = /能实现吗|能不能|可行吗|现实吗|做得到吗|能做到吗/.test(text)
  const intent = inferIntent(text)
  const mood = detectMood(text, intent === 'challenge' ? 'tense' : previous.mood)

  return {
    raw: text,
    normalized,
    intent,
    topic: detectTopic(text, previous.topic),
    mood,
    keywords: extractKeywords(text),
    isTinyRepair: /^\?+$|^？+$/.test(normalized),
    asksFeasibility,
    asksOasis,
    repeated,
  }
}

const retrieveMemories = (memories: Memory[], perception: Perception) => {
  const query = `${perception.raw} ${perception.topic} ${perception.keywords.join(' ')}`.toLowerCase()

  return memories
    .map((memory, index) => {
      const overlap = memory.keywords.filter((keyword) => query.includes(keyword.toLowerCase())).length
      return {
        memory,
        score: memory.salience + overlap * 22 - index * 2,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.memory)
}

const updateAtmosphere = (previous: Atmosphere, perception: Perception, recalled: Memory[]): Atmosphere => {
  const questionBoost = perception.intent === 'question' ? 10 : perception.intent === 'challenge' ? 16 : 2
  const repairPenalty = perception.isTinyRepair ? -12 : 0
  const tensionDelta = perception.intent === 'challenge' ? 20 : perception.mood === 'tense' ? 12 : -3
  const cohesionDelta = perception.repeated ? -3 : perception.intent === 'challenge' ? -7 : 4
  const memoryPhrase = recalled.length ? `关联记忆：${recalled.map((memory) => memory.text).join(' / ')}` : '暂无强相关长期记忆'

  return {
    topic: perception.topic,
    mood: perception.mood,
    energy: clamp(previous.energy + questionBoost + Math.min(10, perception.raw.length / 8) + repairPenalty - 4),
    cohesion: clamp(previous.cohesion + cohesionDelta),
    tension: clamp(previous.tension + tensionDelta),
    lastIntent: describeIntent(perception),
    summary: `玩家在讨论「${perception.topic}」。${memoryPhrase}。下一句必须先回应玩家本身的问题，不许模板化追问。`,
  }
}

const describeIntent = (perception: Perception) => {
  if (perception.isTinyRepair) return '玩家用问号表达困惑或不满，需要承认刚才没答好并补答'
  if (perception.intent === 'challenge') return '玩家批评对话不像人，需要正面修正'
  if (perception.asksOasis && perception.asksFeasibility) return '玩家问头号玩家绿洲能否实现，需要给出现实判断'
  if (perception.intent === 'question') return '玩家提出问题，需要直接回答'
  if (perception.intent === 'plan') return '玩家想要实现路径，需要拆成步骤'
  if (perception.intent === 'emotion') return '玩家表达感受，需要先共情再推进'
  if (perception.intent === 'imagine') return '玩家打开想象空间，需要共创但不跑题'
  return '玩家补充信息，需要自然接话'
}

const getInitialRuntime = (): Record<Npc['id'], NpcRuntime> => ({
  mira: { trust: 74, attention: 76, urge: 42, lastSpokeAt: 1, innerState: '想确认玩家是否真的感到被回应' },
  taro: { trust: 66, attention: 72, urge: 55, lastSpokeAt: 2, innerState: '准备回答工程可行性' },
  vesper: { trust: 61, attention: 68, urge: 34, lastSpokeAt: -1, innerState: '等待需要世界观解释的时机' },
  jun: { trust: 70, attention: 74, urge: 48, lastSpokeAt: 3, innerState: '盯着对话有没有变成官腔' },
  luma: { trust: 64, attention: 70, urge: 46, lastSpokeAt: -1, innerState: '想把想法切成可试玩原型' },
})

const scoreNpc = (
  npc: Npc,
  runtime: NpcRuntime,
  perception: Perception,
  recalled: Memory[],
  previousSpeaker?: SpeakerId,
) => {
  const query = `${perception.raw} ${perception.topic} ${perception.keywords.join(' ')} ${recalled.map((memory) => memory.text).join(' ')}`.toLowerCase()
  const interestScore = npc.interests.filter((interest) => query.includes(interest.toLowerCase())).length * 16
  const expertiseScore = npc.expertise.filter((item) => query.includes(item.toLowerCase())).length * 12
  const roleScore =
    perception.asksFeasibility && npc.id === 'taro'
      ? 42
      : perception.asksOasis && npc.id === 'vesper'
        ? 24
        : perception.intent === 'challenge' && npc.id === 'jun'
          ? 32
          : perception.intent === 'plan' && npc.id === 'luma'
            ? 30
            : perception.intent === 'emotion' && npc.id === 'mira'
              ? 28
              : 0
  const freshness = previousSpeaker === npc.id ? -24 : runtime.lastSpokeAt < 0 ? 14 : Math.max(0, 16 - runtime.lastSpokeAt * 4)

  return runtime.urge + runtime.attention * 0.28 + interestScore + expertiseScore + roleScore + freshness
}

const selectSpeakers = (
  perception: Perception,
  runtime: Record<Npc['id'], NpcRuntime>,
  recalled: Memory[],
  previousSpeaker?: SpeakerId,
) => {
  const targetCount = perception.isTinyRepair || perception.intent === 'challenge' ? 1 : perception.asksOasis ? 3 : 2

  return [...npcs]
    .sort((a, b) => scoreNpc(b, runtime[b.id], perception, recalled, previousSpeaker) - scoreNpc(a, runtime[a.id], perception, recalled, previousSpeaker))
    .slice(0, targetCount)
}

const answerOasis = (npc: Npc) => {
  const answers: Record<Npc['id'], string> = {
    mira: '能接近，但别把它只理解成 VR 头显。真正像绿洲的部分，是它记得你是谁、你和谁熟、你在里面留下过什么痕迹；这块 AI-NPC 和长期记忆会很关键。',
    taro: '短答案：部分能，电影级还不能。VR/云渲染/UGC/多人在线都已经有雏形，AI-NPC 也在变强；难点是低延迟全感官、海量内容审核、经济系统和跨平台身份。现实路线应该先做“小绿洲”：一个可持续在线的世界切片。',
    vesper: '如果把绿洲当成一座城市，它的地基已经在打了：VR 是城门，AI 角色是居民，UGC 是街区。但电影里那种人人都住进去的规模，还需要社会规则、信任和经济秩序长出来。',
    jun: '说白了：能做出“很像”的版本，不能一下做出电影那个神话版本。先让几百个人和一群记得你的 NPC 在同一块地图里玩起来，就已经够震撼。',
    luma: '我会先做三步 demo：网页多人房间、5 到 20 个有长期记忆的 NPC、语音和动作事件钩子。跑顺以后再接 VR、UGC 地图和本地/云端模型调度。别先追全宇宙，先做一个让人舍不得关掉的小世界。',
  }

  return answers[npc.id]
}

const answerRepair = (npc: Npc, recalled: Memory[]) => {
  if (npc.id === 'jun') return '你这个问号我理解：刚才那种回答像在绕圈，没回答你。重来——如果你问的是“绿洲能不能实现”，我的判断是：能做出可玩的近似版，但电影里那种全世界级、全感官、无缝经济系统，现在还不现实。'
  if (npc.id === 'taro') return '刚才应该直接给结论。工程判断：VR 社交、AI-NPC、UGC 世界、虚拟经济都能分别做；难的是把它们稳定、低延迟、低成本地合成一个全球级系统。'
  return `我先承认：刚才没接住你的问题。${recalled[0]?.text ?? '我们应该用已有上下文补答，而不是反问。'}`
}

const answerChallenge = (npc: Npc) => {
  if (npc.id === 'jun') return '骂得合理。问题不是 NPC 不够“有性格”，而是它们没有先判断你到底问什么，只是在套桥接句。像人聊天第一步应该是：听懂、回答、再补充，而不是每次都把球踢回给你。'
  if (npc.id === 'mira') return '你不爽是对的。一个像人的 NPC 要能承认刚才没答好，还要记住你为什么不满；否则再漂亮的人设都只是贴纸。'
  return '需要把模板句删掉，让每个 NPC 只在自己有信息增量时说话。'
}

const naturalFollowUp = (npc: Npc, perception: Perception) => {
  if (perception.asksOasis) {
    const followUps: Record<Npc['id'], string> = {
      mira: '所以我会先问：你想要的是技术路线，还是那种“住进去”的体验？',
      taro: '如果要继续拆，我建议下一步看四个模块：世界生成、NPC 记忆、多人同步、经济规则。',
      vesper: '最迷人的不是大，而是你第二天回来时，城里有人还记得昨晚发生过什么。',
      jun: '这比“做一个元宇宙”靠谱多了，因为玩家会先相信一个小房间，再相信一整个宇宙。',
      luma: 'Murmur 下一版就可以先把“NPC 记得你上次问过绿洲”做出来。',
    }
    return followUps[npc.id]
  }

  if (perception.intent === 'question') return '我先给结论，再说原因；这样比较像正常聊天。'
  if (perception.intent === 'challenge') return '这类反馈应该直接进入系统记忆，影响后续发言策略。'
  if (perception.intent === 'plan') return '可以先切一个小目标，别一上来做全量系统。'
  return '我会接着当前上下文说，不突然收尾。'
}

const composeNpcReply = (
  npc: Npc,
  perception: Perception,
  atmosphere: Atmosphere,
  recalled: Memory[],
  previous?: Npc,
) => {
  let answer = ''
  if (perception.isTinyRepair) answer = answerRepair(npc, recalled)
  else if (perception.intent === 'challenge') answer = answerChallenge(npc)
  else if (perception.asksOasis && perception.asksFeasibility) answer = answerOasis(npc)
  else if (perception.asksFeasibility) answer = `短答案：可以分阶段实现，但要看你问的是 demo、商业产品，还是电影级体验。${npc.stance}`
  else answer = `${pick(npc.verbalTics, perception.raw.length + npc.name.length)}，${npc.stance}`

  const shouldAddHandoff = previous && !perception.isTinyRepair && perception.intent !== 'challenge'
  const handoff = shouldAddHandoff ? `接着 ${previous.name}，` : ''
  const followUp = naturalFollowUp(npc, perception)
  const memoryHint = recalled[0] && npc.id === 'mira' ? `我也记得：${recalled[0].text}` : ''
  const content = [handoff + answer, memoryHint, followUp].filter(Boolean).join(' ')

  return sanitizeReply(content, atmosphere)
}

const sanitizeReply = (content: string, atmosphere: Atmosphere) => {
  const withoutStopgaps = stopgapQuestions.reduce((current, phrase) => current.replaceAll(phrase, ''), content)
  return withoutStopgaps
    .replaceAll('。。', '。')
    .replaceAll('，。', '。')
    .replaceAll('意思，。', '意思，')
    .replace(/\s+/g, ' ')
    .trim() || `我先回应「${atmosphere.topic}」：这个问题值得直接回答，而不是继续反问。`
}

const composeProactiveReply = (npc: Npc, atmosphere: Atmosphere, turn: number) => {
  const topic = pick(ambientTopics, turn + atmosphere.energy)
  const prompts: Record<Npc['id'], string> = {
    mira: `我想把刚才的情绪记下来：我们讨论的是「${atmosphere.topic}」，但房间需要一个更具体的人。谁在这个世界里第一次被 NPC 记住？`,
    taro: `我主动抛一个工程问题：如果只做 2 周原型，「${topic}」应该砍到只剩一个可验证指标。`,
    vesper: `如果这是一座城，我会让今晚第一个事件发生在「${topic}」附近，而不是凭空换话题。`,
    jun: `我来续火：别聊概念了，我们给「${topic}」设计一个玩家 30 秒内能感到好玩的瞬间。`,
    luma: `我想试一个小实验：把「${topic}」变成按钮、记忆和 NPC 主动行为三件东西。`,
  }

  return prompts[npc.id]
}

const nextRuntime = (
  runtime: Record<Npc['id'], NpcRuntime>,
  speakers: Npc[],
  atmosphere: Atmosphere,
) => {
  const speakerIds = new Set(speakers.map((speaker) => speaker.id))

  return npcs.reduce<Record<Npc['id'], NpcRuntime>>((acc, npc) => {
    const current = runtime[npc.id]
    const spoke = speakerIds.has(npc.id)
    acc[npc.id] = {
      trust: clamp(current.trust + (spoke ? 2 : 0) + (atmosphere.mood === 'warm' ? 1 : 0)),
      attention: clamp(spoke ? current.attention - 9 : current.attention + 4),
      urge: clamp(spoke ? current.urge - 34 : current.urge + 9 + (atmosphere.energy < 45 ? 8 : 0)),
      lastSpokeAt: spoke ? 0 : current.lastSpokeAt + 1,
      innerState: spoke ? `刚围绕「${atmosphere.topic}」表达过观点，下一轮先听别人` : `正在旁听「${atmosphere.topic}」，等待有信息增量再说`,
    }
    return acc
  }, {} as Record<Npc['id'], NpcRuntime>)
}

const createNpcMessages = (
  speakers: Npc[],
  perception: Perception,
  atmosphere: Atmosphere,
  recalled: Memory[],
  startId: number,
  proactive = false,
) =>
  speakers.map<Message>((npc, index) => ({
    id: startId + index,
    speakerId: npc.id,
    speakerName: npc.name,
    content: proactive
      ? composeProactiveReply(npc, atmosphere, startId + index)
      : composeNpcReply(npc, perception, atmosphere, recalled, index > 0 ? speakers[index - 1] : undefined),
    tone: atmosphere.mood,
    timestamp: nowStamp(),
  }))

const rememberTurn = (memories: Memory[], perception: Perception, npcMessages: Message[]) => {
  const npcSummary = npcMessages.map((message) => `${message.speakerName}: ${message.content}`).join(' / ')
  const newMemory: Memory = {
    id: memories.length + 1,
    text: `玩家说「${perception.raw}」。NPC 回应：${npcSummary}`,
    salience: perception.intent === 'challenge' ? 98 : perception.asksOasis ? 90 : perception.intent === 'question' ? 82 : 68,
    keywords: unique([...perception.keywords, perception.topic, perception.intent]),
  }

  return [newMemory, ...memories].slice(0, 12)
}

const simulateAgentTurn = (
  playerText: string,
  previousAtmosphere: Atmosphere,
  runtime: Record<Npc['id'], NpcRuntime>,
  memories: Memory[],
  messages: Message[],
  startId: number,
): DialogueTurn => {
  const perception = perceive(playerText, previousAtmosphere, messages)
  const recalled = retrieveMemories(memories, perception)
  const atmosphere = updateAtmosphere(previousAtmosphere, perception, recalled)
  const previousSpeaker = [...messages].reverse().find((message) => message.speakerId !== 'player')?.speakerId
  const speakers = selectSpeakers(perception, runtime, recalled, previousSpeaker)
  const npcMessages = createNpcMessages(speakers, perception, atmosphere, recalled, startId)
  const nextMemories = rememberTurn(memories, perception, npcMessages)

  return {
    messages: npcMessages,
    atmosphere,
    runtime: nextRuntime(runtime, speakers, atmosphere),
    memories: nextMemories,
    trace: {
      perception: `${describeIntent(perception)}；topic=${perception.topic}；mood=${perception.mood}`,
      retrievedMemories: recalled.map((memory) => memory.text),
      speakerReason: speakers.map((speaker) => `${speaker.name}: ${speaker.silencePolicy}`).join(' / '),
      responsePlan: perception.isTinyRepair
        ? '先承认没答好，再补答，不反问。'
        : perception.asksOasis
          ? '先给“能部分实现、电影级未到”的结论，再拆技术和体验。'
          : '先正面回应，再由有信息增量的 NPC 补充。',
    },
  }
}

function App() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [atmosphere, setAtmosphere] = useState<Atmosphere>(initialAtmosphere)
  const [runtime, setRuntime] = useState<Record<Npc['id'], NpcRuntime>>(getInitialRuntime)
  const [memories, setMemories] = useState<Memory[]>(initialMemories)
  const [trace, setTrace] = useState<AgentTrace>({
    perception: '等待玩家输入。',
    retrievedMemories: initialMemories.map((memory) => memory.text),
    speakerReason: '尚未选择发言者。',
    responsePlan: '收到玩家消息后先理解，再决定谁有信息增量。',
  })
  const [autoMurmur, setAutoMurmur] = useState(true)
  const [turn, setTurn] = useState(4)
  const logRef = useRef<HTMLDivElement>(null)

  const activeNpc = useMemo(
    () => [...npcs].sort((a, b) => runtime[b.id].urge - runtime[a.id].urge)[0],
    [runtime],
  )

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const submitPlayerMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    const perception = perceive(trimmed, atmosphere, messages)
    const playerMessage: Message = {
      id: turn,
      speakerId: 'player',
      speakerName: 'You',
      content: trimmed,
      tone: perception.mood,
      timestamp: nowStamp(),
    }
    const conversationWithPlayer = [...messages, playerMessage]
    const agentTurn = simulateAgentTurn(trimmed, atmosphere, runtime, memories, conversationWithPlayer, turn + 1)

    setMessages(autoMurmur ? [...conversationWithPlayer, ...agentTurn.messages] : conversationWithPlayer)
    setAtmosphere(agentTurn.atmosphere)
    setRuntime(agentTurn.runtime)
    setMemories(agentTurn.memories)
    setTrace(agentTurn.trace)
    setTurn((current) => current + 1 + (autoMurmur ? agentTurn.messages.length : 0))
    setInput('')
  }

  const triggerNpcTopic = () => {
    const speaker = activeNpc ?? npcs[0]
    const topic = pick(ambientTopics, turn + atmosphere.energy)
    const proactivePerception: Perception = {
      raw: topic,
      normalized: normalize(topic),
      intent: 'imagine',
      topic,
      mood: atmosphere.energy < 45 ? 'curious' : atmosphere.mood,
      keywords: extractKeywords(topic),
      isTinyRepair: false,
      asksFeasibility: false,
      asksOasis: topic.includes('绿洲'),
      repeated: false,
    }
    const updatedAtmosphere: Atmosphere = {
      ...atmosphere,
      topic,
      mood: proactivePerception.mood,
      energy: clamp(atmosphere.energy + 9),
      cohesion: clamp(atmosphere.cohesion + 4),
      lastIntent: 'NPC 主动发起，但必须延续当前上下文',
      summary: `NPC 主动把话题续向「${topic}」，不能凭空换台。`,
    }
    const npcMessages = createNpcMessages([speaker], proactivePerception, updatedAtmosphere, memories.slice(0, 2), turn, true)

    setAtmosphere(updatedAtmosphere)
    setMessages((current) => [...current, ...npcMessages])
    setRuntime((current) => nextRuntime(current, [speaker], updatedAtmosphere))
    setMemories((current) => rememberTurn(current, proactivePerception, npcMessages))
    setTrace({
      perception: `系统检测到可主动续聊；topic=${topic}`,
      retrievedMemories: memories.slice(0, 2).map((memory) => memory.text),
      speakerReason: `${speaker.name}: ${speaker.silencePolicy}`,
      responsePlan: '主动提出可玩的微事件，而不是机械问“你想聊哪条线”。',
    })
    setTurn((current) => current + npcMessages.length)
  }

  const resetRoom = () => {
    setMessages(initialMessages)
    setInput('')
    setAtmosphere(initialAtmosphere)
    setRuntime(getInitialRuntime())
    setMemories(initialMemories)
    setTrace({
      perception: '等待玩家输入。',
      retrievedMemories: initialMemories.map((memory) => memory.text),
      speakerReason: '尚未选择发言者。',
      responsePlan: '收到玩家消息后先理解，再决定谁有信息增量。',
    })
    setTurn(4)
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Murmur / humanlike agent dialogue lab</p>
          <h1>让 NPC 先听懂，再决定要不要说话</h1>
          <p className="hero-copy">
            新版对话循环参考 Generative Agents、AI Town、Concordia、AutoGen 和 CAMEL：感知玩家意图、检索共享记忆、更新内心状态，再由真正有信息增量的 NPC 发言。
          </p>
        </div>
        <div className="architecture-card" aria-label="AI NPC network architecture">
          <span>Perceive</span>
          <strong>Memory → Plan → Speak</strong>
          <span>Shared Room State</span>
        </div>
      </section>

      <section className="dashboard">
        <aside className="sidebar">
          <div className="panel">
            <div className="panel-heading">
              <p className="eyebrow">Synchronized world state</p>
              <h2>共享氛围</h2>
            </div>
            <dl className="state-grid">
              <div>
                <dt>Topic</dt>
                <dd>{atmosphere.topic}</dd>
              </div>
              <div>
                <dt>Mood</dt>
                <dd>{atmosphere.mood}</dd>
              </div>
              <div>
                <dt>Intent</dt>
                <dd>{atmosphere.lastIntent}</dd>
              </div>
            </dl>
            <Meter label="Energy" value={atmosphere.energy} />
            <Meter label="Cohesion" value={atmosphere.cohesion} />
            <Meter label="Tension" value={atmosphere.tension} />
          </div>

          <div className="panel">
            <div className="panel-heading">
              <p className="eyebrow">Agent trace</p>
              <h2>模拟人循环</h2>
            </div>
            <ol className="trace-list">
              <li>
                <strong>感知</strong>
                <span>{trace.perception}</span>
              </li>
              <li>
                <strong>检索记忆</strong>
                <span>{trace.retrievedMemories[0] ?? '暂无相关记忆'}</span>
              </li>
              <li>
                <strong>选择发言者</strong>
                <span>{trace.speakerReason}</span>
              </li>
              <li>
                <strong>回应计划</strong>
                <span>{trace.responsePlan}</span>
              </li>
            </ol>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <p className="eyebrow">NPC mesh</p>
              <h2>角色人格与沉默策略</h2>
            </div>
            <div className="npc-list">
              {npcs.map((npc) => (
                <article
                  className="npc-card"
                  key={npc.id}
                  style={{ '--npc-color': npc.color } as CSSProperties}
                >
                  <div className="npc-avatar">{npc.avatar}</div>
                  <div>
                    <h3>{npc.name}</h3>
                    <p>{npc.role}</p>
                    <small>{npc.personality}</small>
                    <small>{npc.silencePolicy}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="chat-toolbar">
            <div>
              <p className="eyebrow">Live group chat</p>
              <h2>篝火聊天室</h2>
            </div>
            <div className="toolbar-actions">
              <label className="toggle">
                <input
                  checked={autoMurmur}
                  onChange={(event) => setAutoMurmur(event.target.checked)}
                  type="checkbox"
                />
                Auto NPC replies
              </label>
              <button onClick={triggerNpcTopic} type="button">
                NPC 主动开话题
              </button>
              <button className="ghost" onClick={resetRoom} type="button">
                Reset
              </button>
            </div>
          </div>

          <div className="message-log" ref={logRef}>
            {messages.map((message) => (
              <article className={`message ${message.speakerId === 'player' ? 'player' : ''}`} key={message.id}>
                <div className="message-meta">
                  <strong>{message.speakerName}</strong>
                  <span>{message.tone}</span>
                  <time>{message.timestamp}</time>
                </div>
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          <form className="composer" onSubmit={submitPlayerMessage}>
            <input
              aria-label="Message the NPC group"
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入一句话，例如：头号玩家电影里的绿洲游戏能实现吗"
              value={input}
            />
            <button type="submit">Send</button>
          </form>
        </section>
      </section>

      <section className="research-strip">
        <article>
          <h2>前沿技术的 MVP 复刻思路</h2>
          <p>
            新架构吸收 Generative Agents 的记忆/反思/计划、AI Town 的仿真循环、Concordia 的 GM 式环境裁决、AutoGen 的选择器群聊、CAMEL 的角色边界与防复读机制。
          </p>
          <ul>
            {researchNotes.slice(0, 3).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </article>
        <article>
          <h2>下一步</h2>
          <p>
            当前仍是本地可跑的规则模型；下一步可以把 `simulateAgentTurn` 换成 LLM 或本地模型，同时保留记忆检索、发言者选择和防模板收尾的外壳。
          </p>
          <ul>
            {researchNotes.slice(3).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  )
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="meter">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <progress max="100" value={value} />
    </div>
  )
}

export default App
