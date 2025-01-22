"use client";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import { Chess, Square, Move, PieceSymbol, Color, Piece } from "chess.js";
import { useOnline } from "./OnlineContext";

type BoardPosition = (Piece | null)[][];

interface GameContextType {
    game: Chess;
    position: BoardPosition;
    selectedSquare: Square | null;
    moves: Move[];
    timeWhite: number;
    timeBlack: number;
    capturedPieces: { white: PieceSymbol[]; black: PieceSymbol[] };
    makeMove: (from: Square, to: Square) => boolean;
    setSelectedSquare: (square: Square | null) => void;
    getLegalMoves: (square: Square) => Square[];
    currentTurn: () => Color;
    lastMove: { from: Square; to: Square } | null;
    gameMode: 'ai' | 'online' | null;
    setGameMode: (mode: 'ai' | 'online' | null) => void;
    isGameStarted: boolean;
    gameHistory: {
        position: BoardPosition;
        move: Move | null;
        capturedPieces: { white: PieceSymbol[]; black: PieceSymbol[] };
    }[];
    currentHistoryIndex: number;
    isReviewing: boolean;
    navigateHistory: (index: number) => void;
    startReview: () => void;
    stopReview: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
    const [gameMode, setGameMode] = useState<'ai' | 'online' | null>(null);
    const [game] = useState(new Chess());
    const [position, setPosition] = useState<(Piece | null)[][]>(game.board());
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [moves, setMoves] = useState<Move[]>([]);
    const [timeWhite, setTimeWhite] = useState(600);
    const [timeBlack, setTimeBlack] = useState(600);
    const [capturedPieces, setCapturedPieces] = useState<
        GameContextType["capturedPieces"]
    >({
        white: [],
        black: [],
    });
    const [lastMove, setLastMove] = useState<{
        from: Square;
        to: Square;
    } | null>(null);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [gameHistory, setGameHistory] = useState<GameContextType['gameHistory']>([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
    const [isReviewing, setIsReviewing] = useState(false);

    const { socket, roomId, isOnline } = useOnline();

    useEffect(() => {
        // Timer solo corre si:
        // 1. El juego ha empezado (ambos jugadores en online)
        // 2. No es online (modo AI o local)
        const shouldRunTimer = isGameStarted || !isOnline;
        
        const timer = setInterval(() => {
            if (shouldRunTimer && !game.isGameOver() && timeWhite > 0 && timeBlack > 0) {
                if (game.turn() === "w") {
                    setTimeWhite((prev) => Math.max(0, prev - 1));
                } else {
                    setTimeBlack((prev) => Math.max(0, prev - 1));
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [game, timeWhite, timeBlack, isGameStarted, isOnline]);

    const handleCapture = useCallback((move: Move) => {
        if (move.captured) {
            setCapturedPieces((prev) => {
                const color = move.color === "w" ? "black" : "white";
                return {
                    ...prev,
                    [color]: [...prev[color], move.captured],
                } as GameContextType["capturedPieces"];
            });
        }
    }, []);
    const makeMove = useCallback(
        (from: Square, to: Square) => {
            try {
                const moveResult = game.move({ from, to, promotion: "q" });
                if (moveResult) {
                    const newPosition = game.board();
                    setPosition(newPosition);
                    setMoves(game.history({ verbose: true }));
                    handleCapture(moveResult);
                    setSelectedSquare(null);
                    setLastMove({ from, to });

                    // Guardar el estado en el historial
                    setGameHistory(prev => [...prev, {
                        position: newPosition,
                        move: moveResult,
                        capturedPieces: { ...capturedPieces }
                    }]);

                    // Emit move to opponent if online
                    if (isOnline && socket && roomId) {
                        socket.emit("move", { from, to, roomId });
                    }

                    // AI move if in AI mode and it's black's turn
                    if (gameMode === 'ai' && game.turn() === 'b') {
                        setTimeout(() => {
                            makeAIMove();
                        }, 500);
                    }

                    return true;
                }
            } catch (e) {
                console.error(e);
            }
            return false;
        },
        [game, handleCapture, socket, roomId, isOnline, gameMode, capturedPieces]
    );

    const makeAIMove = useCallback(() => {
        const moves = game.moves({ verbose: true })
        if (moves.length > 0) {
            const move = moves[Math.floor(Math.random() * moves.length)]
            if (move.from && move.to) {
                makeMove(move.from as Square, move.to as Square)
            }
        }
    }, [game])

    useEffect(() => {
        if (!socket) return;

        socket.on("opponent-move", ({ from, to }) => {
            makeMove(from, to);
        });

        socket.on("game-start", () => {
            // Reset game when both players join
            game.reset();
            setPosition(game.board());
            setMoves([]);
            setCapturedPieces({ white: [], black: [] });
            setTimeWhite(600);
            setTimeBlack(600);
            setIsGameStarted(true);
        });

        return () => {
            socket.off("opponent-move");
            socket.off("game-start");
        };
    }, [socket, makeMove, game]);

    // Reset game when game mode changes
    useEffect(() => {
        game.reset();
        setPosition(game.board());
        setMoves([]);
        setCapturedPieces({ white: [], black: [] });
        setTimeWhite(600);
        setTimeBlack(600);
        setSelectedSquare(null);
        setLastMove(null);
        setIsGameStarted(false);
        setGameHistory([]);
        setCurrentHistoryIndex(-1);
        setIsReviewing(false);
    }, [gameMode, game]);

    const getLegalMoves = useCallback(
        (square: Square) => {
            return game
                .moves({
                    square,
                    verbose: true,
                })
                .map((move) => move.to);
        },
        [game]
    );

    const currentTurn = useCallback(() => game.turn(), [game]);

    const navigateHistory = useCallback((index: number) => {
        if (index >= -1 && index < gameHistory.length) {
            setCurrentHistoryIndex(index);
            if (index === -1) {
                game.reset();
                setPosition(game.board());
                setCapturedPieces({ white: [], black: [] });
            } else {
                const historyItem = gameHistory[index];
                setPosition(historyItem.position);
                setCapturedPieces(historyItem.capturedPieces);
            }
        }
    }, [gameHistory, game]);

    const startReview = useCallback(() => {
        setIsReviewing(true);
        navigateHistory(-1);
    }, [navigateHistory]);

    const stopReview = useCallback(() => {
        setIsReviewing(false);
        navigateHistory(gameHistory.length - 1);
    }, [navigateHistory, gameHistory]);

    return (
        <GameContext.Provider
            value={{
                game,
                position,
                selectedSquare,
                moves,
                timeWhite,
                timeBlack,
                capturedPieces,
                makeMove,
                setSelectedSquare,
                getLegalMoves,
                currentTurn,
                lastMove,
                gameMode,
                setGameMode,
                isGameStarted,
                gameHistory,
                currentHistoryIndex,
                isReviewing,
                navigateHistory,
                startReview,
                stopReview,
            }}
        >
            {children}
        </GameContext.Provider>
    );
}

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error("useGame must be used within a GameProvider");
    }
    return context;
};
