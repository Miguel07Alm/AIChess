"use client";
import { useCallback, useState } from "react";
import { Square as ChessSquare } from "chess.js";
import { Card } from "@/components/ui/card";
import { Square } from "./Square";
import { CapturedPieces, GameStatus, MoveHistory, PIECE_VALUES, Timer } from "./GameInfo";
import { useGame } from "@/contexts/GameContext";
import { OnlineControls } from "./OnlineControls";
import { useEffect } from "react";
import { toast } from "sonner";
import { GameModeSelector } from "./GameModeSelector";
import { motion } from "framer-motion";
import { GameReviewControls } from "./GameReviewControls";
import { useRTC } from "@/contexts/RTCContext";
import { GameChat } from "./GameChat";
import { ChevronDown } from "lucide-react";
import { GameChatMobile } from "./GameChatMobile";
import { GameStats } from "./GameStats";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Button } from "../ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "../ui/drawer";
import { BarChart3 } from "lucide-react";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

// Primero añadimos un nuevo componente para el estado del juego
const GameOnlineStatus = ({
    playerColor,
    isYourTurn,
    isConnected,
    isSpectator,
}: {
    playerColor: "w" | "b" | null;
    isYourTurn: boolean;
    isConnected: boolean;
    isSpectator: boolean;
}) => (
    <div className="absolute -top-14 left-0 right-0 flex flex-col items-center justify-center">
        <div className="bg-card/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-border/50">
            {isConnected ? (
                isSpectator ? (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500/90" />
                        <span className="text-sm">Spectating mode</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-3 h-3 rounded-full ${
                                    isYourTurn
                                        ? "bg-green-500/90"
                                        : "bg-neutral-400/90"
                                } animate-pulse`}
                            />
                            <span className="font-medium text-sm">
                                Playing as{" "}
                                {playerColor === "w" ? "White" : "Black"}
                            </span>
                        </div>
                        <div className="h-4 w-[1px] bg-border" />
                        <span
                            className={`text-sm ${
                                isYourTurn
                                    ? "text-green-500/90 font-medium"
                                    : "text-muted-foreground"
                            }`}
                        >
                            {isYourTurn ? "Your turn" : "Opponent's turn"}
                        </span>
                    </div>
                )
            ) : (
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500/90 animate-pulse" />
                    <span className="text-sm text-yellow-500/90">
                        Waiting for opponent to connect...
                    </span>
                </div>
            )}
        </div>
    </div>
);

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
        boardOrientation,
        lastMove,
    } = useGame();

    const { isConnected, playerColor, sendMove, isSpectator } = useRTC();

    const canMove = useCallback(() => {
        if (gameMode === "ai") return currentTurn() === "w"; // Player always white in AI mode
        if (gameMode === "online") {
            if (isSpectator) return false;
            console.log("[Chess] Can move check:", {
                isConnected,
                currentTurn: currentTurn(),
                playerColor,
                result: isConnected && currentTurn() === playerColor,
            });
            return isConnected && currentTurn() === playerColor;
        }
        return true;
    }, [gameMode, isConnected, currentTurn, playerColor, isSpectator]);

    const handleMove = useCallback(
        async (from: ChessSquare, to: ChessSquare) => {
            if (!canMove()) {
                toast.error("It's not your turn!", {
                    duration: 2000,
                });
                return false;
            }

            // Pasar false como tercer argumento para indicar que es un movimiento local
            const moveSuccess = await makeMove(from, to, false);

            if (moveSuccess && gameMode === "online") {
                console.log("[Chess] Sending move to opponent:", {
                    from,
                    to,
                    playerColor,
                    isConnected,
                });
                try {
                    sendMove({ from, to });
                } catch (err) {
                    console.error("[Chess] Failed to send move:", err);
                    toast.error("Failed to send move to opponent");
                }
            }

            return moveSuccess;
        },
        [canMove, makeMove, gameMode, sendMove, playerColor, isConnected]
    );

    // Corregir el renderSquares para manejar correctamente la orientación
    const renderSquares = useCallback(() => {
        const squares = [];
        const orderedRanks =
            boardOrientation === "white" ? RANKS : [...RANKS].reverse();
        const orderedFiles =
            boardOrientation === "white" ? FILES : [...FILES].reverse();

        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
                const file = orderedFiles[fileIndex];
                const rank = orderedRanks[rankIndex];
                const square = `${file}${rank}` as ChessSquare;

                // Corregir el cálculo de la posición
                const positionRankIndex =
                    boardOrientation === "white" ? rankIndex : 7 - rankIndex;
                const positionFileIndex =
                    boardOrientation === "white" ? fileIndex : 7 - fileIndex;

                squares.push(
                    <Square
                        key={square}
                        square={square}
                        isBlack={(rankIndex + fileIndex) % 2 === 1}
                        piece={position[positionRankIndex][positionFileIndex]}
                        coord={[rankIndex, fileIndex]}
                        isSelected={selectedSquare === square}
                        isLegalMove={
                            (selectedSquare &&
                                getLegalMoves(selectedSquare).includes(
                                    square
                                )) ??
                            false
                        }
                        onSelect={setSelectedSquare}
                        onMove={handleMove}
                        turn={currentTurn()}
                        selectedSquare={selectedSquare}
                        lastMove={lastMove}
                    />
                );
            }
        }
        return squares;
    }, [
        position,
        selectedSquare,
        getLegalMoves,
        handleMove,
        setSelectedSquare,
        currentTurn,
        boardOrientation,
        lastMove,
    ]);

    return (
        <div className="h-full w-full relative flex flex-col p-1 sm:p-2 gap-1">
            {/* Header section */}
            <div className="flex-none grid grid-cols-[auto_1fr] gap-1">
                {/* Game modes and controls */}
                <div className="flex flex-col gap-1">
                    <GameModeSelector
                        selectedMode={gameMode}
                        onSelectMode={setGameMode}
                    />
                    <div className="flex gap-1">
                        {gameMode === "online" && <OnlineControls />}
                        <GameReviewControls />
                    </div>
                </div>

                {/* Timer and History */}
                <div className="flex flex-col gap-1">
                    <Timer
                        timeWhite={timeWhite}
                        timeBlack={timeBlack}
                        game={game}
                        gameMode={gameMode}
                        isConnected={isConnected}
                    />
                </div>
                <MoveHistory moves={moves} />
            </div>

            {/* Main game section */}
            <div className="flex-1 flex flex-col lg:flex-row gap-1 min-h-0">
                {/* Board container - más grande en móvil */}
                <div className="flex-1 flex items-center justify-center min-h-0">
                    <Card className="w-full h-full max-h-[calc(100vh-120px)] lg:max-h-[calc(100vh-180px)] aspect-square p-1 sm:p-2 flex items-center justify-center bg-card">
                        <div className="relative w-full h-full max-w-[min(95vh,600px)] aspect-square">
                            {gameMode === "online" && isConnected && (
                                <GameOnlineStatus
                                    playerColor={playerColor}
                                    isYourTurn={currentTurn() === playerColor}
                                    isConnected={isConnected}
                                    isSpectator={isSpectator}
                                />
                            )}
                            <div className="grid grid-cols-8 w-full h-full rounded-lg overflow-hidden">
                                {renderSquares()}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Side panel - minimizado en móvil */}
                <div className="lg:w-[240px] flex-none">
                    {/* Panel móvil */}
                    <div className="block lg:hidden space-y-1">
                        <GameStatus game={game} />
                        <CapturedPieces
                            capturedPieces={capturedPieces}
                            whitePoints={getPoints(capturedPieces.black)}
                            blackPoints={getPoints(capturedPieces.white)}
                        />
                        <Drawer>
                            <DrawerTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" />
                                        Game Stats
                                    </span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent className="h-[80vh]">
                                <DrawerHeader>
                                    <DrawerTitle>Game Statistics</DrawerTitle>
                                </DrawerHeader>
                                <div className="p-4 pt-0 h-full">
                                    <GameStats game={game} moves={moves} />
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>

                    {/* Panel desktop */}
                    <div className="hidden lg:flex flex-col gap-1 h-auto lg:h-full">
                        <GameStatus game={game} />
                        <CapturedPieces
                            capturedPieces={capturedPieces}
                            whitePoints={getPoints(capturedPieces.black)}
                            blackPoints={getPoints(capturedPieces.white)}
                        />
                        <GameStats game={game} moves={moves} />
                    </div>
                </div>
            </div>

            {/* Chat components */}
            <div className="hidden md:block">
                {((gameMode === "online" && isConnected) ||
                    gameMode === "ai") && (
                    <div className="fixed right-4 bottom-4 z-50">
                        <GameChat />
                    </div>
                )}
            </div>
            <div className="md:hidden">
                {((gameMode === "online" && isConnected) ||
                    gameMode === "ai") && <GameChatMobile />}
            </div>
        </div>
    );
};

// Helper function for calculating points
const getPoints = (pieces: string[]) => 
    pieces.reduce((_, piece) => PIECE_VALUES[piece as keyof typeof PIECE_VALUES] || 0, 0);

export default ChessBoard;
