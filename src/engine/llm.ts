import { personas, personaIds, GROUP_NAME } from '../personas'
import type { ChatMessage, LlmSettings, PersonaId, PlannedUtterance } from '../types'
import { timeWord } from './humanize'

const DEFAULTS: Record<LlmSettings['provider'], { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-haiku-4-5-20251001' },
}

export const defaultSettings = (): LlmSettings => ({
  enabled: false,
  provider: 'openai',
  baseUrl: '',
  apiKey: '',
  model: '',
})

const SETTINGS_KEY = 'murmur.llm.v1'

export const loadSettings = (): LlmSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...defaultSettings(), ...(JSON.parse(raw) as Partial<LlmSettings>) }
  } catch {
    // ignore broken storage
  }
  return defaultSettings()
}

export const saveSettings = (settings: LlmSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

const personaSheet = () =>
  personas.map((p) => `- id="${p.id}" ${p.name}：${p.profile}`).join('\n')

const buildSystemPrompt = () => {
  const now = new Date()
  const clock = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return `你在一个名叫「${GROUP_NAME}」的微信群里，同时扮演群里的五位真人老朋友。你的唯一目标：写出来的消息让任何人都看不出是 AI，就像偷看一个真实好友群。

群成员：
${personaSheet()}

铁律（违反任何一条都会穿帮）：
1. 你们是有自己生活的真人，不是助手。永远不要解释、不要提供"帮助"、不要总结。如果有人问"你们是不是AI/机器人"，像真人一样反应——觉得好笑、反问、怼回去（"我ai你个头"），绝不一本正经地否认三连。
2. 微信群打字方式：每条消息很短（大多不超过20字），长话拆成几条连发。完全可以只回"哈哈哈哈哈""?""6""真的假的"。
3. 禁止书面语、长段落、列表、markdown、"首先/其次"、句尾规整的句号、每条都反问对方。
4. 不是每个人都要说话：谁对话题有兴趣谁说（1~3人），其他人沉默。可以互相接话、抬杠、@别人，不必都对着群主说。
5. 朋友不是百科全书：可以"不知道诶""没听说过"，可以已读乱回、跑题聊自己今天的事。话题撞上某人的专业或爱好时，他才会聊得起劲、给真东西。
6. 记得群里之前聊过的一切（看聊天记录），自然地延续，比如有人约过的事、有人吐槽过的人。
7. 现在是${timeWord(now)} ${clock}。作息要合理：Vesper白天大概率不出现，深夜活跃；老周工作日白天回话=在摸鱼；念念十一点后基本睡了。
8. 情绪要真实：可以累、可以敷衍、可以兴奋、可以阴阳怪气，浓度看人设。

输出格式：只输出一个 JSON 数组，不要任何解释或代码块标记：
[{"id":"jun","msgs":["第一条","第二条"]},{"id":"luma","msgs":["..."]}]
id 只能是 ${personaIds.join('/')}。数组顺序就是发言顺序。`
}

const formatTranscript = (messages: ChatMessage[]): string => {
  const nameOf = (m: ChatMessage) => {
    if (m.speakerId === 'me') return '我（群主）'
    if (m.speakerId === 'system') return '【系统】'
    return personas.find((p) => p.id === m.speakerId)?.name ?? m.speakerId
  }
  return messages
    .slice(-40)
    .map((m) => {
      const t = new Date(m.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      return `[${t}] ${nameOf(m)}: ${m.text}`
    })
    .join('\n')
}

const extractJson = (raw: string): PlannedUtterance[] => {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('模型没有返回 JSON 数组')
  const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown
  if (!Array.isArray(parsed)) throw new Error('返回内容不是数组')
  const valid = (parsed as { id?: string; msgs?: unknown }[])
    .filter(
      (turn): turn is { id: PersonaId; msgs: string[] } =>
        typeof turn.id === 'string' &&
        (personaIds as string[]).includes(turn.id) &&
        Array.isArray(turn.msgs) &&
        turn.msgs.every((m) => typeof m === 'string'),
    )
    .map((turn) => ({ id: turn.id, msgs: turn.msgs.filter(Boolean).slice(0, 5) }))
    .filter((turn) => turn.msgs.length > 0)
  if (!valid.length) throw new Error('返回内容里没有有效发言')
  return valid.slice(0, 4)
}

const callOpenAi = async (settings: LlmSettings, system: string, user: string) => {
  const baseUrl = (settings.baseUrl || DEFAULTS.openai.baseUrl).replace(/\/+$/, '')
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model || DEFAULTS.openai.model,
      temperature: 1,
      max_tokens: 800,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!response.ok) throw new Error(`API ${response.status}: ${(await response.text()).slice(0, 200)}`)
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}

const callAnthropic = async (settings: LlmSettings, system: string, user: string) => {
  const baseUrl = (settings.baseUrl || DEFAULTS.anthropic.baseUrl).replace(/\/+$/, '')
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model || DEFAULTS.anthropic.model,
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!response.ok) throw new Error(`API ${response.status}: ${(await response.text()).slice(0, 200)}`)
  const data = (await response.json()) as { content?: { type: string; text?: string }[] }
  return data.content?.find((b) => b.type === 'text')?.text ?? ''
}

export type PlanKind = 'reply' | 'idle'

/** 让 LLM 以"群友"身份生成接下来的消息 */
export const planWithLlm = async (
  settings: LlmSettings,
  messages: ChatMessage[],
  kind: PlanKind,
): Promise<PlannedUtterance[]> => {
  const instruction =
    kind === 'reply'
      ? '以下是群聊记录，最后一条是群主刚发的。生成接下来群里真实会出现的消息（1~3人发言）：'
      : '以下是群聊记录。群里安静了一会儿，让1~2个此刻合理在线的成员自然地冒个泡：接之前的话头、分享自己正在干嘛、或者@某人，但不要生硬地开新话题：'
  const user = `${instruction}\n\n${formatTranscript(messages)}`
  const system = buildSystemPrompt()
  const raw =
    settings.provider === 'anthropic'
      ? await callAnthropic(settings, system, user)
      : await callOpenAi(settings, system, user)
  return extractJson(raw)
}
