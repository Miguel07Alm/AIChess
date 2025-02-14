"use client";
import { useCallback, useState, useEffect } from "react";
import { Square as ChessSquare, Color } from "chess.js";
import { Card } from "@/components/ui/card";
import { Square } from "./Square";
import { CapturedPieces, MoveHistory, PIECE_VALUES } from "./GameInfo";
import { useGame } from "@/contexts/GameContext";
import { OnlineControls } from "./OnlineControls";
import { toast } from "sonner";
import { GameModeSelector } from "./GameModeSelector";
import { motion } from "framer-motion";
import { GameReviewControls } from "./GameReviewControls";
import { useRTC } from "@/contexts/RTCContext";
import { GameChat } from "./GameChat";
import { ChevronDown, Clock, ArrowLeft } from "lucide-react";
import { GameChatMobile } from "./GameChatMobile";
import { GameStats } from "./GameStats";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "../ui/collapsible";
import { Button } from "../ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "../ui/drawer";
import { BarChart3 } from "lucide-react";
import { ThemeToggle } from "../ui/theme-toggle";
import { cn, formatTime } from "@/lib/utils";
import { GameModeScreen } from "./GameModeScreen";
import { GameStatus } from "./GameStatus";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

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

// Add this component after GameOnlineStatus
const WaitingOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-10">
        <div className="bg-card/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg border border-border/50 flex flex-col items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500/90 animate-pulse" />
            <p className="text-sm font-medium text-center">
                Waiting for opponent to join...
            </p>
        </div>
    </div>
);

const Timer = ({
    color,
    currentTurn,
    time,
    position,
}: {
    color: Color;
    currentTurn: Color;
    time: number;
    position: "top" | "bottom";
}) => (
    <motion.div
        animate={{
            scale: currentTurn === color ? 1.05 : 1,
            color: currentTurn === color ? "var(--primary)" : "inherit",
        }}
        className={cn(
            "absolute z-20 flex items-center gap-2 px-4 py-2",
            "bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 opacity-50 sm:opacity-100 hover:opacity-80",
            position === "top" ? "top-2 right-2" : "bottom-2 right-2"
        )}
    >
        <Clock className="w-4 h-4" />
        <span className="font-mono font-medium">{formatTime(time)}</span>
        {currentTurn === color && (
            <motion.div
                className="absolute inset-0 rounded-lg border-2 border-primary"
                animate={{
                    opacity: [1, 0.5, 1],
                    scale: [1, 1.02, 1],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        )}
    </motion.div>
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
        isGameStarted,
    } = useGame();

    const { isConnected, playerColor, sendMove, isSpectator, isHost } =
        useRTC();

    const canMove = useCallback(() => {
        if (gameMode === "ai") return currentTurn() === "w"; // Player always white in AI mode
        if (gameMode === "online") {
            if (isSpectator) return false;
            if (!isConnected) return false;
            if (isHost && !isGameStarted) return false; // Prevent host from moving before game starts
            return isConnected && currentTurn() === playerColor;
        }
        return true;
    }, [
        gameMode,
        isConnected,
        currentTurn,
        playerColor,
        isSpectator,
        isHost,
        isGameStarted,
    ]);
    
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

    // TODO: CORREGIR BUG DE SQUARE DE DRAG AND DROP DONDE LA IMAGEN SE PONE EN EL TOP-LEFT DE LA PANTALLA

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

    // Si no hay modo seleccionado, mostrar la pantalla de selección
    if (!gameMode) {
        return <GameModeScreen />;
    }

    return (
        <div className="h-full w-full relative flex flex-col p-1 sm:p-2 gap-1 overflow-hidden">
            {/* Botón de volver */}
            <div className="fixed top-4 left-4 z-[60]">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 opacity-75 hover:opacity-100"
                    onClick={() => setGameMode(null)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </div>
            {gameMode === "online" && <OnlineControls />}

            <MoveHistory moves={moves} />

            {/* Main game section */}
            <div className="flex-1 flex flex-col lg:flex-row gap-1 min-h-0 z-20 overflow-hidden w-full">
                <div className="relative flex-1 flex items-center justify-center min-h-0">
                    <Card className="relative w-full h-full max-h-[calc(100vh-120px)] lg:max-h-[calc(100vh-180px)] aspect-square p-1 sm:p-2 flex items-center justify-center backdrop-blur-sm">
                        <Timer
                            currentTurn={currentTurn()}
                            color="b"
                            time={timeBlack}
                            position="top"
                        />
                        <div className="relative w-full h-full max-w-[min(95vh,600px)] aspect-square">
                            {/* Contenedor para GameStatus */}
                            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                                <div className="w-full max-w-[80%]">
                                    <GameStatus game={game} />
                                </div>
                            </div>
                            
                            {/* Game status overlays */}
                            {gameMode === "online" && isConnected && (
                                <GameOnlineStatus
                                    playerColor={playerColor}
                                    isYourTurn={currentTurn() === playerColor}
                                    isConnected={isConnected}
                                    isSpectator={isSpectator}
                                />
                            )}
                            {gameMode === "online" &&
                                !isGameStarted &&
                                isHost && <WaitingOverlay />}

                            {/* Chess board grid */}
                            <div className="grid grid-cols-8 w-full h-full rounded-lg overflow-hidden">
                                {renderSquares()}
                            </div>
                        </div>
                        <Timer
                            currentTurn={currentTurn()}
                            color="w"
                            time={timeWhite}
                            position="bottom"
                        />
                    </Card>
                </div>

                {/* Side panel - minimizado en móvil */}
                <div className="lg:w-[240px] flex-none">
                    <div className="block lg:hidden space-y-1">
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
    pieces.reduce(
        (_, piece) => PIECE_VALUES[piece as keyof typeof PIECE_VALUES] || 0,
        0
    );
export default ChessBoard;
