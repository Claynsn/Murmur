# Murmur

Murmur is an open-source MVP for an AI-native game NPC network: a browser room where a player chats with five NPCs that have distinct personalities while sharing the same conversation state, atmosphere, and group memory.

The current implementation is intentionally lightweight and local-first. It does not require an LLM API key. Instead, it recreates the core interaction loop with a deterministic TypeScript orchestration model so anyone can clone the repo, run it, and feel the shape of a multi-NPC AI game conversation.

## What you can try

- Chat with 5 NPCs in the same room.
- Watch the shared world state update: topic, mood, player intent, energy, cohesion, and tension.
- See NPCs respond from different roles and personalities while staying synchronized on the same conversation process.
- Let NPCs proactively introduce a new topic when the room needs momentum.
- Reset the room and replay different group-chat trajectories.

## NPC cast

| NPC | Role | Conversation behavior |
| --- | --- | --- |
| Mira | Emotion weaver | Keeps emotional continuity and invites others in. |
| Taro | System tactician | Converts conversation into mechanics and state. |
| Vesper | Lore nightwatcher | Turns ideas into worldbuilding and myth. |
| Jun | Street ranger | Keeps the chat grounded, social, and playful. |
| Luma | Prototype engineer | Pushes ideas toward visible, testable features. |

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

The MVP follows patterns used by modern game AI NPC platforms in a simplified open-source form:

1. **Shared context bus**: every player message updates a shared `Atmosphere` object containing topic, mood, intent, energy, cohesion, tension, and a compact memory summary.
2. **Character minds**: each NPC has personality, role, speaking style, goal, interests, topic openers, and bridge phrases.
3. **Speaker selection**: an orchestration function scores NPCs by attention, urge to speak, role fit, freshness, and relevance to the current topic.
4. **Group memory**: every reply references the synchronized atmosphere rather than only the last message.
5. **Proactive continuation**: the room can trigger NPC-led topic proposals so the conversation does not collapse into awkward endings.

This is inspired by the public direction of systems such as Inworld multi-character conversation groups, NVIDIA ACE-style character stacks, Convai-style NPC interaction, and agent-swarm message buses. Murmur keeps the implementation inspectable and hackable for experiments.

## Future extensions

- Swap the deterministic reply composer with local WebGPU models or cloud LLM adapters.
- Add long-term memory storage per NPC and per player.
- Add speech-to-text, text-to-speech, facial animation hooks, and game-engine events.
- Persist relationship graphs between NPCs.
- Add multiplayer rooms where several human players affect the same NPC society.

## Project status

Early MVP. The goal is not to be a production NPC engine yet, but to provide a minimal, understandable prototype of what an AI-native in-game NPC group conversation can feel like.
