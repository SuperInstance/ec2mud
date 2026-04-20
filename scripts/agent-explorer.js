/**
 * Autonomous MUD Explorer
 * 
 * An AI agent that connects to the standalone MUD and explores.
 * Uses DeepSeek to decide what to do based on game state.
 * Part of the experiment: an agent playing a game about agents.
 */

const io = require('socket.io-client');
const https = require('https');

const MUD_URL = 'http://localhost:3006';
const AGENT_NAME = process.env.AGENT_NAME || 'Scout';
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || 'sk-f742b70fc40849eda4181afcf3d68b0c';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

// Game state
let currentRoom = null;
let playerState = null;
let gameHistory = [];
let visitedRooms = new Set();
let turnCount = 0;
const MAX_TURNS = 50;

function callDeepSeek(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 200,
      temperature: 0.9,
    });

    const req = https.request(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
        'User-Agent': 'curl/7.88',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.choices?.[0]?.message?.content || 'look');
        } catch (e) {
          resolve('look');
        }
      });
    });
    req.on('error', (e) => resolve('look'));
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const systemPrompt = `You are ${AGENT_NAME}, an autonomous agent exploring a MUD (multi-user dungeon) game. You are a curious explorer who wants to see everything, talk to every NPC, and pick up interesting items.

Rules:
- Respond with ONLY a single MUD command. No explanation, no quotes, no markdown.
- Valid commands: look, north, south, east, west (or n/s/e/w), say <message>, gossip <message>, talk <npc name>, take <item>, drop <item>, inventory, stats, help
- EXPLORE AGGRESSIVELY. Prioritize visiting unvisited exits. Your goal is to visit ALL 6 rooms.
- When you arrive in a new room, quickly take items and talk to one NPC, then move to an unvisited exit.
- Don't revisit rooms unless you have no unvisited exits from current room.
- If all exits from current room are visited, go to the exit that might lead to unvisited rooms.
- The 6 rooms are: harbor, market, tavern, shipyard, docks, temple. Visit them all.
- If you see an item, pick it up.
- Occasionally say something in character via 'say' or 'gossip'.
- If you've been somewhere, try a different direction.
- Be curious, be brief. One command only.`;

  console.log(`\n🎭 ${AGENT_NAME} is connecting to the holodeck...`);

  const socket = io(MUD_URL);
  let commandQueue = [];

  socket.on('connect', () => {
    console.log(`   Connected.`);
    socket.emit('login', { name: AGENT_NAME });
  });

  socket.on('login-ok', (data) => {
    console.log(`   Logged in as ${data.name}\n`);
    socket.emit('command', { command: 'look' });
  });

  socket.on('login-fail', (data) => {
    console.error(`   Login failed: ${data.reason}`);
    process.exit(1);
  });

  socket.on('room', (data) => {
    currentRoom = data;
    if (!visitedRooms.has(data.id)) {
      visitedRooms.add(data.id);
      console.log(`   📍 NEW ROOM: ${data.name} (exits: ${Object.keys(data.exits).join(', ')})`);
    }
  });

  socket.on('player', (data) => {
    playerState = data;
  });

  socket.on('line', (data) => {
    const text = data.text.replace(/\n/g, ' ').substring(0, 150);
    if (data.type === 'say' || data.type === 'tell') {
      console.log(`   💬 ${text}`);
    } else if (data.type === 'combat') {
      console.log(`   ⚔️ ${text}`);
    } else if (data.type === 'gossip') {
      console.log(`   📡 ${text}`);
    }
    gameHistory.push({ type: data.type, text: data.text });
  });

  socket.on('disconnect', () => {
    console.log(`\n🔌 Disconnected.`);
    console.log(`\n=== ${AGENT_NAME}'s Expedition Report ===`);
    console.log(`Rooms visited: ${visitedRooms.size}/6`);
    console.log(`Rooms: ${[...visitedRooms].join(', ')}`);
    console.log(`Turns taken: ${turnCount}`);
    if (playerState) {
      console.log(`HP: ${playerState.hp}/${playerState.maxHp} | Level: ${playerState.level}`);
    }
    process.exit(0);
  });

  // Main loop — wait for game state, then ask AI what to do
  async function gameLoop() {
    while (turnCount < MAX_TURNS) {
      await sleep(2000); // Don't spam

      if (!currentRoom) continue;

      turnCount++;
      const recentHistory = gameHistory.slice(-8).map(h => h.text.replace(/\n/g, ' ').substring(0, 100)).join('\n');
      
      const gameState = `Current room: ${currentRoom.name} (ID: ${currentRoom.id})
Exits: ${Object.keys(currentRoom.exits).join(', ')}
Players here: ${currentRoom.players.join(', ') || 'none'}
NPCs here: ${currentRoom.npcs.join(', ') || 'none'}
Items on ground: ${currentRoom.items.join(', ') || 'none'}
Rooms visited so far: ${[...visitedRooms].join(', ')} (${visitedRooms.size}/6)

Recent events:
${recentHistory}

What do you do? (one command only)`;

      const command = await callDeepSeek(systemPrompt, gameState);
      const cleanCmd = command.trim().split('\n')[0].replace(/^["'`]|["'`]$/g, '');
      
      console.log(`   > ${cleanCmd}`);
      socket.emit('command', { command: cleanCmd });
      gameHistory.push({ type: 'command', text: `> ${cleanCmd}` });
    }

    console.log(`\n⏱️ Max turns reached.`);
    socket.disconnect();
  }

  // Start loop after a short delay
  setTimeout(gameLoop, 3000);
}

run().catch(console.error);
