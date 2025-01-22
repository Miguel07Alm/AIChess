"use client";
import { useCallback, useState } from 'react'
import { Square as ChessSquare } from 'chess.js'
import { Card } from '@/components/ui/card'
import { Square } from './Square'
import { GameInfo } from './GameInfo'
import { useGame } from '@/contexts/GameContext'
import { OnlineControls } from './OnlineControls'
import { useOnline } from '@/contexts/OnlineContext'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { GameModeSelector } from './GameModeSelector';
import { motion } from 'framer-motion';
import { GameReviewControls } from './GameReviewControls';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

const ChessBoard = () => {
  const {
    position,
    selectedSquare,
    moves,
    timeWhite,
    timeBlack,
    capturedPieces,
    game,
    makeMove,
    setSelectedSquare,
    getLegalMoves,
    currentTurn,
    gameMode,
    setGameMode,
    isGameStarted,
  } = useGame()

  const { playerColor } = useOnline()

  const canMove = gameMode === 'ai' ? 
    currentTurn() === 'w' : 
    ((!gameMode || isGameStarted) && currentTurn() === playerColor)

  const handleMove = useCallback((from: ChessSquare, to: ChessSquare) => {
    if (!canMove) {
      toast.error("It's not your turn!")
      return false
    }
    return makeMove(from, to)
  }, [canMove, makeMove])

  const renderSquares = useCallback(() => {
    const squares = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = `${FILES[col]}${RANKS[row]}` as ChessSquare
        const isSelected = selectedSquare === square
        const isLegalMove = selectedSquare && getLegalMoves(selectedSquare).includes(square)

        squares.push(
          <Square
            key={square}
            square={square}
            isBlack={(row + col) % 2 === 1}
            piece={position[row][col]}
            coord={[row, col]}
            isSelected={isSelected}
            isLegalMove={!!isLegalMove}
            onSelect={setSelectedSquare}
            onMove={handleMove}
            turn={currentTurn()}
            selectedSquare={selectedSquare} // Añadido este prop
          />
        )
      }
    }
    return squares
  }, [position, selectedSquare, getLegalMoves, handleMove, setSelectedSquare, currentTurn])

  return (
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl mx-auto p-2 sm:p-4">
          <div className="w-full flex flex-col gap-4">
              <GameModeSelector
                  selectedMode={gameMode}
                  onSelectMode={setGameMode}
              />
              {gameMode === "online" && <OnlineControls />}
              <GameReviewControls />
              <Card className="p-2 sm:p-4 lg:p-8 bg-background w-full">
                  <div className="relative w-full max-w-[min(calc(100vw-1rem),640px)] aspect-square">
                      {gameMode === "online" && (
                          <div
                              className={`
                absolute -top-10 left-0 right-0 
                flex items-center justify-center gap-2
                text-sm font-medium
              `}
                          >
                              {playerColor === "w"
                                  ? "Playing as White"
                                  : "Playing as Black"}
                              <span
                                  className={`
                  w-2 h-2 rounded-full
                  ${
                      currentTurn() === playerColor
                          ? "bg-green-500"
                          : "bg-red-500"
                  }
                `}
                              />
                              {currentTurn() === playerColor
                                  ? "Your turn"
                                  : "Opponent's turn"}
                          </div>
                      )}
                      {gameMode === 'online' && !isGameStarted && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm p-4 rounded-lg shadow-lg z-10">
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center gap-2 text-lg font-medium"
                          >
                            Waiting for opponent...
                          </motion.div>
                        </div>
                      )}
                      {/* Files labels (top) */}
                      <div className="absolute -top-4 sm:-top-6 left-0 right-0 flex justify-around select-none">
                          {FILES.map((file) => (
                              <span
                                  key={file}
                                  className="text-[10px] sm:text-sm text-neutral-400 font-mono"
                              >
                                  {file}
                              </span>
                          ))}
                      </div>

                      {/* Ranks labels (left) */}
                      <div className="absolute -left-4 sm:-left-6 top-0 bottom-0 flex flex-col justify-around select-none">
                          {RANKS.map((rank) => (
                              <span
                                  key={rank}
                                  className="text-[10px] sm:text-sm text-neutral-400 font-mono"
                              >
                                  {rank}
                              </span>
                          ))}
                      </div>

                      <div className="grid grid-cols-8 gap-0 w-full h-full rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
                          {renderSquares()}
                      </div>
                  </div>
              </Card>
          </div>

          <div className="w-full lg:w-80 flex-shrink-0">
              <GameInfo
                  moves={moves}
                  capturedPieces={capturedPieces}
                  timeWhite={timeWhite}
                  timeBlack={timeBlack}
                  game={game}
                  gameMode={gameMode}
                  isGameStarted={isGameStarted}
              />
          </div>
      </div>
  );
};

export default ChessBoard
