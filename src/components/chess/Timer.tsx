import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Chess } from "chess.js";

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface TimerProps {
  timeWhite: number;
  timeBlack: number;
  game: Chess;
  gameMode: 'ai' | 'online' | null;
  isConnected: boolean;
}

export const Timer = ({ timeWhite, timeBlack, game, gameMode, isConnected }: TimerProps) => (
  <div className="flex items-center gap-2">
    <Badge 
      variant={gameMode === 'ai' ? "default" : (isConnected ? "success" : "warning")}
      className="text-xs animate-in fade-in duration-300 shrink-0"
    >
      {gameMode === 'ai' ? 'VS AI' : (isConnected ? 'Online' : 'Connecting...')}
    </Badge>
    
    <Card className="flex-1 grid grid-cols-2 gap-1 p-1 bg-background/95 backdrop-blur-md">
      <motion.div 
        animate={{
          scale: game.turn() === 'w' ? 1.02 : 1,
          backgroundColor: game.turn() === 'w' ? 'rgb(59 130 246 / 0.1)' : 'transparent'
        }}
        className={cn(
          "flex items-center justify-between px-2 py-1 rounded",
          "backdrop-blur-sm"
        )}
      >
        <span className="font-mono text-sm">{formatTime(timeWhite)}</span>
        <span className="text-[10px] text-muted-foreground">White</span>
      </motion.div>
      
      <motion.div 
        animate={{
          scale: game.turn() === 'b' ? 1.02 : 1,
          backgroundColor: game.turn() === 'b' ? 'rgb(59 130 246 / 0.1)' : 'transparent'
        }}
        className={cn(
          "flex items-center justify-between px-2 py-1 rounded",
          "backdrop-blur-sm"
        )}
      >
        <span className="font-mono text-sm">{formatTime(timeBlack)}</span>
        <span className="text-[10px] text-muted-foreground">Black</span>
      </motion.div>
    </Card>
  </div>
);
