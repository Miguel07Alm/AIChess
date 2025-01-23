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

const GameStatus = ({ game }: { game: Chess }) => {
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
    return null
  }

  const status = statusInfo()
  if (!status) return null

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

export const Timer = ({ timeWhite, timeBlack, game, gameMode, isConnected }: {
  timeWhite: number;
  timeBlack: number;
  game: Chess;
  gameMode: 'ai' | 'online' | null;
  isConnected: boolean;
}) => (
  <Card className="p-3">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-medium">Timer</h3>
      {gameMode && (
        <Badge variant="secondary" className="text-xs">
          {gameMode === 'ai' ? 'VS AI' : (isConnected ? 'Online' : 'Waiting...')}
        </Badge>
      )}
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className={cn(
        "flex flex-col items-center p-2 rounded-lg transition-colors",
        game.turn() === 'w' ? 'bg-[#007AFF]/10' : ''
      )}>
        <span className="font-mono text-xl font-semibold">{formatTime(timeWhite)}</span>
        <span className="text-xs text-muted-foreground">White</span>
      </div>
      <div className={cn(
        "flex flex-col items-center p-2 rounded-lg transition-colors",
        game.turn() === 'b' ? 'bg-[#007AFF]/10' : ''
      )}>
        <span className="font-mono text-xl font-semibold">{formatTime(timeBlack)}</span>
        <span className="text-xs text-muted-foreground">Black</span>
      </div>
    </div>
  </Card>
);

export const MoveHistory = ({ moves }: { moves: Move[] }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll cuando se añaden nuevos movimientos
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [moves]);

  return (
    <Card className="p-2">
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
                ${i % 2 === 0 ? 'mr-1' : 'mr-3'}
              `}
            >
              {i % 2 === 0 && (
                <span className="text-muted-foreground font-mono text-xs">
                  {Math.floor(i/2 + 1)}.
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
  <Card className="p-3">
    <h3 className="text-base font-medium mb-3">Captured Pieces</h3>
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">Black pieces</span>
          {whitePoints > 0 && (
            <span className="text-sm font-medium">+{whitePoints}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {capturedPieces.white.map((piece, i) => (
            <PieceBadge key={i} piece={piece} color="w" />
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">White pieces</span>
          {blackPoints > 0 && (
            <span className="text-sm font-medium">+{blackPoints}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {capturedPieces.black.map((piece, i) => (
            <PieceBadge key={i} piece={piece} color="b" />
          ))}
        </div>
      </div>
    </div>
  </Card>
);

// Main GameInfo component simplified
export const GameInfo = ({ moves, capturedPieces, timeWhite, timeBlack, game, gameMode, isConnected }: GameInfoProps) => {
  const getPoints = (pieces: string[]) => 
    pieces.reduce((acc, piece) => acc + PIECE_VALUES[piece as keyof typeof PIECE_VALUES], 0);

  const whitePoints = getPoints(capturedPieces.black);
  const blackPoints = getPoints(capturedPieces.white);

  return (
    <div className="flex flex-col gap-3">
      <Timer
        timeWhite={timeWhite}
        timeBlack={timeBlack}
        game={game}
        gameMode={gameMode}
        isConnected={isConnected}
      />
      <GameStatus game={game} />
      <CapturedPieces
        capturedPieces={capturedPieces}
        whitePoints={whitePoints}
        blackPoints={blackPoints}
      />
    </div>
  );
};
