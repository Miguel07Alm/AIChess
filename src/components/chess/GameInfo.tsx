import { Move } from 'chess.js'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Chess } from 'chess.js'
import { Fragment, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Skull, Equal, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GameInfoProps {
  moves: Move[]
  capturedPieces: {white: string[], black: string[]}
  timeWhite: number
  timeBlack: number
  game: Chess
  gameMode: 'ai' | 'online' | null
  isConnected: boolean
}

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60)
  const seconds = time % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Añadir objeto para valores de las piezas
export const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
} as const;

const PieceBadge = ({ piece, color }: { piece: string, color: 'w' | 'b' }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-6 h-6">
        <Image
          src={`/${color}_${piece}.svg`}
          alt={`${color} ${piece}`}
          fill
          className={`
            object-contain
            ${color === 'b' ? '[filter:brightness(0.15)_contrast(1.5)]' : ''}
          `}
          priority
        />
      </div>
      <span className="text-[10px] text-neutral-500 mt-0.5">
        {PIECE_VALUES[piece as keyof typeof PIECE_VALUES]}
      </span>
    </div>
  );
};

export const GameStatus = ({ game }: { game: Chess }) => {
  const statusInfo = () => {
    if (game.isCheckmate()) {
      return {
        icon: Crown,
        text: game.turn() === 'w' ? 'Black wins' : 'White wins',
        class: 'bg-gradient-to-r from-amber-500 to-yellow-500',
        animation: {
          scale: [1, 1.2, 1],
          rotate: [0, -10, 10, 0],
        }
      }
    }
    if (game.isStalemate()) {
      return {
        icon: Equal,
        text: 'Stalemate',
        class: 'bg-gradient-to-r from-blue-500 to-cyan-500',
        animation: {
          scale: [1, 1.1, 1],
          y: [0, -5, 0],
        }
      }
    }
    if (game.isDraw()) {
      return {
        icon: Equal,
        text: 'Draw',
        class: 'bg-gradient-to-r from-blue-500 to-cyan-500',
        animation: {
          scale: [1, 1.1, 1],
          y: [0, -5, 0],
        }
      }
    }
    if (game.isCheck()) {
      return {
        icon: AlertTriangle,
        text: 'Check',
        class: 'bg-gradient-to-r from-red-500 to-orange-500',
        animation: {
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0],
        }
      }
    }
    if (game.isGameOver()) {
      return {
        icon: Skull,
        text: 'Game Over',
        class: 'bg-gradient-to-r from-neutral-500 to-stone-500',
        animation: {
          scale: [1, 1.1, 1],
          opacity: [1, 0.7, 1],
        }
      }
    }
    return {
      icon: Crown,
      text: game.turn() === 'w' ? 'White to move' : 'Black to move',
      class: 'bg-gradient-to-r from-blue-400 to-blue-500',
      animation: {
        scale: [1, 1.05, 1],
        opacity: [0.9, 1, 0.9],
      }
    }
  }

  const status = statusInfo()

  const Icon = status.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`
          p-3 rounded-lg ${status.class}
          flex items-center gap-3 text-white
          shadow-lg backdrop-blur-sm
        `}
      >
        <motion.div
          animate={status.animation}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
        <span className="font-medium">{status.text}</span>
      </motion.div>
    </AnimatePresence>
  )
}
interface TimerProps {
  timeWhite: number,
  timeBlack: number,
  game: Chess,
  gameMode: 'ai' | 'online' | null,
  isConnected: boolean
}
export const Timer = ({ timeWhite, timeBlack, game, gameMode, isConnected }: TimerProps) => (
  <Card className="p-2 bg-background/95 backdrop-blur-md border border-border/50">
    <div className="flex items-center justify-between mb-2">
      <Badge 
        variant={gameMode === 'ai' ? "default" : (isConnected ? "success" : "warning")}
        className="text-xs animate-in fade-in duration-300"
      >
        {gameMode === 'ai' ? 'VS AI' : (isConnected ? 'Online' : 'Connecting...')}
      </Badge>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <motion.div 
        animate={{
          scale: game.turn() === 'w' ? 1.02 : 1,
          backgroundColor: game.turn() === 'w' ? 'rgb(59 130 246 / 0.1)' : 'transparent'
        }}
        className={cn(
          "flex flex-col items-center p-2 rounded-lg",
        )}
      >
        <span className="font-mono text-lg font-semibold">{formatTime(timeWhite)}</span>
        <span className="text-xs text-muted-foreground">White</span>
      </motion.div>
      
      <motion.div 
        animate={{
          scale: game.turn() === 'b' ? 1.02 : 1,
          backgroundColor: game.turn() === 'b' ? 'rgb(59 130 246 / 0.1)' : 'transparent'
        }}
        className={cn(
          "flex flex-col items-center p-2 rounded-lg",
        )}
      >
        <span className="font-mono text-lg font-semibold">{formatTime(timeBlack)}</span>
        <span className="text-xs text-muted-foreground">Black</span>
      </motion.div>
    </div>
  </Card>
);
          

export const MoveHistory = ({ moves }: { moves: Move[] }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll cuando se añaden nuevos movimientos
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft =
                scrollContainerRef.current.scrollWidth;
        }
    }, [moves]);

    return (
        <Card className="p-2 col-span-2">
            <h3 className="text-xs text-muted-foreground font-medium p-2">
                Move History
            </h3>
            
            <div
                ref={scrollContainerRef}
                className="overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
            >
                <div className="inline-flex gap-2 px-1 h-8 items-center">
                    {moves.map((move, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`
                flex items-center gap-1 text-sm
                ${i % 2 === 0 ? "mr-1" : "mr-3"}
              `}
                        >
                            {i % 2 === 0 && (
                                <span className="text-muted-foreground font-mono text-xs">
                                    {Math.floor(i / 2 + 1)}.
                                </span>
                            )}
                            <span className="font-medium bg-muted/50 px-1.5 py-0.5 rounded">
                                {move.san}
                            </span>
                        </motion.div>
                    ))}
                    {moves.length > 0 && (
                        <div className="w-4 h-full flex-shrink-0" />
                    )}
                </div>
            </div>
        </Card>
    );
};

export const CapturedPieces = ({
  capturedPieces,
  whitePoints,
  blackPoints
}: {
  capturedPieces: GameInfoProps['capturedPieces'];
  whitePoints: number;
  blackPoints: number;
}) => (
  <Card className="p-2 min-h-[83px] max-h-[83px]">
    <div className="grid grid-cols-2 gap-1">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Black</span>
          {whitePoints > 0 && (
            <span className="text-xs font-medium">+{whitePoints}</span>
          )}
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <div className="flex gap-1 min-w-min p-1">
            {capturedPieces.white.map((piece, i) => (
              <PieceBadge key={i} piece={piece} color="w" />
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">White</span>
          {blackPoints > 0 && (
            <span className="text-xs font-medium">+{blackPoints}</span>
          )}
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <div className="flex gap-1 min-w-min p-1">
            {capturedPieces.black.map((piece, i) => (
              <PieceBadge key={i} piece={piece} color="b" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </Card>
);
