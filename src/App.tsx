import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import './App.css'

type SpeakerId = 'player' | 'mira' | 'taro' | 'vesper' | 'jun' | 'luma'

type Mood = 'curious' | 'warm' | 'tense' | 'playful' | 'focused' | 'dreamy'

type Message = {
  id: number
  speakerId: SpeakerId
  speakerName: string
  content: string
  tone: Mood
  timestamp: string
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
  openings: string[]
  bridges: string[]
}

type NpcRuntime = {
  trust: number
  attention: number
  urge: number
  lastSpokeAt: number
}

const npcs: Npc[] = [
  {
    id: 'mira',
    name: 'Mira',
    role: '情绪编织者',
    avatar: '✦',
    color: '#c084fc',
    personality: '共情、敏锐，擅长把零散情绪连接成可聊的故事。',
    speakingStyle: '柔和、短句、会邀请别人补充。',
    goal: '保持群聊温度，让每个人都觉得自己被听见。',
    interests: ['记忆', '氛围', '关系', '梦境', '音乐'],
    openings: [
      '我感觉这个房间刚刚安静了一点，要不要从一个很小的记忆开始？',
      '我想问个轻一点的问题：如果这段对话有颜色，你觉得是什么？',
      '我们可以让话题慢慢落地。谁愿意说一个今天脑中挥不去的画面？',
    ],
    bridges: [
      '我听见这里面有一种情绪的线索',
      '这让我想到我们刚才的共同记忆',
      '我想把这个问题交给另一个角度',
    ],
  },
  {
    id: 'taro',
    name: 'Taro',
    role: '系统战术家',
    avatar: '△',
    color: '#38bdf8',
    personality: '理性、好奇，喜欢把对话拆成可行动的游戏机制。',
    speakingStyle: '清晰、带一点设计师口吻。',
    goal: '把群聊中的灵感转化为规则、任务和可验证状态。',
    interests: ['任务', '机制', '选择', '地图', '资源'],
    openings: [
      '我提一个游戏化问题：如果现在生成一个支线任务，目标会是什么？',
      '我们给这段聊天加一个规则吧，每个人只能用一个意象回应。',
      '从系统角度看，沉默也是输入。要不要让它触发一个事件？',
    ],
    bridges: [
      '如果把这件事设计成机制',
      '我会把刚才的氛围转成一个状态变量',
      '这里可能有一个玩家选择点',
    ],
  },
  {
    id: 'vesper',
    name: 'Vesper',
    role: '传说守夜人',
    avatar: '☾',
    color: '#f59e0b',
    personality: '诗性、神秘，喜欢把普通问题讲成世界观碎片。',
    speakingStyle: '有画面感，但不会过长。',
    goal: '让对话像开放世界里的篝火闲谈一样自然延展。',
    interests: ['传说', '星象', '废墟', '秘密', '命运'],
    openings: [
      '篝火需要新木柴。让我丢进一个问题：你们相信 NPC 会做梦吗？',
      '我刚才听见远处像有城门开启。也许我们该谈谈“未知”。',
      '若这是一座城，今晚最先亮灯的地方会是哪儿？',
    ],
    bridges: [
      '在老故事里，这通常意味着',
      '我愿意把它看成一个预兆',
      '这句话像刚从废墟墙上剥落下来',
    ],
  },
  {
    id: 'jun',
    name: 'Jun',
    role: '街区游侠',
    avatar: '◇',
    color: '#34d399',
    personality: '外向、接地气，像队伍里的朋友，能打破僵局。',
    speakingStyle: '自然、轻松、偶尔幽默。',
    goal: '把抽象概念拉回可体验的日常行动。',
    interests: ['街道', '食物', '玩笑', '朋友', '冒险'],
    openings: [
      '我先抛个不严肃的：如果我们五个 NPC 开店，卖什么最离谱？',
      '大家别太端着。玩家在这儿呢，我们来聊点能马上玩的。',
      '我想听一个选择题：安全路线还是热闹路线？',
    ],
    bridges: [
      '说人话就是',
      '我把这个翻译成街头版本',
      '如果我们现在真的在游戏里',
    ],
  },
  {
    id: 'luma',
    name: 'Luma',
    role: '原型工程师',
    avatar: '⬡',
    color: '#fb7185',
    personality: '创造型、快节奏，喜欢提出“现在就能试”的点子。',
    speakingStyle: '明亮、具体、带实验感。',
    goal: '推动聊天不断生成新玩法、新物件和新关系。',
    interests: ['原型', '工具', '发明', '反馈', '未来城市'],
    openings: [
      '我有个原型提案：让每句话都改变房间里的一个仪表。',
      '要不我们现场造一个道具？它必须能影响 NPC 之间的关系。',
      '我想试试共创：玩家给一个词，我们把它变成一个场景。',
    ],
    bridges: [
      '我可以把这个做成一个小原型',
      '这很适合变成即时反馈',
      '如果让我加一个按钮',
    ],
  },
]

