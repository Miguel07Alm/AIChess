import { Square } from 'chess.js';

export interface GameMove {
  from: Square;
  to: Square;
}
export interface ChatMessage {
    text: string;
    sender: 'w' | 'b' | null;
    timestamp: number;
    isSystem?: boolean;
}
export interface GameStartPayload {
  hostColor: 'w' | 'b';
}

export interface RTCSessionDescriptionWithColor extends RTCSessionDescriptionInit {
  hostColor?: 'w' | 'b';
}

export interface RTCMessage {
  type: 'move' | 'offer' | 'answer' | 'ice-candidate' | 'game-start' | 'disconnect' | 'chat' | 'time-sync' | 'connection-established';
  payload: GameMove | RTCSessionDescriptionWithColor | RTCIceCandidateInit | GameStartPayload | ChatMessage | TimeSyncPayload | null;
  clientId?: string;
}

export interface TimeSyncPayload {
  timeWhite: number;
  timeBlack: number;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  roomId: string;
  clientId: string;
  payload: RTCSessionDescriptionWithColor | RTCIceCandidateInit;
}

export interface RTCRoom {
  id: string;
  clients: Set<string>;
  messages: SignalingMessage[];
}

export interface APIResponse {
    messages: SignalingMessage[];
    error?: string;
    isHost?: boolean;
    clients?: string[];
    debug?: {
        roomExists: boolean;
        clientCount: number;
        messageCount: number;
        timestamp: string;
        timeRemaining: number;
    };
    expiresIn?: number;
    timeRemaining?: number;
}

