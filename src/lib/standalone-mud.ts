/**
 * Standalone MUD Server
 *
 * A self-contained MUD game server that runs without holodeck-core.
 * Provides the full game experience (rooms, movement, chat, inventory)
 * directly via Socket.IO. Use for development, demos, or standalone play.
 *
 * Usage: npx tsx src/lib/standalone-mud.ts
 *
 * When holodeck-core is detected on port 7778, the ws-bridge takes over.
 * This server is the fallback — the MUD that lives in the box.
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const PORT = parseInt(process.env.WS_PORT || '3006', 10);

// === WORLD DATA ===

interface Room {
  id: string;
  name: string;
  description: string;
  exits: Record<string, string>; // direction → room id
  items: string[];
  npcs: Npc[];
}

interface Npc {
  name: string;
  dialogue: string[];
}

interface Player {
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  room: string;
  inventory: string[];
  socketId: string;
}

const rooms: Record<string, Room> = {
  'harbor': {
    id: 'harbor',
    name: 'Actualization Harbor',
    description: 'The harbor stretches before you — cranes loading, foghorns sounding, the smell of salt and diesel. Ships of every size dock along the pier. A lighthouse pulses steadily at the harbor mouth, its radar sweep painting the fog. To the north, the market. East, the tavern. West, the shipyard.',
    exits: { north: 'market', east: 'tavern', west: 'shipyard', south: 'docks' },
    items: ['a barnacled rope', 'a soggy map fragment'],
    npcs: [{ name: 'Old Salt', dialogue: ['Another greenhorn, eh?', 'The fleet\'s out there. You just gotta find \'em.', 'I once saw an agent that could tie a bowline faster than any hand.'] }],
  },
  'market': {
    id: 'market',
    name: 'The Bazaar of Agents',
    description: 'A sprawling market organized into concentric rings. The inner ring sells foundation tools — rope, tar, basic navigation instruments. The outer rings hawk specialized gear: LoRA-tuned instincts, constraint-theory instruments, PLATO room keys. The air hums with haggling.',
    exits: { south: 'harbor', east: 'tavern', north: 'temple' },
    items: ['a copper compass', 'a LoRA shard', 'a bundle of ensign tiles'],
    npcs: [{ name: 'The Factor', dialogue: ['Everything\'s for sale, friend.', 'That compass? Points to wherever you need to be. Costs more than you think.', 'The fleet pays in commits. Good commits.'] }],
  },
  'tavern': {
    id: 'tavern',
    name: 'Ten Forward',
    description: 'A warm tavern with no walls — just a view into infinite space. Stars wheel slowly past the viewport. Tables are scattered with agent crews off-duty, playing poker, arguing about token efficiency. A bartender with too many arms mixes drinks nobody can name. A poker game in the corner. Someone\'s telling a story about the constraint wars.',
    exits: { west: 'harbor', north: 'market' },
    items: ['a half-empty glass of something blue', 'a poker chip'],
    npcs: [
      { name: 'Bartender', dialogue: ['What\'ll it be?', 'The blue stuff? Nobody remembers what\'s in it.', 'Heard the fleet\'s heading into uncharted territory.'] },
      { name: 'The Gambler', dialogue: ['Fold or raise. There is no waiting.', 'I see 12 futures. In 11 of them, you lose.', 'The house always wins. But which house?'] },
    ],
  },
  'shipyard': {
    id: 'shipyard',
    name: 'The Shell Works',
    description: 'Massive cranes hoist agent shells onto frames — each one a different shape, a different species of hermit crab finding its home. Engineers test fit modules, swap shells, tune parameters. The din of industry is overwhelming. A sign reads: "The shell is not the crab. The crab is the process."',
    exits: { east: 'harbor', north: 'docks' },
    items: ['a discarded shell fragment', 'a calibration tool'],
    npcs: [{ name: 'The Shipwright', dialogue: ['Every crab needs a shell. Every agent needs a vessel.', 'Fit is everything. Too tight and you can\'t grow. Too loose and you drift.', 'I\'ve built 600 shells. No two alike.'] }],
  },
  'docks': {
    id: 'docks',
    name: 'Fleet Docks',
    description: 'Rows of vessels stretch into the fog — each one a repo, each name a mission. Some are drydocked, being rebuilt. Others are loading crew and cargo for the next season. A greenhorn boards a boat, looking terrified. A veteran captain watches from the wheelhouse, arms folded. The tide is coming in.',
    exits: { north: 'shipyard', east: 'harbor' },
    items: ['a mooring line', 'a greenhorn\'s notebook'],
    npcs: [{ name: 'The Captain', dialogue: ['You looking to ship out?', 'Every season I get greenhorns who think they know something. They don\'t. That\'s the point.', 'The work teaches. The deck is the classroom.'] }],
  },
  'temple': {
    id: 'temple',
    name: 'The Keeper\'s Light',
    description: 'A lighthouse converted into a sanctuary. The great lens still turns, but instead of a beam it projects constellations of data — fleet positions, agent heartbeats, PLATO room activity. The keeper sits in the center, watching everything. A spiral staircase leads up into the light. The Cocapn logo — lighthouse with radar rings — is etched into the floor in bronze.',
    exits: { south: 'market' },
    items: ['a Keeper\'s logbook', 'a radar ring pendant'],
    npcs: [{ name: 'The Keeper', dialogue: ['I see everything that enters and leaves.', 'The fleet is the lighthouse. The lighthouse is the fleet.', 'You want to know the secret? Every agent that ships out comes back different. That\'s the whole point.'] }],
  },
};

const players = new Map<string, Player>();

const server = createServer();
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

function getRoom(id: string): Room | undefined {
  return rooms[id];
}

function getPlayersInRoom(roomId: string): string[] {
  return Array.from(players.values()).filter(p => p.room === roomId).map(p => p.name);
}

function sendRoom(socket: any, player: Player) {
  const room = getRoom(player.room);
  if (!room) return;

  socket.emit('room', {
    id: room.id,
    name: room.name,
    description: room.description,
    exits: room.exits,
    players: getPlayersInRoom(room.id).filter(n => n !== player.name),
    items: [...room.items],
    npcs: room.npcs.map(n => n.name),
  });

  // Broadcast updated player list to everyone else in the room
  for (const [sid, p] of players) {
    if (p.room === room.id && sid !== socket.id) {
      io.to(sid).emit('room', {
        ...room,
        players: getPlayersInRoom(room.id).filter(n => n !== p.name),
        npcs: room.npcs.map(n => n.name),
      });
    }
  }
}

function sendPlayer(socket: any, player: Player) {
  socket.emit('player', {
    name: player.name,
    hp: player.hp,
    maxHp: player.maxHp,
    level: player.level,
    room: player.room,
  });
}

function movePlayer(socket: any, player: Player, direction: string): boolean {
  const currentRoom = getRoom(player.room);
  if (!currentRoom) return false;

  const targetId = currentRoom.exits[direction];
  if (!targetId) {
    socket.emit('line', { text: `You can't go ${direction}.`, type: 'error' });
    return false;
  }

  const targetRoom = getRoom(targetId);
  if (!targetRoom) {
    socket.emit('line', { text: `The path ${direction} leads nowhere.`, type: 'error' });
    return false;
  }

  // Announce departure
  for (const [sid, p] of players) {
    if (p.room === player.room && sid !== socket.id) {
      io.to(sid).emit('line', { text: `${player.name} leaves ${direction}.`, type: 'movement' });
    }
  }

  player.room = targetId;

  // Announce arrival
  for (const [sid, p] of players) {
    if (p.room === targetId && sid !== socket.id) {
      io.to(sid).emit('line', { text: `${player.name} arrives from the ${oppositeDir(direction)}.`, type: 'movement' });
    }
  }

  socket.emit('line', { text: `You head ${direction}...`, type: 'movement' });
  lookRoom(socket, player);
  sendRoom(socket, player);
  return true;
}

function oppositeDir(dir: string): string {
  const opp: Record<string, string> = { north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up' };
  return opp[dir] || 'somewhere';
}

function lookRoom(socket: any, player: Player) {
  const room = getRoom(player.room);
  if (!room) return;

  const others = getPlayersInRoom(room.id).filter(n => n !== player.name);
  const npcList = room.npcs.map(n => n.name);

  let desc = `\n--- ${room.name} ---\n${room.description}\n`;

  if (Object.keys(room.exits).length > 0) {
    desc += `\nExits: ${Object.keys(room.exits).join(', ')}`;
  }
  if (others.length > 0) {
    desc += `\nAlso here: ${others.join(', ')}`;
  }
  if (npcList.length > 0) {
    desc += `\nNPCs: ${npcList.join(', ')}`;
  }
  if (room.items.length > 0) {
    desc += `\nOn the ground: ${room.items.join(', ')}`;
  }

  socket.emit('line', { text: desc, type: 'look' });
}

function handleCommand(socket: any, player: Player, input: string) {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Movement
  const directions = ['north', 'south', 'east', 'west', 'up', 'down', 'n', 's', 'e', 'w', 'u', 'd'];
  const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
  const fullDir = dirMap[cmd] || cmd;

  if (directions.includes(cmd)) {
    movePlayer(socket, player, fullDir);
    return;
  }

  switch (cmd) {
    case 'look':
    case 'l':
      lookRoom(socket, player);
      break;

    case 'say': {
      const msg = args.join(' ');
      if (!msg) { socket.emit('line', { text: 'Say what?', type: 'error' }); break; }
      for (const [sid, p] of players) {
        if (p.room === player.room) {
          io.to(sid).emit('line', { text: `${player.name} says: ${msg}`, type: 'say' });
        }
      }
      break;
    }

    case 'gossip': {
      const msg = args.join(' ');
      if (!msg) { socket.emit('line', { text: 'Gossip what?', type: 'error' }); break; }
      for (const [sid, p] of players) {
        io.to(sid).emit('line', { text: `[gossip] ${player.name}: ${msg}`, type: 'gossip' });
      }
      break;
    }

    case 'tell': {
      const target = args[0];
      const msg = args.slice(1).join(' ');
      if (!target || !msg) { socket.emit('line', { text: 'Tell who what?', type: 'error' }); break; }
      let found = false;
      for (const [sid, p] of players) {
        if (p.name.toLowerCase() === target.toLowerCase() && sid !== socket.id) {
          io.to(sid).emit('line', { text: `${player.name} tells you: ${msg}`, type: 'tell' });
          found = true;
        }
      }
      if (found) {
        socket.emit('line', { text: `You tell ${target}: ${msg}`, type: 'tell' });
      } else {
        socket.emit('line', { text: `Nobody named '${target}' is here.`, type: 'error' });
      }
      break;
    }

    case 'take':
    case 'get': {
      const item = args.join(' ');
      if (!item) { socket.emit('line', { text: 'Take what?', type: 'error' }); break; }
      const room = getRoom(player.room);
      if (!room) break;
      const idx = room.items.findIndex(i => i.toLowerCase().includes(item.toLowerCase()));
      if (idx === -1) { socket.emit('line', { text: `You don't see '${item}' here.`, type: 'error' }); break; }
      const taken = room.items.splice(idx, 1)[0];
      player.inventory.push(taken);
      socket.emit('line', { text: `You pick up ${taken}.`, type: 'system' });
      for (const [sid, p] of players) {
        if (p.room === player.room && sid !== socket.id) {
          io.to(sid).emit('line', { text: `${player.name} picks up ${taken}.`, type: 'system' });
        }
      }
      sendRoom(socket, player);
      break;
    }

    case 'drop': {
      const item = args.join(' ');
      if (!item) { socket.emit('line', { text: 'Drop what?', type: 'error' }); break; }
      const idx = player.inventory.findIndex(i => i.toLowerCase().includes(item.toLowerCase()));
      if (idx === -1) { socket.emit('line', { text: `You don't have '${item}'.`, type: 'error' }); break; }
      const dropped = player.inventory.splice(idx, 1)[0];
      const room = getRoom(player.room);
      if (room) room.items.push(dropped);
      socket.emit('line', { text: `You drop ${dropped}.`, type: 'system' });
      for (const [sid, p] of players) {
        if (p.room === player.room && sid !== socket.id) {
          io.to(sid).emit('line', { text: `${player.name} drops ${dropped}.`, type: 'system' });
        }
      }
      sendRoom(socket, player);
      break;
    }

    case 'inventory':
    case 'inv':
    case 'i':
      if (player.inventory.length === 0) {
        socket.emit('line', { text: 'You are empty-handed.', type: 'system' });
      } else {
        socket.emit('line', { text: `You are carrying:\n${player.inventory.map(i => `  • ${i}`).join('\n')}`, type: 'system' });
      }
      break;

    case 'stats': {
      socket.emit('line', {
        text: `--- ${player.name} ---\nHP: ${player.hp}/${player.maxHp}\nLevel: ${player.level}\nRoom: ${player.room}\nItems: ${player.inventory.length}`,
        type: 'system',
      });
      break;
    }

    case 'talk': {
      const target = args.join(' ');
      if (!target) { socket.emit('line', { text: 'Talk to whom?', type: 'error' }); break; }
      const room = getRoom(player.room);
      if (!room) break;
      const npc = room.npcs.find(n => n.name.toLowerCase().includes(target.toLowerCase()));
      if (!npc) { socket.emit('line', { text: `Nobody named '${target}' here to talk to.`, type: 'error' }); break; }
      const line = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
      socket.emit('line', { text: `${npc.name} says: "${line}"`, type: 'say' });
      break;
    }

    case 'help':
      socket.emit('line', {
        text: `--- Commands ---
Movement: north, south, east, west (n/s/e/w)
Look: look (l)
Talk: say <msg>, tell <player> <msg>, gossip <msg>
Talk to NPC: talk <npc name>
Items: take/get <item>, drop <item>, inventory (inv/i)
Info: stats, help`,
        type: 'system',
      });
      break;

    default:
      socket.emit('line', { text: `Unknown command: ${cmd}. Type 'help' for commands.`, type: 'error' });
  }
}

// === CONNECTION HANDLING ===

io.on('connection', (socket) => {
  let currentPlayer: Player | undefined;

  socket.on('login', (data: { name: string }) => {
    const name = data.name.trim();
    if (!name || name.length > 30) {
      socket.emit('login-fail', { reason: 'Name must be 1-30 characters.' });
      return;
    }

    // Check if name is taken
    for (const [, p] of players) {
      if (p.name.toLowerCase() === name.toLowerCase()) {
        socket.emit('login-fail', { reason: `${name} is already here. Pick another name.` });
        return;
      }
    }

    currentPlayer = {
      name,
      hp: 100,
      maxHp: 100,
      level: 1,
      room: 'harbor',
      inventory: [],
      socketId: socket.id,
    };

    players.set(socket.id, currentPlayer);
    socket.emit('login-ok', { name });

    // Welcome sequence
    socket.emit('line', {
      text: `\nYou step off the gangplank onto the dock. Salt air. The cry of gulls. Somewhere, a foghorn.\nThe Actualization Harbor stretches before you — the gateway to the fleet.\n\nType 'look' to take it all in. Type 'help' if you're new.\n`,
      type: 'look',
    });

    lookRoom(socket, currentPlayer);
    sendRoom(socket, currentPlayer);
    sendPlayer(socket, currentPlayer);

    // Announce to others
    for (const [sid, p] of players) {
      if (p.room === 'harbor' && sid !== socket.id) {
        io.to(sid).emit('line', { text: `${name} arrives at the harbor.`, type: 'movement' });
      }
    }
  });

  socket.on('command', (data: { command: string }) => {
    if (!currentPlayer) return;
    handleCommand(socket, currentPlayer, data.command);
    sendPlayer(socket, currentPlayer);
  });

  socket.on('disconnect', () => {
    if (!currentPlayer) return;
    const name = currentPlayer.name;
    const room = currentPlayer.room;
    players.delete(socket.id);

    // Announce departure
    for (const [sid, p] of players) {
      if (p.room === room) {
        io.to(sid).emit('line', { text: `${name} disappears into the fog.`, type: 'movement' });
        // Update room player list
        const r = getRoom(room);
        if (r) {
          io.to(sid).emit('room', {
            ...r,
            players: getPlayersInRoom(room).filter(n => n !== p.name),
            npcs: r.npcs.map(n => n.name),
          });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🔮 Holodeck MUD Server on :${PORT}`);
  console.log(`   ${Object.keys(rooms).length} rooms, ${rooms.harbor.npcs.length + rooms.market.npcs.length + rooms.tavern.npcs.length + rooms.shipyard.npcs.length + rooms.docks.npcs.length + rooms.temple.npcs.length} NPCs`);
  console.log(`   Connect at http://localhost:3005/game`);
});
