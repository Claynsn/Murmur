import { useCallback, useEffect, useRef, useState } from 'react'
import { personaById, personas } from './personas'
import type {
  ChatMessage,
  LlmSettings,
  PersonaId,
  PlannedUtterance,
  Presence,
} from './types'
import {
  betweenBubblesMs,
  chance,
  maybeTypo,
  rand,
  readDelayMs,
  sleep,
  splitIntoBubbles,
  typingMs,
} from './engine/humanize'
import { planIdleLocally, planLocally } from './engine/fallback'
import { loadSettings, planWithLlm, saveSettings } from './engine/llm'

let messageSeq = 0
const nextId = () => `m${Date.now()}_${messageSeq++}`

const minutesAgo = (m: number) => Date.now() - m * 60_000

/** 进群时已经存在的对话：让用户落地在一段"正在进行"的真实闲聊中 */
const seedMessages = (): ChatMessage[] => [
  { id: nextId(), speakerId: 'luma', text: '新一批耶加雪菲到了！这周谁来试喝', at: minutesAgo(26) },
  { id: nextId(), speakerId: 'jun', text: '几点 我蹭', at: minutesAgo(25) },
  { id: nextId(), speakerId: 'luma', text: '晚上八点以后都行 店里人少', at: minutesAgo(25) },
  { id: nextId(), speakerId: 'taro', text: '加班 下次', at: minutesAgo(23) },
  { id: nextId(), speakerId: 'luma', text: '老周你已经下次了三次了', at: minutesAgo(23) },
  { id: nextId(), speakerId: 'mira', text: '我改完作业就过去～给我留个靠窗的位置', at: minutesAgo(21) },
  { id: nextId(), speakerId: 'jun', text: '哈哈哈哈老周的下次一定', at: minutesAgo(20) },
  { id: nextId(), speakerId: 'system', text: '你加入了群聊', at: minutesAgo(1) },
]

const initialPresence = (): Record<PersonaId, Presence> => {
  const hour = new Date().getHours()
  const daytime = hour >= 9 && hour < 21
  return {
    jun: 'online',
    mira: hour >= 23 || hour < 7 ? 'away' : 'online',
    taro: 'online',
    vesper: daytime ? 'away' : 'online',
    luma: 'online',
  }
}

