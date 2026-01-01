# ec2mud

A real-time Multi-User Dungeon (MUD) game server with web interface, deployable to AWS EC2.

## Overview

ec2mud is a modern web-based MUD game server built with Next.js and Socket.IO. Players can connect via browser, explore rooms, interact with objects, and engage with other players in real-time.

### Key Features

- **Real-time Gameplay** - WebSocket-powered live interactions
- **Web Interface** - Beautiful terminal-style UI in the browser
- **Room System** - Dynamic world with connected rooms
- **Player Persistence** - Character data saved across sessions
- **Chat System** - Global, local, and private messaging
- **Combat System** - Turn-based combat with NPCs and other players
- **Inventory** - Items, equipment, and loot mechanics
- **AWS Ready** - Optimized for EC2 deployment

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+ (recommended) or npm/yarn

### Local Installation

```bash
# Clone the repository
git clone https://github.com/SuperInstance/ec2mud.git
cd ec2mud

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Visit http://localhost:3005

### AWS EC2 Deployment

```bash
# On EC2 instance (Ubuntu)
sudo apt update
sudo apt install -y nodejs npm git

# Clone repo
git clone https://github.com/SuperInstance/ec2mud.git
cd ec2mud

# Install pnpm
npm install -g pnpm

# Install dependencies
pnpm install

# Build for production
pnpm build

# Start with PM2 (recommended)
pnpm add -D pm2
npx pm2 start npm --name "ec2mud" -- start

# Configure EC2 security group to allow:
# - Port 3005 (HTTP)
# - Port 3006 (WebSocket)
```

## Game Commands

| Command | Description |
|---------|-------------|
| `look` | Look around the current room |
| `north`, `south`, `east`, `west` | Move in a direction |
| `say <message>` | Say something to the room |
| `whisper <player> <msg>` | Whisper to a player |
| `inventory` or `inv` | View your inventory |
| `take <item>` | Pick up an item |
| `drop <item>` | Drop an item |
| `attack <target>` | Attack a player or NPC |
| `stats` | View your character stats |
| `help` | View all commands |

## Project Structure

```
ec2mud/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── socket/          # WebSocket server
│   │   ├── game/                # Game interface
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── terminal.tsx         # Terminal UI component
│   │   └── player-list.tsx      # Online players display
│   ├── game/
│   │   ├── world.ts             # World and room definitions
│   │   ├── player.ts            # Player class
│   │   ├── combat.ts            # Combat system
│   │   └── commands.ts          # Command parser
│   └── lib/
│       └── socket.ts            # Socket.IO setup
├── public/
├── package.json
├── README.md
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## World Building

Add custom rooms by editing `src/game/world.ts`:

```typescript
export const rooms: Record<string, Room> = {
  'town-square': {
    id: 'town-square',
    name: 'Town Square',
    description: 'A bustling town square with a fountain in the center.',
    exits: { north: 'market', south: 'gate', east: 'tavern', west: 'temple' },
    players: [],
    npcs: [],
    items: []
  },
  // Add more rooms...
};
```

## Development

```bash
# Run dev server
pnpm dev

# Type check
pnpm type-check

# Lint
pnpm lint

# Build for production
pnpm build
```

## Technologies

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **Socket.IO** - Real-time bidirectional communication
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **Lucide React** - Icon library

## License

MIT

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md)

## Support

- GitHub Issues: https://github.com/SuperInstance/ec2mud/issues
- Discord: [Join our community](https://discord.gg/superinstance)

---

**SuperInstance** - Modular toolkit ecosystem for intelligent applications.
