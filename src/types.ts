export type PersonaId = 'jun' | 'mira' | 'taro' | 'vesper' | 'luma'

export type SpeakerId = PersonaId | 'me' | 'system'

export type ChatMessage = {
  id: string
  speakerId: SpeakerId
  text: string
  at: number
}

export type Persona = {
  id: PersonaId
  name: string
  avatarText: string
  color: string
  bio: string
  /** 给 LLM 的人物卡：生活背景 + 打字习惯 */
  profile: string
  /** 打字速度：字/秒 */
  typingCharsPerSec: number
  /** 看到消息后开始动手前的延迟范围（毫秒） */
  readDelayMs: [number, number]
  /** 0~1，越高越爱说话 */
  eagerness: number
  /** 0~1，错别字概率（按条） */
  typoRate: number
  /** 短反应池：可以单独成一条消息 */
  reactions: string[]
  /** 夜猫子/潜水属性，影响在线状态模拟 */
  nightOwl?: boolean
}

export type PlannedUtterance = {
  id: PersonaId
  msgs: string[]
}

export type LlmProvider = 'openai' | 'anthropic'

export type LlmSettings = {
  enabled: boolean
  provider: LlmProvider
  baseUrl: string
  apiKey: string
  model: string
}

export type Presence = 'online' | 'away'
