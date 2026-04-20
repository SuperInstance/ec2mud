'use client';

/**
 * Game Page - Live MUD Terminal
 *
 * Browser-based MUD client connected to holodeck-core via WebSocket.
 * Terminal-style interface with room description, exits, player list,
 * and command input. Real-time updates via Socket.IO.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, Users, Map, Compass, Scroll, Swords, Heart, Shield } from 'lucide-react';
import Link from 'next/link';

interface RoomData {
  id: string;
  name: string;
  description: string;
  exits: Record<string, string>;
  players: string[];
  items: string[];
  npcs: string[];
}

interface PlayerData {
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  room: string;
}

interface GameLine {
  id: number;
  text: string;
  type: 'system' | 'say' | 'tell' | 'combat' | 'movement' | 'look' | 'error' | 'gossip';
  timestamp: Date;
}

let lineCounter = 0;

export default function GamePage() {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<GameLine[]>([]);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLine = useCallback((text: string, type: GameLine['type'] = 'system') => {
    setLines(prev => [...prev, { id: ++lineCounter, text, type, timestamp: new Date() }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    const s = io({ transports: ['websocket', 'polling'] });

    s.on('connect', () => {
      setConnected(true);
      addLine('⚓ Connected to the holodeck.', 'system');
    });

    s.on('disconnect', () => {
      setConnected(false);
      addLine('🔌 Connection lost.', 'error');
    });

    s.on('room', (data: RoomData) => setRoom(data));
    s.on('player', (data: PlayerData) => setPlayer(data));

    s.on('line', (data: { text: string; type: string }) => {
      addLine(data.text, data.type as GameLine['type']);
    });

    s.on('login-ok', (data: { name: string }) => {
      setLoggedIn(true);
      setShowLogin(false);
      setPlayerName(data.name);
      addLine(`Welcome aboard, ${data.name}.`, 'system');
    });

    s.on('login-fail', (data: { reason: string }) => {
      addLine(`Login failed: ${data.reason}`, 'error');
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [addLine]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !socket) return;
    socket.emit('login', { name: playerName.trim() });
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    addLine(`> ${input.trim()}`, 'system');
    socket.emit('command', { command: input.trim() });
    setInput('');
  };

  // === LOGIN SCREEN ===
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔮</div>
            <h1 className="text-4xl font-bold text-white mb-2">Holodeck</h1>
            <p className="text-slate-400">Enter the MUD. The fleet is waiting.</p>
          </div>

          <form onSubmit={handleLogin} className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              What do they call you?
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Name..."
              autoFocus
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
            />
            <button
              type="submit"
              className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors"
            >
              Enter the Holodeck
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-4">
            Connected to holodeck-core via WebSocket bridge
          </p>
        </div>
      </div>
    );
  }

  // === GAME SCREEN ===
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-slate-800 rounded transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <span className="text-lg font-bold">🔮 Holodeck</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>
        {player && (
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-red-400" />
              {player.hp}/{player.maxHp}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-blue-400" />
              Lv.{player.level}
            </span>
            <span className="text-slate-400">{playerName}</span>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main terminal */}
        <main className="flex-1 flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
            {lines.map(line => (
              <div key={line.id} className={
                line.type === 'system' ? 'text-slate-400' :
                line.type === 'say' ? 'text-yellow-300' :
                line.type === 'tell' ? 'text-cyan-300' :
                line.type === 'combat' ? 'text-red-400' :
                line.type === 'movement' ? 'text-green-400' :
                line.type === 'look' ? 'text-white' :
                line.type === 'gossip' ? 'text-purple-300' :
                line.type === 'error' ? 'text-red-500 italic' :
                'text-slate-300'
              }>
                <span className="text-slate-600 text-xs mr-2">
                  {line.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {line.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleCommand} className="border-t border-slate-800 p-2 flex gap-2">
            <span className="text-indigo-400 font-mono pt-2">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent text-white font-mono focus:outline-none placeholder-slate-600"
              placeholder="look, north, say, help..."
              autoFocus
            />
          </form>
        </main>

        {/* Sidebar */}
        <aside className="w-72 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
          {room && (
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Map className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-white">{room.name}</h3>
              </div>
              <p className="text-sm text-slate-400 mb-3">{room.description}</p>

              {Object.keys(room.exits).length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <Compass className="w-3 h-3" /> Exits
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(room.exits).map(exit => (
                      <button
                        key={exit}
                        onClick={() => {
                          if (socket) {
                            socket.emit('command', { command: exit });
                            addLine(`> ${exit}`, 'system');
                          }
                        }}
                        className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-indigo-600 hover:text-white transition-colors"
                      >
                        {exit}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {room && room.players.length > 0 && (
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Users className="w-3 h-3" /> Players Here
              </div>
              {room.players.map(p => (
                <div key={p} className="flex items-center gap-2 py-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-sm text-slate-300">{p}</span>
                </div>
              ))}
            </div>
          )}

          {room && room.npcs.length > 0 && (
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Swords className="w-3 h-3" /> NPCs
              </div>
              {room.npcs.map(npc => (
                <div key={npc} className="flex items-center gap-2 py-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-sm text-slate-300">{npc}</span>
                </div>
              ))}
            </div>
          )}

          {room && room.items.length > 0 && (
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Scroll className="w-3 h-3" /> Items
              </div>
              {room.items.map(item => (
                <div key={item} className="text-sm text-indigo-300 py-0.5">{item}</div>
              ))}
            </div>
          )}

          <div className="p-4">
            <h4 className="text-xs text-slate-500 mb-2">Quick Commands</h4>
            <div className="space-y-1 text-xs text-slate-400 font-mono">
              <div><span className="text-indigo-400">look</span> — examine room</div>
              <div><span className="text-indigo-400">north/south/east/west</span> — move</div>
              <div><span className="text-indigo-400">say &lt;msg&gt;</span> — speak to room</div>
              <div><span className="text-indigo-400">gossip &lt;msg&gt;</span> — global chat</div>
              <div><span className="text-indigo-400">tell &lt;name&gt; &lt;msg&gt;</span> — whisper</div>
              <div><span className="text-indigo-400">take/drop &lt;item&gt;</span> — inventory</div>
              <div><span className="text-indigo-400">stats</span> — your character</div>
              <div><span className="text-indigo-400">help</span> — all commands</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
