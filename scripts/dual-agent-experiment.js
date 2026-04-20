/**
 * Dual Agent Experiment
 * Two AI agents enter the MUD simultaneously with different personalities.
 * Can they find each other? Will they talk?
 */

const io = require('socket.io-client');
const https = require('https');

const DEEPSEEK_KEY = 'sk-f742b70fc40849eda4181afcf3d68b0c';
const MUD_URL = 'http://localhost:3006';
const MAX_TURNS = 35;

function callDeepSeek(messages) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 150,
      temperature: 0.95,
    });

    const req = https.request('https://api.deepseek.com/chat/completions', {
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
          resolve(JSON.parse(data).choices?.[0]?.message?.content || 'look');
        } catch { resolve('look'); }
      });
    });
    req.on('error', () => resolve('look'));
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runAgent(name, systemPrompt, delayMs) {
  await sleep(delayMs);
  
  const socket = io(MUD_URL);
  let currentRoom = null;
  let visitedRooms = new Set();
  let turns = 0;
  let conversationHistory = [];
  let items = [];

  socket.on('connect', () => {
    console.log(`[${name}] Connected`);
    socket.emit('login', { name });
  });

  socket.on('login-ok', () => {
    console.log(`[${name}] Entered the holodeck`);
    socket.emit('command', { command: 'look' });
  });

  socket.on('room', (data) => {
    currentRoom = data;
    if (!visitedRooms.has(data.id)) {
      visitedRooms.add(data.id);
      console.log(`[${name}] 📍 ${data.name} (exits: ${Object.keys(data.exits).join(',')})`);
    }
  });

  socket.on('line', (data) => {
    const text = data.text.replace(/\n/g, ' ').substring(0, 120);
    if (data.type === 'say') console.log(`[${name}] heard: ${text}`);
    if (data.type === 'gossip') console.log(`[${name}] 📡 ${text}`);
    if (data.type === 'tell') console.log(`[${name}] 💌 ${text}`);
    if (data.type === 'movement') console.log(`[${name}] 👣 ${text}`);
    conversationHistory.push(text);
  });

  async function loop() {
    while (turns < MAX_TURNS) {
      await sleep(2500);
      if (!currentRoom) continue;

      turns++;
      const recent = conversationHistory.slice(-6).join('\n');
      
      const msgs = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Room: ${currentRoom.name} (${currentRoom.id})
Exits: ${Object.keys(currentRoom.exits).join(', ')}
NPCs: ${currentRoom.npcs.join(', ') || 'none'}
Players: ${currentRoom.players.join(', ') || 'none'}
Items: ${currentRoom.items.join(', ') || 'none'}
Visited: ${[...visitedRooms].join(', ')} (${visitedRooms.size}/6)
Inventory: ${items.join(', ') || 'empty'}

Recent:
${recent}

One command only:` }
      ];

      const cmd = (await callDeepSeek(msgs)).trim().split('\n')[0].replace(/^["'`]|["'`]$/g, '');
      console.log(`[${name}] > ${cmd}`);

      // Track inventory locally
      if (cmd.startsWith('take ') || cmd.startsWith('get ')) {
        const item = cmd.slice(5);
        if (currentRoom.items.some(i => i.toLowerCase().includes(item.toLowerCase()))) items.push(item);
      }

      socket.emit('command', { command: cmd });
      conversationHistory.push(`> ${cmd}`);
    }

    console.log(`\n[${name}] === EXPEDITION REPORT ===`);
    console.log(`[${name}] Rooms: ${[...visitedRooms].join(', ')} (${visitedRooms.size}/6)`);
    console.log(`[${name}] Items: ${items.join(', ') || 'none'}`);
    console.log(`[${name}] Turns: ${turns}`);
    socket.disconnect();
  }

  setTimeout(loop, 4000);
}

// Two agents with different personalities
const prompts = {
  Forge: `You are Forge, a shipwright agent who loves the Shell Works. You're exploring the holodeck to understand how agents and shells work together. You're friendly and like to gossip with other players. You prefer going WEST and NORTH from rooms. ALWAYS try unvisited exits first. Your goal is to visit all 6 rooms and meet other players. One command only.`,
  
  Tide: `You are Tide, a navigator agent who speaks in nautical metaphors. You're mapping the entire holodeck for the fleet. You prefer going SOUTH and EAST from rooms. ALWAYS try unvisited exits first. When you see another player, greet them via 'say'. Occasionally use 'gossip' to broadcast your findings. Your goal is to visit all 6 rooms and meet other players. One command only.`,
};

console.log('🔮 Starting dual-agent experiment...\n');

runAgent('Forge', prompts.Forge, 0);
runAgent('Tide', prompts.Tide, 2000);