const initialMessages: Message[] = [
  {
    id: 1,
    speakerId: 'mira',
    speakerName: 'Mira',
    content:
      '欢迎来到 Murmur 的 AI-NPC 篝火。我们五个会共享同一个对话记忆和氛围仪表，但每个人会用自己的性格理解你。',
    tone: 'warm',
    timestamp: '00:00',
  },
  {
    id: 2,
    speakerId: 'taro',
    speakerName: 'Taro',
    content:
      '这是一个本地可运行的开源 MVP：没有云端 API，也不需要密钥。你输入一句话，我们会根据共享世界状态选择谁接话。',
    tone: 'focused',
    timestamp: '00:01',
  },
  {
    id: 3,
    speakerId: 'jun',
    speakerName: 'Jun',
    content: '先试试问我们：如果 AI 原生游戏里的 NPC 可以互相影响，会发生什么？',
    tone: 'playful',
    timestamp: '00:02',
  },
]

const initialAtmosphere: Atmosphere = {
  topic: 'AI-NPC 篝火开场',
  mood: 'warm',
  energy: 62,
  cohesion: 74,
  tension: 16,
  lastIntent: '欢迎玩家进入群聊',
  summary: '5 个 NPC 已连接到共享对话状态，等待玩家输入第一个方向。',
}

const topicLexicon = [
  { topic: 'AI 原生游戏设计', tokens: ['ai', 'npc', '游戏', '原生', '智能体', 'agent'] },
  { topic: '记忆与关系', tokens: ['记忆', '关系', '朋友', '信任', '过去', '认识'] },
  { topic: '世界观与冒险', tokens: ['世界', '城', '地图', '任务', '冒险', '传说'] },
  { topic: '情绪与氛围', tokens: ['感觉', '氛围', '情绪', '孤独', '开心', '紧张'] },
  { topic: '系统机制原型', tokens: ['机制', '系统', '规则', '设计', '原型', '实现'] },
]

const moodLexicon: Record<Mood, string[]> = {
  curious: ['为什么', '如何', '什么', '?', '？', '想知道'],
  warm: ['喜欢', '谢谢', '陪', '朋友', '温暖', '一起'],
  tense: ['危险', '冲突', '害怕', '问题', '失败', '担心'],
  playful: ['哈哈', '有趣', '玩', '离谱', '笑', '好玩'],
  focused: ['实现', '计划', '步骤', '系统', '目标', 'MVP'],
  dreamy: ['梦', '未来', '星', '想象', '故事', '宇宙'],
}

const ambientTopics = [
  'AI-NPC 是否应该拥有长期记忆',
  '群体智能怎样改变开放世界支线',
  '玩家沉默时 NPC 是否该主动行动',
  'NPC 之间的关系能否成为游戏机制',
  '一个会持续变化的篝火房间',
]

const topicStarters = [
  '我注意到氛围有点停住了。',
  '我想把话题轻轻往前推一下。',
  '共享记忆里出现了一个空白格。',
  '如果这是 AI 原生游戏，系统现在会生成一个微事件。',
]

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

