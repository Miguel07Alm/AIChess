import { Server as NetServer } from 'http'
import { NextRequest } from 'next/server'
import { Server as ServerIO } from 'socket.io'
import { WebSocketServer } from 'ws'

export const runtime = 'nodejs'

const rooms = new Map()

function initSocket(ws: WebSocketServer) {
  const io = new ServerIO(ws, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*'
    }
  })

  io.on('connection', (socket) => {
    socket.on('create-room', () => {
      const roomId = Math.random().toString(36).substring(2, 8)
      rooms.set(roomId, { white: socket.id })
      socket.join(roomId)
      socket.emit('room-created', { roomId, color: 'w' })
    })

    socket.on('join-room', (roomId: string) => {
      if (rooms.has(roomId) && !rooms.get(roomId).black) {
        rooms.get(roomId).black = socket.id
        socket.join(roomId)
        socket.emit('room-joined', { roomId, color: 'b' })
        io.to(roomId).emit('game-start')
      } else {
        socket.emit('room-error', 'Room full or not found')
      }
    })

    socket.on('move', ({ from, to, roomId }) => {
      socket.to(roomId).emit('opponent-move', { from, to })
    })

    socket.on('disconnect', () => {
      rooms.forEach((room, roomId) => {
        if (room.white === socket.id || room.black === socket.id) {
          io.to(roomId).emit('opponent-disconnected')
          rooms.delete(roomId)
        }
      })
    })
  })

  return io
}

let ws: WebSocketServer

export async function GET(_req: NextRequest) {
  try {
    if (!ws) {
      const server = new NetServer()
      ws = new WebSocketServer({ server })
      initSocket(ws)
      server.listen(0)
    }

    return new Response('WebSocket server is running', {
      status: 200
    })
  } catch (err) {
    return new Response(`Failed to start WebSocket server: ${err}`, {
      status: 500
    })
  }
}
