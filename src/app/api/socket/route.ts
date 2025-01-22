import { createServer } from 'http';
import { Server } from 'socket.io';
import { NextResponse } from 'next/server';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket';

const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  path: "/api/socketio",
  addTrailingSlash: false,
});

const httpServer = createServer();
io.attach(httpServer);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("create-room", () => {
    const roomId = Math.random().toString(36).substring(2, 8);
    socket.join(roomId);
    socket.emit("room-created", { roomId, color: "w" });
  });

  socket.on("join-room", (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room && room.size === 1) {
      socket.join(roomId);
      socket.emit("room-joined", { roomId, color: "b" });
      io.to(roomId).emit("game-start");
    } else {
      socket.emit("room-error", "Room full or not found");
    }
  });

  socket.on("move", ({ from, to, roomId }) => {
    socket.to(roomId).emit("opponent-move", { from, to });
  });
});

const port = parseInt(process.env.SOCKET_PORT || '3000');
httpServer.listen(port);

export async function GET(req: Request) {
  return NextResponse.json({ ok: true }, { status: 200 });
}
