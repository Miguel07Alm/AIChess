import { NextResponse } from 'next/server';
import type { SignalingMessage, RTCRoom } from '@/types/webrtc';
import { headers } from 'next/headers';

// Almacenamiento en memoria para las salas
interface RTCRoomWithExpiry extends RTCRoom {
  createdAt: number;
}

const ROOM_EXPIRY_TIME = 20 * 60 * 1000; // 20 minutos en milisegundos
const rooms = new Map<string, RTCRoomWithExpiry>();

// Función para limpiar salas expiradas
function cleanExpiredRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_EXPIRY_TIME) {
      console.log(`[API] Room ${roomId} expired after ${ROOM_EXPIRY_TIME/60000} minutes`);
      rooms.delete(roomId);
    }
  }
}

// Variable global para debug
let DEBUG_COUNTER = 0;

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: Request) {
  try {
    cleanExpiredRooms(); // Limpiar salas expiradas en cada solicitud
    DEBUG_COUNTER++;
    const body = await req.json();
    const { roomId, message, clientId }: {
        roomId: string,
        clientId: string,
        message: SignalingMessage
    } = body;
    
    console.log(`[API-POST-${DEBUG_COUNTER}] Processing request:`, { 
      roomId, 
      clientId,
      messageType: message?.type,
      hasPayload: !!message?.payload,
      messageDetails: {
        type: message?.type,
        from: clientId,
        to: message?.type === 'answer' ? Array.from(rooms.get(roomId)?.clients || [])[0] : 'all'
      }
    });

    if (!roomId || !clientId || !message?.type) {
      const error = 'Missing required fields';
      console.error(`[API-POST-${DEBUG_COUNTER}] Validation error:`, error);
      return NextResponse.json({ error, details: error }, { status: 400 });
    }

    // Create or get room
    if (!rooms.has(roomId)) {
      console.log(`[API-POST-${DEBUG_COUNTER}] Creating new room:`, roomId);
      rooms.set(roomId, {
        id: roomId,
        clients: new Set([clientId]),
        messages: [],
        createdAt: Date.now()
      });
    }

    const room = rooms.get(roomId)!;

    // Always add client to room
    room.clients.add(clientId);

    // Store signaling messages
    if (['offer', 'answer', 'ice-candidate'].includes(message.type)) {
      const hostId = Array.from(room.clients)[0];
      console.log(`[API-POST-${DEBUG_COUNTER}] Processing signaling message:`, {
        type: message.type,
        from: clientId,
        to: message.type === 'answer' ? hostId : 'all',
        isHost: clientId === hostId,
        payload: message.type === 'ice-candidate' ? 'ICE_CANDIDATE' : message.type.toUpperCase(),
        sdpPreview: message.type === 'answer' ? 
          (message.payload as RTCSessionDescriptionInit).sdp?.substring(0, 50) + '...' : 
          undefined
      });

      // Log the actual message content for debugging
      console.log(`[API-POST-${DEBUG_COUNTER}] Full message details:`, {
          type: message.type,
          from: clientId,
          to: message.type === "answer" ? hostId : "all",
          isHost: clientId === hostId,
          sdpType: (message.payload as RTCSessionDescription)?.type,
          sdpLength: (message.payload as RTCSessionDescription)?.sdp?.length,
      });

      // Store the message
      const newMessage = {
        type: message.type,
        roomId,
        clientId,
        payload: message.payload
      };
      room.messages.push(newMessage);

      console.log(`[API-POST-${DEBUG_COUNTER}] Message stored:`, {
        type: message.type,
        from: clientId,
        to: message.type === 'answer' ? hostId : 'all',
        messageCount: room.messages.length
      });

      console.log(`[API-POST-${DEBUG_COUNTER}] Updated room messages:`, {
        count: room.messages.length,
        types: room.messages.map(m => m.type),
        senders: room.messages.map(m => m.clientId)
      });
    }

    console.log(`[API-POST-${DEBUG_COUNTER}] Room state:`, {
      id: roomId,
      clients: Array.from(room.clients),
      messageCount: room.messages.length,
      messageTypes: room.messages.map(m => m.type)
    });

    return NextResponse.json({
      success: true,
      debug: {
        roomId,
        clientCount: room.clients.size,
        messageCount: room.messages.length,
        messageTypes: room.messages.map(m => m.type),
        clients: Array.from(room.clients),
        expiresIn: Math.round((ROOM_EXPIRY_TIME - (Date.now() - rooms.get(roomId)!.createdAt)) / 1000)
      }
    });

  } catch (error) {
    console.error(`[API-POST-${DEBUG_COUNTER}] Error:`, error);
    return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    cleanExpiredRooms(); // Limpiar salas expiradas en cada solicitud
    DEBUG_COUNTER++;
    const url = new URL(req.url);
    const roomId = url.searchParams.get('roomId');
    const clientId = url.searchParams.get('clientId');
    
    if (!roomId || !clientId) {
      return NextResponse.json({ 
        messages: [], 
        error: 'Missing parameters',
        debug: { timestamp: new Date().toISOString() }
      });
    }

    const room = rooms.get(roomId);
    
    if (!room) {
      return NextResponse.json({ 
        messages: [], 
        error: 'Room not found or expired',
        debug: {
          roomId,
          availableRooms: Array.from(rooms.keys())
        }
      });
    }

    // Add client to room if not present
    if (!room.clients.has(clientId)) {
      room.clients.add(clientId);
    }

    const messages = req.headers.get('x-verify-offer') === 'true'
      ? room.messages
      : room.messages.filter(m => {
          const isHost = Array.from(room.clients)[0] === clientId;
          const hostId = Array.from(room.clients)[0];
          
          console.log(`[API-GET-${DEBUG_COUNTER}] Processing message:`, {
            type: m.type,
            from: m.clientId,
            to: isHost ? 'host' : 'guest',
            shouldInclude: isHost 
              ? m.clientId !== clientId // Host receives all messages except their own
              : m.clientId === hostId   // Guest receives only host messages
          });

          // Host should receive all messages except their own
          if (isHost) {
            return m.clientId !== clientId;
          }

          // Guest should receive only host messages
          return m.clientId === hostId;
        });

    console.log(`[API-GET-${DEBUG_COUNTER}] Message filtering details:`, {
      clientId,
      isHost: Array.from(room.clients)[0] === clientId,
      allMessages: room.messages.map(m => ({ type: m.type, from: m.clientId, to: m.clientId === Array.from(room.clients)[0] ? 'guest' : 'host' })),
      filteredMessages: messages.map(m => ({ type: m.type, from: m.clientId }))
    });

    console.log(`[API-GET-${DEBUG_COUNTER}] Sending response:`, {
      roomId,
      clientId,
      messageCount: messages.length,
      messageTypes: messages.map(m => m.type),
      totalClients: room.clients.size,
      clients: Array.from(room.clients),
      isHost: Array.from(room.clients)[0] === clientId
    });

    return NextResponse.json({
      messages,
      isHost: Array.from(room.clients)[0] === clientId,
      clients: Array.from(room.clients),
      expiresIn: Math.round((ROOM_EXPIRY_TIME - (Date.now() - room.createdAt)) / 1000),
      debug: {
        roomExists: true,
        clientCount: room.clients.size,
        messageCount: room.messages.length,
        timestamp: new Date().toISOString(),
        timeRemaining: Math.round((ROOM_EXPIRY_TIME - (Date.now() - room.createdAt)) / 1000)
      }
    });

  } catch (error) {
    console.error(`[API-GET-${DEBUG_COUNTER}] Error:`, error);
    return NextResponse.json({ 
      messages: [], 
      error: 'Server error',
      debug: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
