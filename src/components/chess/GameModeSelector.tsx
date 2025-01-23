"use client";
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Bot, Users } from 'lucide-react';

interface GameMode {
  id: 'ai' | 'online';
  label: string;
}

interface Props {
  selectedMode: GameMode['id'] | null;
  onSelectMode: (mode: GameMode['id'] | null) => void;
}

export const GameModeSelector = ({ selectedMode, onSelectMode }: Props) => {
  const modes: GameMode[] = [
    { id: 'ai', label: 'vs AI' },
    { id: 'online', label: 'P2P Game' }
  ];

  const getIcon = (mode: GameMode['id']) => {
    switch (mode) {
      case 'ai': return <Bot className="w-4 h-4" />;
      case 'online': return <Users className="w-4 h-4" />;
    }
  };

  const handleModeSelect = (mode: GameMode['id']) => {
    // Si ya hay un modo seleccionado, primero limpiarlo
    if (selectedMode) {
      onSelectMode(null);
      localStorage.removeItem("lastRoomId"); // Limpiar cualquier roomId guardado
    }
    // Después establecer el nuevo modo
    onSelectMode(mode);
  };

  return (
    <Card className="p-4 w-full">
      <div className="flex gap-2 w-full">
        {modes.map((mode) => (
          <Button
            key={mode.id}
            // Invertimos la lógica aquí: AI deshabilitado, online habilitado
            disabled={mode.id === "ai"}
            variant={selectedMode === mode.id ? "default" : "outline"}
            onClick={() => handleModeSelect(mode.id)}
            className="flex gap-2 w-full"
          >
            {getIcon(mode.id)}
            {mode.label}
            {mode.id === 'ai' && (
              <span className="text-xs opacity-50">(Coming soon)</span>
            )}
          </Button>
        ))}
      </div>
    </Card>
  );
};