export const useChatRoom = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages)
  const [typing, setTyping] = useState<PersonaId[]>([])
  const [presence, setPresence] = useState<Record<PersonaId, Presence>>(initialPresence)
  const [settings, setSettingsState] = useState<LlmSettings>(loadSettings)
  const [lastError, setLastError] = useState<string>('')

  const messagesRef = useRef<ChatMessage[]>([])
  const genRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleStreakRef = useRef(0)
  const settingsRef = useRef<LlmSettings>(null as unknown as LlmSettings)
  const presenceRef = useRef<Record<PersonaId, Presence>>(null as unknown as Record<PersonaId, Presence>)
  const scheduleIdleRef = useRef<() => void>(() => {})

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  useEffect(() => {
    presenceRef.current = presence
  }, [presence])

  const append = useCallback((speakerId: ChatMessage['speakerId'], text: string) => {
    setMessages((current) => [...current, { id: nextId(), speakerId, text, at: Date.now() }])
  }, [])

  const setSettings = useCallback((next: LlmSettings) => {
    setSettingsState(next)
    saveSettings(next)
  }, [])

  const addTyping = (id: PersonaId) =>
    setTyping((current) => (current.includes(id) ? current : [...current, id]))
  const removeTyping = (id: PersonaId) =>
    setTyping((current) => current.filter((t) => t !== id))

  /** 按真人节奏播放一组发言：阅读延迟 → 正在输入 → 逐条冒出 → 错字纠正 */
  const playPlan = useCallback(
    async (plan: PlannedUtterance[], gen: number, triggerLen: number) => {
      let contextLen = triggerLen
      for (const turn of plan) {
        const persona = personaById[turn.id]
        if (!persona) continue
        await sleep(readDelayMs(persona, contextLen))
        if (genRef.current !== gen) return
        const bubbles = turn.msgs.flatMap(splitIntoBubbles).slice(0, 5)
        try {
          for (const bubble of bubbles) {
            const { text, correction } = maybeTypo(bubble, persona)
            addTyping(persona.id)
            await sleep(typingMs(text, persona))
            removeTyping(persona.id)
            if (genRef.current !== gen) return
            append(persona.id, text)
            if (correction) {
              addTyping(persona.id)
              await sleep(rand(600, 1400))
              removeTyping(persona.id)
              if (genRef.current !== gen) return
              append(persona.id, correction)
            }
            await sleep(betweenBubblesMs())
            if (genRef.current !== gen) return
          }
        } finally {
          removeTyping(persona.id)
        }
        contextLen = 0
      }
    },
    [append],
  )

  const makePlan = useCallback(
    async (kind: 'reply' | 'idle', userText: string): Promise<PlannedUtterance[]> => {
      const s = settingsRef.current ?? loadSettings()
      const currentPresence = presenceRef.current ?? initialPresence()
      if (s.enabled) {
        try {
          const plan = await planWithLlm(s, messagesRef.current, kind)
          setLastError('')
          return plan
        } catch (error) {
          setLastError(error instanceof Error ? error.message : String(error))
        }
      }
      return kind === 'reply'
        ? planLocally(userText, messagesRef.current, currentPresence)
        : planIdleLocally(currentPresence)
    },
    [],
  )

  const scheduleIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(async () => {
      if (idleStreakRef.current >= 2) return
      const gen = genRef.current
      const plan = await makePlan('idle', '')
      if (genRef.current !== gen || !plan.length) return
      idleStreakRef.current += 1
      await playPlan(plan, gen, 0)
      if (genRef.current === gen) scheduleIdleRef.current()
    }, rand(20_000, 48_000))
  }, [makePlan, playPlan])

  useEffect(() => {
    scheduleIdleRef.current = scheduleIdle
  }, [scheduleIdle])

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text) return
      const gen = ++genRef.current
      setTyping([])
      idleStreakRef.current = 0
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      append('me', text)
      messagesRef.current = [
        ...messagesRef.current,
        { id: 'pending', speakerId: 'me', text, at: Date.now() },
      ]
      const plan = await makePlan('reply', text)
      if (genRef.current !== gen) return
      await playPlan(plan, gen, text.length)
      if (genRef.current === gen) scheduleIdle()
    },
    [append, makePlan, playPlan, scheduleIdle],
  )

  // 在线状态缓慢漂移：有人离开、有人回来
  useEffect(() => {
    const tick = setInterval(() => {
      setPresence((current) => {
        const target = personas[Math.floor(Math.random() * personas.length)]
        if (!chance(0.3)) return current
        const hour = new Date().getHours()
        const next: Presence =
          target.nightOwl && hour >= 9 && hour < 21
            ? 'away'
            : current[target.id] === 'online' && chance(0.4)
              ? 'away'
              : 'online'
        if (next === current[target.id]) return current
        return { ...current, [target.id]: next }
      })
    }, 35_000)
    return () => clearInterval(tick)
  }, [])

  // 进群后片刻，群里的人对"新人"有自然反应
  useEffect(() => {
    const gen = genRef.current
    const timer = setTimeout(async () => {
      if (genRef.current !== gen) return
      await playPlan(
        [
          { id: 'jun', msgs: ['来了来了'] },
          { id: 'luma', msgs: ['正好！试喝名单+1', '别想跑'] },
        ],
        gen,
        0,
      )
      if (genRef.current === gen) scheduleIdleRef.current()
    }, rand(2500, 5000))
    return () => clearTimeout(timer)
  }, [playPlan])

  return { messages, typing, presence, settings, setSettings, lastError, send }
}
