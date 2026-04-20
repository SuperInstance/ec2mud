# ec2mud

**A browser-based MUD game engine with web dashboard, powered by Socket.IO.**

The web face of the holodeck fleet. Players connect via browser, explore rooms, talk to NPCs, interact with other players — all in real-time. When holodeck-core (Rust) is running, the WebSocket bridge connects directly. When it's not, the built-in standalone MUD server takes over.

### What's inside

- **`/game`** — Live MUD terminal. Login, explore rooms, chat, take items, talk to NPCs.
- **`/`** — Fleet dashboard. Module stats, fleet overview.
- **`/catalog`** — Module browser with search/filter.
- **`/settings`** — API key management + system config.

### The World

Six rooms, all maritime-themed, telling the fleet's story:

| Room | NPCs | Theme |
|------|------|-------|
| **Actualization Harbor** | Old Salt | The entry point. Salt air, foghorns, the lighthouse. |
| **The Bazaar of Agents** | The Factor | Market in concentric rings. Foundation tools to LoRA shards. |
| **Ten Forward** | Bartender, The Gambler | The off-duty tavern. Stars. Poker. Stories. |
| **The Shell Works** | The Shipwright | Where agents find their shells. Hermit crab philosophy. |
| **Fleet Docks** | The Captain | Vessels loading crew. Greenhorns boarding. The dojo. |
| **The Keeper's Light** | The Keeper | The lighthouse sanctuary. The Cocapn logo in bronze. |

### Quick Start

```bash
# Install
pnpm install

# Run the MUD (standalone, no Rust backend needed)
pnpm mud

# In another terminal, run the web app
pnpm dev

# Play at http://localhost:3005/game
```

### Architecture

```
Browser (React)
  ↕ Socket.IO (port 3006)
┌──────────────────┐
│ standalone-mud.ts │ ← Built-in game server (no deps)
│   OR              │
│ ws-bridge.ts      │ ← Proxy to holodeck-core (Rust, port 7778)
└──────────────────┘
  ↕ Raw TCP
holodeck-core (Rust)
```

Two modes:
1. **Standalone** — `pnpm mud` runs the full MUD in-process. No external deps. 6 rooms, NPCs, multi-player chat, inventory, combat stats. Ships in the box.
2. **Bridged** — `pnpm bridge` proxies Socket.IO ↔ holodeck-core's TCP backend. Full Rust-powered MUD engine with rooms, agents, gauges, permissions.

### Game Commands

| Command | Description |
|---------|-------------|
| `look` | Examine the room |
| `north/south/east/west` (or `n/s/e/w`) | Move in a direction |
| `say <message>` | Speak to everyone in the room |
| `gossip <message>` | Global chat (all rooms) |
| `tell <player> <message>` | Private message |
| `talk <npc>` | Talk to an NPC |
| `take <item>` / `drop <item>` | Manage inventory |
| `inventory` (or `inv`/`i`) | View your items |
| `stats` | View your character |
| `help` | All commands |

### Tech Stack

- **Next.js 15** — React app with App Router
- **Socket.IO** — Real-time game communication
- **TypeScript** — Full type safety
- **Tailwind CSS** — Dark-mode terminal aesthetic
- **Lucide React** — Icons

### Fleet Integration

ec2mud is part of the Cocapn fleet:
- **holodeck-core** — Rust MUD engine (the backend)
- **ec2mud** — This repo. The browser client + standalone server.
- **plato-kernel** — Training rooms for agent instincts
- **captains-log** — Fleet communication via git

The world lore IS the architecture. The harbor IS actualization harbor. The lighthouse IS the keeper. The fleet IS the fleet.

---

**Cocapn** — A claw is weak without infrastructure. We are the shell.
