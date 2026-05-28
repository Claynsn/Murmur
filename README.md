# Murmur

Murmur is an open-source MVP for an AI-native game NPC network: a browser room where a player chats with five NPCs that have distinct personalities while sharing the same conversation state, atmosphere, and group memory.

The current implementation is intentionally lightweight and local-first. It does not require an LLM API key. Instead, it recreates a research-inspired agent loop with deterministic TypeScript so anyone can inspect, clone, run, and critique the shape of a multi-NPC AI game conversation.

## What you can try

- Chat with 5 NPCs in the same room.
- Ask feasibility questions such as `头号玩家电影里的绿洲游戏能实现吗` and get direct, role-specific answers instead of generic handoff lines.
- Watch the shared world state update: topic, mood, player intent, energy, cohesion, and tension.
- Inspect the agent trace: perception, retrieved memories, speaker-selection reason, and response plan.
- Let NPCs proactively introduce a new topic when the room needs momentum.
- Reset the room and replay different group-chat trajectories.

## NPC cast

| NPC | Role | Conversation behavior |
| --- | --- | --- |
| Mira | Empathic narrator | Tracks player feeling and long-term relational continuity without empty reassurance. |
| Taro | Systems architect | Answers feasibility and architecture questions directly. |
| Vesper | Worldbuilding nightwatcher | Adds immersive social/world framing without drowning the reply in poetry. |
| Jun | Player friend | Keeps the chat grounded, candid, and less corporate. |
| Luma | Prototype engineer | Converts ambitious ideas into playable demo steps. |

## Local setup

Requirements:

- Node.js 20.19+, 22.13+, or newer. The app can run on older Node 22 builds, but the Vite toolchain officially expects 22.13+.
- npm 10+

Install and run:

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

Build and lint:

```bash
npm run build
npm run lint
```

## Architecture

The MVP follows patterns from modern agent simulation research in a simplified open-source form:

1. **Perception**: every player message is classified for intent, topic, mood, repair signals, repetition, and special cases such as feasibility questions.
2. **Memory retrieval**: a small shared memory stream scores salience and keyword overlap, inspired by Generative Agents.
3. **Shared context bus**: the room updates a synchronized `Atmosphere` object containing topic, mood, intent, energy, cohesion, tension, and compact memory summary.
4. **Character minds**: each NPC has personality, stance, expertise, verbal habits, goals, and a silence policy.
5. **Selector group chat**: an orchestration function scores NPCs by urge, attention, expertise fit, role fit, freshness, and whether the NPC actually adds information.
6. **Response planning**: replies are composed from the current perception and recalled memory, with explicit safeguards against repeated stopgap closers such as “你想让我们沿着哪条线继续展开？”
7. **Proactive continuation**: the room can trigger NPC-led topic proposals that continue the current context instead of abruptly ending or changing subject.

Research/open-source references used for this revision:

- **Generative Agents**: memory stream, salience, relevance/recency retrieval, reflection, planning, action.
- **AI Town**: shared global state plus a simulation loop for agents living, chatting, and socializing.
- **Concordia**: generative social simulation with a Game Master-like environment mediator.
- **AutoGen SelectorGroupChat**: shared context broadcast with dynamic next-speaker selection.
- **CAMEL RolePlaying**: role boundaries and controls against repetition, role flipping, and degenerate loops.

Murmur still keeps the runtime inspectable and hackable: `simulateAgentTurn` is the seam where a local WebGPU model, Ollama, or cloud LLM can replace the deterministic response composer later.

## Future extensions

- Swap the deterministic reply composer with local WebGPU models or cloud LLM adapters.
- Add long-term memory storage per NPC and per player.
- Add speech-to-text, text-to-speech, facial animation hooks, and game-engine events.
- Persist relationship graphs between NPCs.
- Add multiplayer rooms where several human players affect the same NPC society.

## Project status

Early MVP. The goal is not to be a production NPC engine yet, but to provide a minimal, understandable prototype of what an AI-native in-game NPC group conversation can feel like.
