/**
 * WebSocket Bridge Server
 *
 * Bridges Socket.IO (browser) ↔ holodeck-core TCP (Rust backend on port 7778).
 * Runs alongside Next.js as a standalone process.
 *
 * Usage: node src/lib/ws-bridge.ts (via tsx or compiled)
 *
 * Protocol:
 *   Browser → Socket.IO → this bridge → raw TCP → holodeck-core
 *   holodeck-core → raw TCP → this bridge → Socket.IO → browser
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as net from 'net';

const HOLODECK_HOST = process.env.HOLODECK_HOST || '127.0.0.1';
const HOLODECK_PORT = parseInt(process.env.HOLODECK_PORT || '7778', 10);
const WS_PORT = parseInt(process.env.WS_PORT || '3006', 10);

/** Active TCP connections to holodeck-core, keyed by socket ID */
const connections = new Map<string, net.Socket>();

/** Line buffer per connection — holodeck sends newline-delimited JSON */
const buffers = new Map<string, string>();

const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

/**
 * Parse holodeck-core output lines into typed game events
 */
function parseHolodeckLine(raw: string): { event: string; data: any } | null {
  try {
    const msg = JSON.parse(raw);

    if (msg.type === 'room') return { event: 'room', data: msg.room };
    if (msg.type === 'player') return { event: 'player', data: msg.player };
    if (msg.type === 'line') return { event: 'line', data: { text: msg.text, type: msg.kind || 'system' } };
    if (msg.type === 'login_ok') return { event: 'login-ok', data: { name: msg.name } };
    if (msg.type === 'login_fail') return { event: 'login-fail', data: { reason: msg.reason } };

    // Unknown but valid JSON — forward as a line
    return { event: 'line', data: { text: raw, type: 'system' } };
  } catch {
    // Plain text from holodeck — treat as system message
    if (raw.trim()) {
      return { event: 'line', data: { text: raw, type: 'system' } };
    }
    return null;
  }
}

io.on('connection', (socket) => {
  console.log(`[bridge] Browser connected: ${socket.id}`);

  // Open a TCP connection to holodeck-core for this browser session
  const tcp = net.createConnection({ host: HOLODECK_HOST, port: HOLODECK_PORT }, () => {
    console.log(`[bridge] TCP connected to holodeck-core for ${socket.id}`);
  });

  connections.set(socket.id, tcp);
  buffers.set(socket.id, '');

  tcp.on('data', (chunk) => {
    const buf = buffers.get(socket.id) || '';
    const combined = buf + chunk.toString('utf-8');
    const lines = combined.split('\n');

    // Last element might be incomplete — keep it in the buffer
    buffers.set(socket.id, lines.pop() || '');

    for (const line of lines) {
      const parsed = parseHolodeckLine(line);
      if (parsed) {
        socket.emit(parsed.event, parsed.data);
      }
    }
  });

  tcp.on('close', () => {
    console.log(`[bridge] TCP closed for ${socket.id}`);
    socket.emit('line', { text: 'Connection to holodeck lost.', type: 'error' });
    connections.delete(socket.id);
    buffers.delete(socket.id);
  });

  tcp.on('error', (err) => {
    console.error(`[bridge] TCP error for ${socket.id}:`, err.message);
    socket.emit('line', { text: `Holodeck error: ${err.message}`, type: 'error' });
  });

  // Browser → holodeck
  socket.on('login', (data: { name: string }) => {
    tcp.write(`login ${data.name}\n`);
  });

  socket.on('command', (data: { command: string }) => {
    tcp.write(`${data.command}\n`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[bridge] Browser disconnected: ${socket.id} (${reason})`);
    tcp.destroy();
    connections.delete(socket.id);
    buffers.delete(socket.id);
  });
});

httpServer.listen(WS_PORT, () => {
  console.log(`[bridge] Socket.IO server on :${WS_PORT}`);
  console.log(`[bridge] Bridging to holodeck-core at ${HOLODECK_HOST}:${HOLODECK_PORT}`);
});

process.on('SIGINT', () => {
  console.log('[bridge] Shutting down...');
  for (const [id, tcp] of connections) {
    tcp.destroy();
  }
  io.close();
  httpServer.close();
  process.exit(0);
});
