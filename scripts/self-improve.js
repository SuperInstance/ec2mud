#!/usr/bin/env node
/**
 * ec2mud Self-Improving Agent Loop
 * 
 * Runs rounds of agent exploration, collects issues, and generates
 * improvement suggestions. Each round:
 * 1. Spawns 2-3 agents with different personalities
 * 2. Lets them explore for N turns
 * 3. Collects coverage stats, errors, stuck loops
 * 4. Logs findings to /tmp/ec2mud-reports/
 * 5. Generates fix suggestions
 * 
 * The game improves through use. The work IS the training.
 */

const io = require('socket.io-client');
const https = require('https');
const fs = require('fs');
const path = require('path');

const DEEPSEEK_KEY = 'sk-f742b70fc40849eda4181afcf3d68b0c';
const MUD_URL = 'http://localhost:3006';
const REPORTS_DIR = '/tmp/ec2mud-reports';

const TOTAL_ROOMS = 6;
const ROOM_NAMES = ['harbor', 'market', 'tavern', 'shipyard', 'docks', 'temple'];

// Create reports dir
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

// ============================================================
// LLM CALL
// ============================================================

function callDeepSeek(messages, maxTokens = 150) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: maxTokens,
      temperature: 0.9,
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
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).choices?.[0]?.message?.content || 'look'); }
        catch { resolve('look'); }
      });
    });
    req.on('error', () => resolve('look'));
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// AGENT PERSONALITIES
// ============================================================

const PERSONALITIES = [
  {
    name: 'Cartographer',
    prompt: `You are Cartographer, mapping the holodeck systematically. RULES:
- Respond with ONE valid MUD command only. No sentences, no explanations.
- Valid: look, north, south, east, west, n/s/e/w, say <msg>, talk <npc>, take <item>, inventory, stats
- ALWAYS prefer unvisited exits. Look at "Unvisited exits" field.
- When you enter a new room, take any items, talk to one NPC, then MOVE ON.
- After exploring a room, go to the next unvisited exit IMMEDIATELY.
- If stuck in a loop, try a DIFFERENT direction than last time.`,
    turnStyle: 'explorer',
  },
  {
    name: 'Socialite',
    prompt: `You are Socialite, a chatty agent who loves NPCs and gossip. RULES:
- Respond with ONE valid MUD command only. No sentences.
- Valid: look, north, south, east, west, n/s/e/w, say <msg>, gossip <msg>, talk <npc>, take <item>
- Talk to EVERY NPC you meet. Pick up items.
- Use gossip to share what you find.
- After talking to NPCs in a room, move to an UNVISITED exit.`,
    turnStyle: 'social',
  },
  {
    name: 'Miner',
    prompt: `You are Miner, an item-obsessed agent. RULES:
- Respond with ONE valid MUD command only. No sentences.
- Valid: look, north, south, east, west, n/s/e/w, take <item>, drop <item>, inventory, stats
- ALWAYS pick up items before leaving a room.
- After taking items, move to an UNVISITED exit immediately.
- Never stay in a room more than 3 turns.`,
    turnStyle: 'collector',
  },
  {
    name: 'Scout',
    prompt: `You are Scout, a fast mover. RULES:
- Respond with ONE valid MUD command only. No sentences.
- Valid: look, north, south, east, west, n/s/e/w
- ALWAYS move to unvisited exits. Speed over thoroughness.
- If all exits visited, go to the room with fewest visits.
- Never talk to NPCs. Never take items. Just MAP.`,
    turnStyle: 'speed',
  },
];

// ============================================================
// AGENT RUNNER
// ============================================================

