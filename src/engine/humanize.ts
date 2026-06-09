import type { Persona } from '../types'

export const rand = (min: number, max: number) => min + Math.random() * (max - min)

export const randInt = (min: number, max: number) => Math.round(rand(min, max))

export const chance = (p: number) => Math.random() < p

export const pickOne = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** 常见同音/形近错字对：[正确, 打错成] */
const typoPairs: [string, string][] = [
  ['在', '再'],
  ['再', '在'],
  ['的', '得'],
  ['做', '作'],
  ['吧', '把'],
  ['那', '哪'],
  ['知道', '直到'],
  ['时候', '时侯'],
  ['什么', '神马'],
  ['没有', '梅有'],
  ['感觉', '感jio'],
  ['现在', '县在'],
]

export type TypoResult = {
  text: string
  /** 如果打错了字，纠正消息的内容（通常是单独补发正确的词） */
  correction?: string
}

/**
 * 以 persona 的错字率随机注入一个错别字。
 * 真人打错字后大多会立刻补一条更正，所以同时返回纠正消息。
 */
export const maybeTypo = (text: string, persona: Persona): TypoResult => {
  if (!chance(persona.typoRate)) return { text }
  const candidates = typoPairs.filter(([right]) => text.includes(right))
  if (!candidates.length) return { text }
  const [right, wrong] = pickOne(candidates)
  const typoed = text.replace(right, wrong)
  if (typoed === text) return { text }
  // 不是每个错字都会被纠正——有些人懒得改
  if (!chance(0.6)) return { text: typoed }
  const correction = chance(0.5) ? `*${right}` : `打错了，${right}`
  return { text: typoed, correction }
}

/** 去掉一眼 AI 的痕迹：markdown、列表、客套、规整句号 */
export const stripAiTells = (text: string): string => {
  let out = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^(首先|其次|再次|最后|总之|综上)[，,]/gm, '')
    .replace(/作为(一个|一名)?(AI|人工智能|语言模型|助手)[^，。]*[，。]?/g, '')
    .replace(/您/g, '你')
    .trim()
  // 真人在群里很少规规矩矩用句号结尾
  if (out.endsWith('。') && chance(0.85)) out = out.slice(0, -1)
  return out
}

/** 真人不会发一大段——把长消息按标点切成连发的几条 */
export const splitIntoBubbles = (text: string): string[] => {
  const clean = stripAiTells(text)
  if (clean.length <= 28) return clean ? [clean] : []
  const parts = clean
    .split(/(?<=[。！？!?；;\n])/)
    .map((p) =>
      p
        .replace(/[。；;\n]+$/, '')
        .replace(/^(首先|其次|再次|然后|最后|总之|综上所述|综上)[，,、]?/, '')
        .trim(),
    )
    .filter(Boolean)
  // 合并过碎的片段，避免一个字一条
  const bubbles: string[] = []
  for (const part of parts) {
    const last = bubbles[bubbles.length - 1]
    if (last && last.length + part.length <= 16) {
      bubbles[bubbles.length - 1] = `${last}${last.match(/[！？!?]$/) ? '' : ' '}${part}`
    } else {
      bubbles.push(part)
    }
  }
  return bubbles.slice(0, 4)
}

/** 看到消息后到开始打字的延迟：阅读时间 + 个人反应速度 */
export const readDelayMs = (persona: Persona, contextLen: number): number => {
  const [min, max] = persona.readDelayMs
  return Math.min(12000, rand(min, max) + contextLen * 25)
}

/** 打字时长：按字数和个人手速估算，带抖动 */
export const typingMs = (text: string, persona: Persona): number => {
  const base = (text.length / persona.typingCharsPerSec) * 1000
  return Math.min(9000, Math.max(650, base * rand(0.75, 1.3)))
}

/** 同一个人连发多条之间的间隔 */
export const betweenBubblesMs = () => rand(350, 1100)

export const timeWord = (date = new Date()): string => {
  const h = date.getHours()
  if (h < 5) return '半夜'
  if (h < 9) return '早上'
  if (h < 12) return '上午'
  if (h < 14) return '中午'
  if (h < 18) return '下午'
  if (h < 23) return '晚上'
  return '深夜'
}
