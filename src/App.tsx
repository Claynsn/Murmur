import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import './App.css'
import { GROUP_NAME, personaById, personas } from './personas'
import { useChatRoom } from './useChatRoom'
import type { ChatMessage, LlmSettings } from './types'

const timeLabel = (at: number) =>
  new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

const SHOW_TIME_GAP = 5 * 60_000

function App() {
  const { messages, typing, presence, settings, setSettings, lastError, send } = useChatRoom()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim()) return
    void send(input)
    setInput('')
  }

  const onlineCount = personas.filter((p) => presence[p.id] === 'online').length + 1

  return (
    <div className="shell">
      <aside className="roster">
        <div className="roster-head">
          <h1>{GROUP_NAME}</h1>
          <p>{personas.length + 1} 位成员 · {onlineCount} 人在线</p>
        </div>
        <ul className="member-list">
          <li>
            <span className="avatar me-avatar">我</span>
            <div>
              <strong>我</strong>
              <small>就是你</small>
            </div>
            <i className="dot online" />
          </li>
          {personas.map((p) => (
            <li key={p.id}>
              <span className="avatar" style={{ '--c': p.color } as CSSProperties}>
                {p.avatarText}
              </span>
              <div>
                <strong>{p.name}</strong>
                <small>{p.bio}</small>
              </div>
              <i className={`dot ${presence[p.id]}`} title={presence[p.id] === 'online' ? '在线' : '离开'} />
            </li>
          ))}
        </ul>
        <div className="roster-foot">
          <button type="button" onClick={() => setShowSettings(true)}>
            ⚙ 模型设置
          </button>
          <span className={`mode-tag ${settings.enabled ? 'llm' : ''}`}>
            {settings.enabled ? 'LLM 模式' : '本地模式'}
          </span>
          <p className="disclaimer">Murmur · AI 角色扮演聊天室实验</p>
        </div>
      </aside>

      <main className="chat">
        <header className="chat-head">
          <h2>{GROUP_NAME}</h2>
          <span>{onlineCount} 人在线</span>
        </header>

        <div className="log" ref={logRef}>
          {messages.map((message, index) => (
            <MessageRow
              key={message.id}
              message={message}
              prev={messages[index - 1]}
            />
          ))}
          {typing.length > 0 && (
            <div className="typing-row">
              {typing.map((id) => (
                <span key={id}>
                  <i style={{ '--c': personaById[id].color } as CSSProperties} />
                  {personaById[id].name} 正在输入…
                </span>
              ))}
            </div>
          )}
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <input
            aria-label="发消息"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="说点什么…"
            maxLength={500}
          />
          <button type="submit" disabled={!input.trim()}>
            发送
          </button>
        </form>
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          lastError={lastError}
          onSave={(next) => {
            setSettings(next)
            setShowSettings(false)
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

function MessageRow({ message, prev }: { message: ChatMessage; prev?: ChatMessage }) {
  const showTime = !prev || message.at - prev.at > SHOW_TIME_GAP

  if (message.speakerId === 'system') {
    return (
      <>
        {showTime && <div className="time-divider">{timeLabel(message.at)}</div>}
        <div className="system-row">{message.text}</div>
      </>
    )
  }

  const mine = message.speakerId === 'me'
  const persona = mine ? null : personaById[message.speakerId]
  const sameSpeaker = prev && prev.speakerId === message.speakerId && !showTime

  return (
    <>
      {showTime && <div className="time-divider">{timeLabel(message.at)}</div>}
      <div className={`row ${mine ? 'mine' : ''} ${sameSpeaker ? 'cont' : ''}`}>
        {!mine && (
          <span
            className={`avatar ${sameSpeaker ? 'ghost' : ''}`}
            style={{ '--c': persona?.color } as CSSProperties}
          >
            {sameSpeaker ? '' : persona?.avatarText}
          </span>
        )}
        <div className="bubble-wrap">
          {!mine && !sameSpeaker && <span className="sender">{persona?.name}</span>}
          <div className="bubble">{message.text}</div>
        </div>
      </div>
    </>
  )
}

function SettingsModal({
  settings,
  lastError,
  onSave,
  onClose,
}: {
  settings: LlmSettings
  lastError: string
  onSave: (next: LlmSettings) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<LlmSettings>(settings)
  const set = <K extends keyof LlmSettings>(key: K, value: LlmSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h3>模型设置</h3>
        <p className="modal-hint">
          接入大模型后，群友的回复由 LLM 实时生成（推荐）；不填则使用内置的本地引擎，无需任何
          key 也能玩。API key 只保存在你的浏览器里，请求直接从浏览器发出。
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => set('enabled', event.target.checked)}
          />
          使用大模型生成回复
        </label>
        <label>
          接口类型
          <select
            value={draft.provider}
            onChange={(event) => set('provider', event.target.value as LlmSettings['provider'])}
          >
            <option value="openai">OpenAI 兼容（OpenAI / DeepSeek / Kimi / Qwen / Ollama…）</option>
            <option value="anthropic">Anthropic Claude</option>
          </select>
        </label>
        <label>
          Base URL（可留空用官方默认；本地 Ollama 填 http://localhost:11434/v1）
          <input
            value={draft.baseUrl}
            onChange={(event) => set('baseUrl', event.target.value)}
            placeholder={draft.provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'}
          />
        </label>
        <label>
          API Key（Ollama 等本地服务可留空）
          <input
            type="password"
            value={draft.apiKey}
            onChange={(event) => set('apiKey', event.target.value)}
            placeholder="sk-…"
          />
        </label>
        <label>
          模型名
          <input
            value={draft.model}
            onChange={(event) => set('model', event.target.value)}
            placeholder={draft.provider === 'anthropic' ? 'claude-haiku-4-5-20251001' : 'gpt-4o-mini / deepseek-chat / qwen3…'}
          />
        </label>
        {lastError && <p className="modal-error">上次调用失败（已自动回退本地引擎）：{lastError}</p>}
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" onClick={() => onSave(draft)}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