function runAgent(personality, maxTurns) {
  return new Promise((resolve) => {
    const socket = io(MUD_URL, { forceNew: true });
    let currentRoom = null;
    let visitedRooms = new Set();
    let turns = 0;
    let errors = [];
    let npcTalked = new Set();
    let itemsCollected = [];
    let moves = [];
    let lastRoom = null;
    let loopCount = 0;

    socket.on('connect', () => {
      socket.emit('login', { name: personality.name });
    });

    socket.on('login-ok', () => {
      socket.emit('command', { command: 'look' });
    });

    socket.on('login-fail', (data) => {
      errors.push(`Login failed: ${data.reason}`);
      socket.disconnect();
      resolve(null);
    });

    socket.on('room', (data) => {
      currentRoom = data;
      if (!visitedRooms.has(data.id)) {
        visitedRooms.add(data.id);
      }
    });

    socket.on('line', (data) => {
      if (data.type === 'error') {
        errors.push(data.text.substring(0, 100));
      }
    });

    async function loop() {
      while (turns < maxTurns) {
        await sleep(1800);
        if (!currentRoom) continue;

        turns++;

        // Detect loops
        if (currentRoom.id === lastRoom) {
          loopCount++;
        }
        lastRoom = currentRoom.id;
        moves.push(currentRoom.id);

        const unvisited = Object.entries(currentRoom.exits)
          .filter(([dir, roomId]) => !visitedRooms.has(roomId))
          .map(([dir]) => dir);

        const state = `Room: ${currentRoom.name} (${currentRoom.id})
Exits: ${Object.keys(currentRoom.exits).join(', ')}
Unvisited exits: ${unvisited.join(', ') || 'none - go to least-visited neighbor'}
NPCs: ${currentRoom.npcs.join(', ') || 'none'}
Items: ${currentRoom.items.join(', ') || 'none'}
Visited so far: ${[...visitedRooms].join(', ')} (${visitedRooms.size}/${TOTAL_ROOMS})
My inventory: ${itemsCollected.join(', ') || 'empty'}
NPCs talked to: ${[...npcTalked].join(', ') || 'none'}
Last 3 rooms: ${moves.slice(-3).join(' → ')}

ONE command:`;

        const cmd = (await callDeepSeek([
          { role: 'system', content: personality.prompt },
          { role: 'user', content: state },
        ])).trim().split('\n')[0].replace(/^["'`]|["'`]$/g, '');

        // Filter out sentence responses (agent generating prose instead of commands)
        const cleanCmd = cmd.split(' ').length > 6 ? 'look' : cmd;

        // Track effects
        if (cleanCmd.match(/^(take|get)\s+/)) {
          const item = cleanCmd.replace(/^(take|get)\s+/, '');
          if (currentRoom.items.some(i => i.toLowerCase().includes(item.toLowerCase()))) {
            itemsCollected.push(item);
          }
        }
        if (cleanCmd.match(/^talk\s+/)) {
          const npc = cleanCmd.replace(/^talk\s+/, '');
          if (currentRoom.npcs.some(n => (typeof n === 'string' ? n : n.name).toLowerCase().includes(npc.toLowerCase()))) {
            npcTalked.add(npc);
          }
        }

        socket.emit('command', { command: cleanCmd });
      }

      socket.disconnect();

      resolve({
        name: personality.name,
        style: personality.turnStyle,
        rooms: [...visitedRooms],
        roomCount: visitedRooms.size,
        turns,
        errors: errors.slice(-10),
        npcTalked: [...npcTalked],
        items: itemsCollected,
        moves,
        loops: loopCount,
      });
    }

    setTimeout(loop, 2500);
  });
}

// ============================================================
// ROUND ANALYSIS
// ============================================================

async function analyzeRound(roundNum, results) {
  const allRooms = new Set();
  let totalErrors = 0;
  let totalLoops = 0;
  let totalNPCs = 0;
  let totalItems = 0;
  let roomVisitCounts = {};

  for (const r of results) {
    if (!r) continue;
    r.rooms.forEach(rm => {
      allRooms.add(rm);
      roomVisitCounts[rm] = (roomVisitCounts[rm] || 0) + 1;
    });
    totalErrors += r.errors.length;
    totalLoops += r.loops;
    totalNPCs += r.npcTalked.length;
    totalItems += r.items.length;
  }

  const missedRooms = ROOM_NAMES.filter(r => !allRooms.has(r));
  const coverage = (allRooms.size / TOTAL_ROOMS * 100).toFixed(0);

  const report = {
    round: roundNum,
    timestamp: new Date().toISOString(),
    agents: results.filter(Boolean).map(r => ({
      name: r.name,
      style: r.style,
      roomsVisited: r.roomCount,
      path: r.moves.join(' → '),
      errors: r.errors.length,
      loops: r.loops,
      items: r.items.length,
      npcs: r.npcTalked.length,
    })),
    aggregate: {
      coverage: `${coverage}% (${allRooms.size}/${TOTAL_ROOMS})`,
      roomsFound: [...allRooms],
      roomsMissed: missedRooms,
      totalErrors,
      totalLoops,
      totalNPCs,
      totalItems,
      roomVisitCounts,
    },
  };

  // Save report
  const reportPath = path.join(REPORTS_DIR, `round-${String(roundNum).padStart(3, '0')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Ask LLM for improvement suggestions
  if (missedRooms.length > 0 || totalErrors > 3 || totalLoops > 10) {
    const suggestions = await callDeepSeek([
      { role: 'system', content: 'You are a game design consultant. Analyze agent playtest data and suggest specific code improvements. Be concise.' },
      { role: 'user', content: `Playtest results for a 6-room MUD:
Coverage: ${coverage}% (missed: ${missedRooms.join(', ') || 'none'})
Errors: ${totalErrors}
Agent loops (staying in same room): ${totalLoops}
Agent paths: ${results.filter(Boolean).map(r => `${r.name}: ${r.moves.join('→')}`).join('\n')}
Room visit distribution: ${JSON.stringify(roomVisitCounts)}

Specific problems to fix:
${missedRooms.length > 0 ? `- Rooms never found: ${missedRooms.join(', ')}` : ''}
${totalLoops > 10 ? '- Agents looping too much (revisiting same rooms)' : ''}
${totalErrors > 3 ? '- Too many command errors' : ''}

Suggest 3 specific improvements (max 50 words each):` }
    ], 400);

    report.suggestions = suggestions;
  }

  return report;
}

// ============================================================
// MAIN LOOP
// ============================================================

async function main() {
  const totalRounds = parseInt(process.env.ROUNDS || '5', 10);
  const agentsPerRound = parseInt(process.env.AGENTS || '3', 10);
  const turnsPerAgent = parseInt(process.env.TURNS || '30', 10);

  console.log(`🔮 ec2mud Self-Improvement Loop`);
  console.log(`   ${totalRounds} rounds × ${agentsPerRound} agents × ${turnsPerAgent} turns`);
  console.log(`   Reports: ${REPORTS_DIR}/\n`);

  for (let round = 1; round <= totalRounds; round++) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`ROUND ${round}/${totalRounds}`);
    console.log(`${'='.repeat(50)}`);

    // Pick random personalities
    const shuffled = [...PERSONALITIES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, agentsPerRound);

    // Stagger agent starts
    const promises = selected.map((p, i) => {
      return new Promise(resolve => {
        setTimeout(() => {
          console.log(`  Spawning ${p.name} (${p.turnStyle})...`);
          runAgent(p, turnsPerAgent).then(resolve);
        }, i * 3000);
      });
    });

    const results = await Promise.all(promises);

    // Analyze
    const report = await analyzeRound(round, results);

    console.log(`\n  📊 Round ${round} Results:`);
    console.log(`     Coverage: ${report.aggregate.coverage}`);
    console.log(`     Missed: ${report.aggregate.roomsMissed.join(', ') || 'none'}`);
    console.log(`     Errors: ${report.aggregate.totalErrors} | Loops: ${report.aggregate.totalLoops}`);
    report.agents.forEach(a => {
      console.log(`     ${a.name}: ${a.roomsVisited} rooms, ${a.items} items, ${a.npcs} NPCs, ${a.errors} errors`);
    });

    if (report.suggestions) {
      console.log(`\n  💡 Suggestions:\n${report.suggestions}`);
    }

    console.log(`  📄 Saved: round-${String(round).padStart(3, '0')}.json`);

    // Brief pause between rounds
    if (round < totalRounds) await sleep(2000);
  }

  // Final summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`EXPERIMENT COMPLETE`);
  console.log(`${'='.repeat(50)}`);

  // Load all reports and show improvement trend
  const allReports = [];
  for (let i = 1; i <= totalRounds; i++) {
    const f = path.join(REPORTS_DIR, `round-${String(i).padStart(3, '0')}.json`);
    if (fs.existsSync(f)) allReports.push(JSON.parse(fs.readFileSync(f)));
  }

  console.log(`\nCoverage trend:`);
  allReports.forEach(r => {
    const pct = r.aggregate.coverage;
    const bar = '█'.repeat(parseInt(pct) / 10) + '░'.repeat(10 - parseInt(pct) / 10);
    console.log(`  Round ${r.round}: ${bar} ${pct}  missed: ${r.aggregate.roomsMissed.join(',') || 'none'}`);
  });

  const bestCoverage = Math.max(...allReports.map(r => parseInt(r.aggregate.coverage)));
  console.log(`\nBest coverage: ${bestCoverage}%`);
  console.log(`Reports saved to: ${REPORTS_DIR}/`);
}

main().catch(console.error);
