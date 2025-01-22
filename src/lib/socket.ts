import { Server } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket'

const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  cors: {
    origin: '*'
  }
})

io.on('connection', (socket) => {
  socket.on('create-room', () => {
    const roomId = Math.random().toString(36).substring(2, 8)
    socket.join(roomId)
    socket.emit('room-created', { roomId, color: 'w' })
  })

  socket.on('join-room', (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId)
    if (room && room.size === 1) {
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
    // La limpieza de la sala se maneja automáticamente por Socket.IO
    console.log('Client disconnected:', socket.id)
  })
})

export default io
