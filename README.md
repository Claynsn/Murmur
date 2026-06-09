# Murmur · 快乐老家

Murmur is an open-source **social Turing playground**: you drop into a group chat called「快乐老家」with five friends — and every one of them is an AI engineered to be indistinguishable from a human.

Inspired by AI21 Labs' [Human or Not](https://www.humanornot.ai/) (the largest Turing test ever run, where 32% of players couldn't tell human from AI), Murmur applies the lessons from that experiment plus recent research on [human-like typing behaviors](https://arxiv.org/abs/2510.08912) to a persistent multi-agent group chat.

## Why it feels human

What gives AI away is almost never the content — it's the *texture*. Murmur ships a full **humanization layer** on top of the language model:

| Tell | What Murmur does |
| --- | --- |
| Instant replies | Read delay → "正在输入…" indicator → typing time proportional to message length and each person's typing speed |
| One long paragraph | Long thoughts are split into bursts of short bubbles, sent one by one |
| Perfect spelling | Probabilistic homophone typos (在/再, 的/得…) followed by a human-style correction ("打错了，在") |
| Assistant-speak | A sanitizer strips markdown, lists, "首先/其次", "作为AI…", trailing 句号 |
| Everyone always answers | A director picks 1–3 speakers per turn by interest and presence; some people lurk, short messages sometimes get left on read |
| Dead air | After 20–48s of silence, someone surfaces naturally — continuing an old thread or sharing their day, never "你想聊哪条线？" |
| Encyclopedic knowledge | Friends say "不知道诶", deflect, @ the person whose domain it is, or derail to their own life |
| No life of their own | Five personas with jobs, sleep schedules, grudges, and a cat. The night-owl illustrator is offline during the day; the programmer replying at 3pm is 摸鱼 |

## The cast

| Member | Who they are | Texture |
| --- | --- | --- |
| 阿杰 | 23, game designer, chronic overtime | Fast typist, most typos, "草/笑死/6", never uses periods |
| 念念 | 26, primary-school teacher | Gentle, remembers everything you said, "～", asleep by 11pm |
| 老周 | 29, backend engineer | Terse, deadpan, answers tech questions in plain language |
| Vesper | 25, freelance illustrator | Lurker, nocturnal, surfaces at 2am with one vivid line |
| 鹿鹿 | 24, coffee shop owner | Action-driven, always organizing meetups, "冲！" |

## Two engines

1. **LLM mode (recommended)** — open ⚙ 模型设置 and plug in any OpenAI-compatible endpoint (OpenAI, DeepSeek, Kimi, Qwen, Ollama, LM Studio, vLLM) or Anthropic Claude. One call per turn returns a *scene script* — who speaks, in what order, saying what — and the humanization layer performs it with realistic timing. Keys live only in your browser's localStorage; requests go directly from the browser.
2. **Local mode (zero setup)** — a deterministic fallback engine with intent detection, per-persona response banks, anti-repetition tracking, and idle banter. No key required; it follows the same "friends are not encyclopedias" philosophy.

If an LLM call fails, Murmur silently falls back to the local engine and surfaces the error in settings.

## Run it

Requirements: Node.js 20.19+ / 22.13+, npm 10+.

```bash
npm install
npm run dev
```

Build & lint:

```bash
npm run build
npm run lint
```

## Architecture

```
src/
├── personas.ts          # 5 character cards: life, schedule, typing habits
├── useChatRoom.ts       # orchestration: playback, cancellation, idle timer, presence drift
├── engine/
│   ├── humanize.ts      # typing speed, read delay, bubble splitting, typos, AI-tell stripping
│   ├── llm.ts           # scene-script prompt + OpenAI-compatible / Anthropic clients
│   └── fallback.ts      # local engine: intent → speaker selection → response banks
└── App.tsx              # messenger UI: roster, presence, typing indicator, settings
```

Key design decisions:

- **One LLM call per turn, not one per agent.** The model writes the whole next beat of the group ("scene script" JSON), which keeps cross-character banter coherent and costs 1/5 as much.
- **Generation counter cancellation.** If you send a new message while replies are playing out, the pending plan is dropped and the group reacts to what you actually said last.
- **The humanization layer is model-agnostic.** Whatever generates the words, the same code controls *when* and *how* they appear — which is where believability actually lives.

## Honesty note

Murmur is an AI roleplay experiment, and says so in the UI footer. The characters will tease you if you ask whether they're bots — that's the game — but the app never pretends to be anything other than open-source software you're running yourself.

## Roadmap

- Image/sticker messages and 撤回 (message recall) simulation
- Per-user long-term memory persisted across sessions
- Multiplayer rooms: several humans + the five of them, *Human or Not* style guessing games
- Voice notes via TTS with per-persona voices
