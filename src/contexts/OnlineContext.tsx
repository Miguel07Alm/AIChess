"use client";
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Square } from 'chess.js';

interface OnlineContextType {
  isOnline: boolean;
  roomId: string | null;
  playerColor: 'w' | 'b' | null;
  createRoom: () => void;
  joinRoom: (id: string) => void;
  leaveRoom: () => void;
  isConnecting: boolean;
  error: string | null;
  socket: Socket | null;
}

const OnlineContext = createContext<OnlineContextType | null>(null);

export function OnlineProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Primero hacemos un request para asegurarnos que el servidor WebSocket está corriendo
    fetch('/api/socket')
      .then(() => {
        const newSocket = io({
          path: '/api/socket',
          addTrailingSlash: false
        });
        setSocket(newSocket);

        return () => {
          newSocket.close();
        };
      })
      .catch(console.error);
  }, []);

  const createRoom = useCallback(() => {
    if (socket) {
      setIsConnecting(true);
      setError(null);
      socket.emit('create-room');
    }
  }, [socket]);

  const joinRoom = useCallback((id: string) => {
    if (socket) {
      setIsConnecting(true);
      setError(null);
      socket.emit('join-room', id);
    }
  }, [socket]);

  const leaveRoom = useCallback(() => {
    setIsOnline(false);
    setRoomId(null);
    setPlayerColor(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-created', ({ roomId, color }) => {
      setRoomId(roomId);
      setPlayerColor(color);
      setIsOnline(true);
      setIsConnecting(false);
    });

    socket.on('room-joined', ({ roomId, color }) => {
      setRoomId(roomId);
      setPlayerColor(color);
      setIsOnline(true);
      setIsConnecting(false);
    });

    socket.on('room-error', (message) => {
      setError(message);
      setIsConnecting(false);
    });

    socket.on('opponent-disconnected', () => {
      setError('Opponent disconnected');
      leaveRoom();
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('room-error');
      socket.off('opponent-disconnected');
    };
  }, [socket, leaveRoom]);

  return (
    <OnlineContext.Provider
      value={{
        isOnline,
        roomId,
        playerColor,
        createRoom,
        joinRoom,
        leaveRoom,
        isConnecting,
        error,
        socket
      }}
    >
      {children}
    </OnlineContext.Provider>
  );
}

export const useOnline = () => {
  const context = useContext(OnlineContext);
  if (!context) {
    throw new Error('useOnline must be used within an OnlineProvider');
  }
  return context;
};