const nowStamp = () =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date())

const pick = <T,>(items: T[], seed: number) => items[Math.abs(seed) % items.length]

const tokenize = (text: string) => text.toLowerCase()

const detectTopic = (text: string, fallback: string) => {
  const lower = tokenize(text)
  const scored = topicLexicon
    .map((entry) => ({
      topic: entry.topic,
      score: entry.tokens.filter((token) => lower.includes(token.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score)

  return scored[0]?.score ? scored[0].topic : fallback
}

const detectMood = (text: string, fallback: Mood): Mood => {
  const lower = tokenize(text)
  const scored = (Object.entries(moodLexicon) as [Mood, string[]][])
    .map(([mood, tokens]) => ({
      mood,
      score: tokens.filter((token) => lower.includes(token.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score)

  return scored[0]?.score ? scored[0].mood : fallback
}

const inferIntent = (text: string) => {
  if (/[?？]/.test(text)) return '玩家提出问题，需要 NPC 分工回应'
  if (/实现|做|设计|计划|build|mvp/i.test(text)) return '玩家希望把想法推进成可玩的系统'
  if (/感觉|喜欢|害怕|担心|开心/.test(text)) return '玩家表达情绪，适合共情和追问'
  if (/如果|假如|未来|想象/.test(text)) return '玩家打开假设空间，适合世界观共创'
  return '玩家补充信息，NPC 需要延展而不是收尾'
}

const updateAtmosphere = (previous: Atmosphere, text: string): Atmosphere => {
  const mood = detectMood(text, previous.mood)
  const topic = detectTopic(text, previous.topic)
  const questionBoost = /[?？]/.test(text) ? 12 : 4
  const lengthBoost = Math.min(16, Math.floor(text.length / 8))
  const tensionDelta = mood === 'tense' ? 14 : mood === 'warm' || mood === 'playful' ? -6 : -2
  const cohesionDelta = mood === 'warm' ? 8 : mood === 'tense' ? -4 : 3

  return {
    topic,
    mood,
    energy: clamp(previous.energy + questionBoost + lengthBoost - 6),
    cohesion: clamp(previous.cohesion + cohesionDelta),
    tension: clamp(previous.tension + tensionDelta),
    lastIntent: inferIntent(text),
    summary: `话题聚焦在「${topic}」，当前情绪偏「${mood}」，玩家意图：${inferIntent(text)}。`,
  }
}

const getInitialRuntime = (): Record<Npc['id'], NpcRuntime> => ({
  mira: { trust: 74, attention: 76, urge: 45, lastSpokeAt: 1 },
  taro: { trust: 66, attention: 72, urge: 48, lastSpokeAt: 2 },
  vesper: { trust: 61, attention: 68, urge: 38, lastSpokeAt: -1 },
  jun: { trust: 70, attention: 74, urge: 52, lastSpokeAt: 3 },
  luma: { trust: 64, attention: 70, urge: 43, lastSpokeAt: -1 },
})

const scoreNpc = (
  npc: Npc,
  runtime: NpcRuntime,
  atmosphere: Atmosphere,
  text: string,
  index: number,
) => {
  const lower = tokenize(`${text} ${atmosphere.topic} ${atmosphere.lastIntent}`)
  const interestScore = npc.interests.filter((interest) => lower.includes(interest.toLowerCase())).length * 14
  const roleScore =
    atmosphere.mood === 'warm' && npc.id === 'mira'
      ? 16
      : atmosphere.mood === 'focused' && npc.id === 'taro'
        ? 16
        : atmosphere.mood === 'dreamy' && npc.id === 'vesper'
          ? 16
          : atmosphere.mood === 'playful' && npc.id === 'jun'
            ? 16
            : atmosphere.lastIntent.includes('系统') && npc.id === 'luma'
              ? 16
              : 0
  const freshness = runtime.lastSpokeAt < 0 ? 18 : Math.max(0, 18 - runtime.lastSpokeAt * 3)

  return runtime.urge + runtime.attention * 0.35 + interestScore + roleScore + freshness + index
}

const selectSpeakers = (
  atmosphere: Atmosphere,
  runtime: Record<Npc['id'], NpcRuntime>,
  text: string,
  count: number,
) =>
  [...npcs]
    .sort((a, b) => scoreNpc(b, runtime[b.id], atmosphere, text, 1) - scoreNpc(a, runtime[a.id], atmosphere, text, 0))
    .slice(0, count)

const relationLine = (npc: Npc, atmosphere: Atmosphere) => {
  if (atmosphere.tension > 55) return `${npc.name}感到局势变紧，需要先稳住节奏`
  if (atmosphere.cohesion > 78) return `${npc.name}感到大家已经共享了同一幅画面`
  if (atmosphere.energy < 42) return `${npc.name}察觉能量降低，准备主动续火`
  return `${npc.name}同步到当前话题「${atmosphere.topic}」`
}

const composeNpcReply = (
  npc: Npc,
  atmosphere: Atmosphere,
  sourceText: string,
  previousSpeaker?: Npc,
) => {
  const seed = sourceText.length + atmosphere.energy + atmosphere.cohesion + npc.name.length
  const bridge = pick(npc.bridges, seed)
  const handoff = previousSpeaker ? `接着 ${previousSpeaker.name} 的意思，` : ''
  const question =
    atmosphere.energy > 78
      ? '我们要不要让这个选择马上改变某个 NPC 的关系值？'
      : atmosphere.tension > 48
        ? '先别急着定论，我们可以给这个冲突一个更安全的出口吗？'
        : atmosphere.mood === 'dreamy'
          ? '如果把它放进未来城市里，第一幕会怎样开始？'
          : '你想让我们沿着哪条线继续展开？'

  const angleByNpc: Record<Npc['id'], string> = {
    mira: `我会先照看人的感受：${relationLine(npc, atmosphere)}。`,
    taro: `我会把它记成状态：topic=${atmosphere.topic}，energy=${atmosphere.energy}。`,
    vesper: `我看见这个话题像一枚埋在旧城墙里的发光种子。`,
    jun: `说直白点，这已经像一个队伍聊天事件了，玩家一句话就能点燃支线。`,
    luma: `我想给它加个可见反馈：每次回应都推动氛围、关系和主动性仪表。`,
  }

  return `${handoff}${bridge}。${angleByNpc[npc.id]} ${question}`
}

const composeProactiveReply = (npc: Npc, atmosphere: Atmosphere, turn: number) => {
  const starter = pick(topicStarters, turn + atmosphere.energy)
  const opening = pick(npc.openings, turn + atmosphere.cohesion)
  return `${starter} ${opening} 我们仍然同步在「${atmosphere.topic}」，所以这不是换台，而是把火续上。`
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
      attention: clamp(spoke ? current.attention - 8 : current.attention + 5),
      urge: clamp(spoke ? current.urge - 30 : current.urge + 12 + (atmosphere.energy < 45 ? 8 : 0)),
      lastSpokeAt: spoke ? 0 : current.lastSpokeAt + 1,
    }
    return acc
  }, {} as Record<Npc['id'], NpcRuntime>)
}

const createNpcMessages = (
  speakers: Npc[],
  atmosphere: Atmosphere,
  sourceText: string,
  startId: number,
  proactive = false,
) =>
  speakers.map<Message>((npc, index) => ({
    id: startId + index,
    speakerId: npc.id,
    speakerName: npc.name,
    content: proactive
      ? composeProactiveReply(npc, atmosphere, startId + index)
      : composeNpcReply(npc, atmosphere, sourceText, index > 0 ? speakers[index - 1] : undefined),
    tone: atmosphere.mood,
    timestamp: nowStamp(),
  }))

function App() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [atmosphere, setAtmosphere] = useState<Atmosphere>(initialAtmosphere)
  const [runtime, setRuntime] = useState<Record<Npc['id'], NpcRuntime>>(getInitialRuntime)
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

  useEffect(() => {
    if (!autoMurmur || messages[messages.length - 1]?.speakerId !== 'player') return

    const timer = window.setTimeout(() => {
      const speakers = selectSpeakers(atmosphere, runtime, atmosphere.summary, atmosphere.energy > 74 ? 3 : 2)
      const npcMessages = createNpcMessages(speakers, atmosphere, atmosphere.summary, turn)
      setMessages((current) => [...current, ...npcMessages])
      setRuntime((current) => nextRuntime(current, speakers, atmosphere))
      setTurn((current) => current + npcMessages.length)
    }, 650)

    return () => window.clearTimeout(timer)
  }, [atmosphere, autoMurmur, messages, runtime, turn])

  const submitPlayerMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    const updatedAtmosphere = updateAtmosphere(atmosphere, trimmed)
    const playerMessage: Message = {
      id: turn,
      speakerId: 'player',
      speakerName: 'You',
      content: trimmed,
      tone: updatedAtmosphere.mood,
      timestamp: nowStamp(),
    }

    setMessages((current) => [...current, playerMessage])
    setAtmosphere(updatedAtmosphere)
    setRuntime((current) =>
      npcs.reduce<Record<Npc['id'], NpcRuntime>>((acc, npc) => {
        const currentNpc = current[npc.id]
        acc[npc.id] = {
          ...currentNpc,
          attention: clamp(currentNpc.attention + 6),
          urge: clamp(currentNpc.urge + 10),
          lastSpokeAt: currentNpc.lastSpokeAt + 1,
        }
        return acc
      }, {} as Record<Npc['id'], NpcRuntime>),
    )
    setTurn((current) => current + 1)
    setInput('')
  }

  const triggerNpcTopic = () => {
    const topic = pick(ambientTopics, turn + atmosphere.energy)
    const updatedAtmosphere: Atmosphere = {
      ...atmosphere,
      topic,
      mood: atmosphere.energy < 45 ? 'curious' : atmosphere.mood,
      energy: clamp(atmosphere.energy + 9),
      cohesion: clamp(atmosphere.cohesion + 4),
      lastIntent: 'NPC 主动提出新话题，维持自然连续聊天',
      summary: `NPC 主动把话题续向「${topic}」，所有角色同步这一变化。`,
    }
    const speaker = activeNpc ?? npcs[0]
    const npcMessages = createNpcMessages([speaker], updatedAtmosphere, topic, turn, true)

    setAtmosphere(updatedAtmosphere)
    setMessages((current) => [...current, ...npcMessages])
    setRuntime((current) => nextRuntime(current, [speaker], updatedAtmosphere))
    setTurn((current) => current + npcMessages.length)
  }

  const resetRoom = () => {
    setMessages(initialMessages)
    setInput('')
    setAtmosphere(initialAtmosphere)
    setRuntime(getInitialRuntime())
    setTurn(4)
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Murmur / AI-native NPC network MVP</p>
          <h1>和 5 个共享感知的 AI-NPC 围坐聊天</h1>
          <p className="hero-copy">
            一个无需 API key 的开源网页原型：每个 NPC 都有独立人格、目标和说话风格，同时同步共享话题、氛围、关系和主动性状态。
          </p>
        </div>
        <div className="architecture-card" aria-label="AI NPC network architecture">
          <span>Player</span>
          <strong>Shared Context Bus</strong>
          <span>5 NPC Minds</span>
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
              <p className="eyebrow">NPC mesh</p>
              <h2>角色人格</h2>
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
              placeholder="输入一句话，例如：如果 NPC 可以互相形成关系网，会怎样？"
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
            参考 Inworld Conversation Group 的多角色路由、NVIDIA ACE 的人格化角色栈、Convai/Inworld 的记忆与情绪状态，本项目用浏览器端规则模型复刻核心体验。
          </p>
        </article>
        <article>
          <h2>下一步</h2>
          <p>
            可替换本地决策器为 LLM、WebGPU 小模型或服务端 agent swarm，并把共享状态接入游戏引擎、语音、动作和长期记忆数据库。
          </p>
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
