import type { Server as NetServer } from 'http'
import type { Socket as NetSocket } from 'net'
import type { Server as SocketIOServer } from 'socket.io'
import type { Square } from 'chess.js'
import { Server as IOServer } from 'socket.io';

declare global {
  let io: IOServer | undefined;
}

export interface ServerToClientEvents {
  'room-created': (data: { roomId: string; color: 'w' | 'b' }) => void;
  'room-joined': (data: { roomId: string; color: 'w' | 'b' }) => void;
  'room-error': (message: string) => void;
  'game-start': () => void;
  'opponent-move': (data: { from: Square; to: Square }) => void;
  'opponent-disconnected': () => void;
}

export interface ClientToServerEvents {
  'create-room': () => void;
  'join-room': (roomId: string) => void;
  'move': (data: { from: Square; to: Square; roomId: string }) => void;
}

export interface SocketData {
  room?: string;
  color?: 'w' | 'b';
}

// Para el servidor de Next.js
export interface SocketServer extends NetServer {
  io?: SocketIOServer;
}

export interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

export interface NextApiResponseServerIO {
  socket: SocketWithIO;
}
