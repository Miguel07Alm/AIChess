"use client";
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Bot, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GameMode {
  id: 'ai' | 'online';
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface Props {
  selectedMode: GameMode['id'] | null;
  onSelectMode: (mode: GameMode['id'] | null) => void;
}

export const GameModeSelector = ({ selectedMode, onSelectMode }: Props) => {
  const modes: GameMode[] = [
    { 
      id: 'ai', 
      label: 'Play vs AI',
      description: 'Challenge our AI opponent',
      icon: <Bot className="w-5 h-5" />
    },
    { 
      id: 'online', 
      label: 'Play Online',
      description: 'Play against other players',
      icon: <Users className="w-5 h-5" />
    }
  ];

  const handleModeSelect = (mode: GameMode['id']) => {
    if (selectedMode === mode) {
      onSelectMode(null);
      localStorage.removeItem("lastRoomId");
    } else {
      onSelectMode(mode);
    }
  };

  return (
      <Card className="p-2 bg-background/95 backdrop-blur-md border-border/50 h-full">
          <div className="flex gap-2 flex-row items-center justify-center h-full">
              {modes.map((mode) => (
                  <motion.div
                      key={mode.id}
                      className="relative flex-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                  >
                      <Button
                          variant={
                              selectedMode === mode.id ? "default" : "outline"
                          }
                          disabled={mode.id === "ai"}
                          onClick={() => handleModeSelect(mode.id)}
                          className={cn(
                              "w-full h-auto flex flex-col items-center gap-1 p-2",
                              "transition-all duration-200",
                              selectedMode === mode.id && "shadow-md relative"
                          )}
                      >
                          {mode.icon}
                          <span className="text-xs font-medium">
                              {mode.label}
                              {mode.id === "ai" && 
                                  <span className="text-[10px] text-muted-foreground"> (coming soon)</span>}
                          </span>
                          <span className="text-[10px] text-muted-foreground hidden sm:block">
                              {mode.description}
                          </span>
                      </Button>
                      {selectedMode === mode.id && (
                          <Button
                              size="icon"
                              variant="ghost"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectMode(null);
                              }}
                          >
                              <X className="h-3 w-3" />
                          </Button>
                      )}
                  </motion.div>
              ))}
          </div>
      </Card>
  );
};
