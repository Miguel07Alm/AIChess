"use client";
import { useState } from 'react';
import { useOnline } from '@/contexts/OnlineContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Copy, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const OnlineControls = () => {
  const { isOnline, roomId, createRoom, joinRoom, leaveRoom, isConnecting, error } = useOnline();
  const [joinId, setJoinId] = useState('');

  const handleCreateRoom = () => {
    createRoom();
    
    toast.success('Room created! Share the ID with your opponent');
  };

  const handleJoinRoom = () => {
    if (joinId) {
      joinRoom(joinId);
    }
  };

  if (error) {
    toast.error(error);
  }

  if (isOnline) {
    return (
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-green-500" />
          <span className="text-sm">Room: {roomId}</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(roomId!);
              toast.success('Room ID copied to clipboard');
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={leaveRoom}
          >
            Leave
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col gap-2">
        <Button 
          onClick={handleCreateRoom}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            'Create Online Game'
          )}
        </Button>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Room ID"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          disabled={isConnecting}
        />
        <Button 
          onClick={handleJoinRoom}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Join'
          )}
        </Button>
      </div>
    </Card>
  );
};
