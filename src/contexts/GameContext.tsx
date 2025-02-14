"use client";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    Dispatch,
} from "react";
import { Chess, Square, Move, PieceSymbol, Color, Piece } from "chess.js";
import { useRTC } from "./RTCContext";
import { toast } from "sonner";
import { ChatMessage, GameMove } from "@/types/webrtc";
import { experimental_useObject as useObject } from "ai/react";
import { AIChatPayload, ChessSchema, ChessSchemaPayload } from "@/types/chat";
import { AIStateManager, createAIStateManager, createCleanAIState } from "@/app/lib/ai-state";

type BoardPosition = (Piece | null)[][];

interface GameContextType {
    game: Chess;
    position: BoardPosition;
    selectedSquare: Square | null;
    moves: Move[];
    timeWhite: number;
    timeBlack: number;
    capturedPieces: { white: PieceSymbol[]; black: PieceSymbol[] };
    makeMove: (from: Square, to: Square, isRemoteMove?: boolean) => Promise<boolean>;
    setSelectedSquare: (square: Square | null) => void;
    getLegalMoves: (square: Square) => Square[];
    currentTurn: () => Color;
    lastMove: { from: Square; to: Square } | null;
    gameMode: "ai" | "online" | "practice" | null;
    setGameMode: (mode: "ai" | "online" | "practice" | null) => void;
    isGameStarted: boolean;
    setIsGameStarted: (started: boolean) => void;
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
    isHost: boolean;
    playerColor: "w" | "b" | null;
    boardOrientation: "white" | "black";
    messages: ChatMessage[];
    setMessages: Dispatch<ChatMessage[]>;
    aiThinking: boolean;
    sendAIMessage: (messages: ChatMessage[]) => Promise<void>;
    setGameover: Dispatch<boolean>;
    gameOver: boolean;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
    const [gameMode, setGameMode] = useState<"ai" | "online" | "practice" | null>(null);
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
    const [gameHistory, setGameHistory] = useState<
        GameContextType["gameHistory"]
    >([]);
    const [aiState] = useState(() => createAIStateManager());
    const [aiStateData, setAiStateData] = useState(createCleanAIState());
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
    const [isReviewing, setIsReviewing] = useState(false);

    const {
        setMessageHandlers,
        isHost: rtcIsHost,
        playerColor: rtcPlayerColor,
        isConnected,
        sendTimeSync,
    } = useRTC();
    const [isHost, setIsHost] = useState(false);
    const [playerColor, setPlayerColor] = useState<"w" | "b" | null>(null);
    const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
        "white"
    );
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [aiThinking, setAiThinking] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    // Sincronizar con RTCContext
    useEffect(() => {
        setIsHost(rtcIsHost);
        if (rtcPlayerColor) {
            setPlayerColor(rtcPlayerColor);
            setBoardOrientation(rtcPlayerColor === "w" ? "white" : "black");
        }
    }, [rtcIsHost, rtcPlayerColor]);

    // Actualizar la orientación del tablero cuando cambie el color del jugador o el modo de juego
    useEffect(() => {
        if (gameMode === "ai") {
            setBoardOrientation("white"); // Siempre blancas en modo AI
        } else if (playerColor) {
            setBoardOrientation(playerColor === "w" ? "white" : "black");
        }
    }, [playerColor, gameMode]);

    // Modificar el efecto del timer
    useEffect(() => {
        const shouldRunTimer =
            isGameStarted &&
            (gameMode === "ai" || gameMode === "practice" || (gameMode === "online" && isConnected));

        if (!shouldRunTimer) return;

        const lastUpdate = { current: Date.now() };
        const timer = setInterval(() => {
            if (!game.isGameOver() && timeWhite > 0 && timeBlack > 0) {
                const now = Date.now();
                const elapsed = Math.floor((now - lastUpdate.current) / 1000);
                lastUpdate.current = now;

                if (elapsed > 0) {
                    if (game.turn() === "w") {
                        const newTime = Math.max(0, timeWhite - elapsed);
                        setTimeWhite(newTime);
                        // Solo el host sincroniza los tiempos
                        if (gameMode === "online" && rtcIsHost) {
                            sendTimeSync(newTime, timeBlack);
                        }
                    } else {
                        const newTime = Math.max(0, timeBlack - elapsed);
                        setTimeBlack(newTime);
                        // Solo el host sincroniza los tiempos
                        if (gameMode === "online" && rtcIsHost) {
                            sendTimeSync(timeWhite, newTime);
                        }
                    }
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [game, timeWhite, timeBlack, isGameStarted, gameMode, isConnected, rtcIsHost, sendTimeSync]);

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

    const makeAIMove = useCallback(async () => {
        const moves = game.moves({ verbose: true });
        if (moves.length > 0) {
            try {
                console.log('[AI] Getting move suggestion...');
                const boardState = game.board()
                    .map((row) =>
                        row
                            .map((piece) =>
                                piece ? `${piece.color}${piece.type}` : "--"
                            )
                            .join(" ")
                    )
                    .join("\n");

                // Crear una lista de movimientos legibles
                const movesList = moves
                    .map(
                        (move, index) =>
                            `${index}: ${move.color} ${move.piece} ${
                                move.from
                            }->${move.to}${
                                move.captured
                                    ? ` captures ${move.captured}`
                                    : ""
                            }`
                    )
                    .join("\n");
                const chatPayload: ChessSchemaPayload = {
                    moves: movesList,
                    playerColor: playerColor as Color,
                    currentBoard: boardState,
                    lastMove: lastMove ? `${lastMove.from}->${lastMove.to}` : null,
                    aiStateData: aiState.toJSON() 
                };

                const res = await fetch("/api/chess/move", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(chatPayload),
                });
                const result: {
                    chosenMove: number;
                } = await res.json();
                console.log("[AI] makeAIMove ~ result:", result)

                if (result.chosenMove >= 0 && result.chosenMove < moves.length) {
                    const selectedMove = moves[result.chosenMove];
                    console.log('[AI] Selected move:', selectedMove);

                    if (selectedMove.from && selectedMove.to) {
                        const moveResult = game.move({
                            from: selectedMove.from as Square,
                            to: selectedMove.to as Square,
                            promotion: "q",
                        });

                        if (moveResult) {
                            setPosition(game.board());
                            setMoves(game.history({ verbose: true }));
                            handleCapture(moveResult);
                            setSelectedSquare(null);
                            setLastMove({
                                from: selectedMove.from as Square,
                                to: selectedMove.to as Square,
                            });
                            setGameHistory((prev) => [
                                ...prev,
                                {
                                    position: game.board(),
                                    move: moveResult,
                                    capturedPieces: { ...capturedPieces },
                                },
                            ]);
                            return true;
                        }
                    }
                }
                throw new Error('Invalid AI move');
            } catch (error) {
                console.error('[AI] Error making move:', error);
                // Fallback a movimiento aleatorio
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                console.log('[AI] Using fallback random move:', randomMove);
                const moveResult = game.move({
                    from: randomMove.from as Square,
                    to: randomMove.to as Square,
                    promotion: "q",
                });
                if (moveResult) {
                    setPosition(game.board());
                    setMoves(game.history({ verbose: true }));
                    handleCapture(moveResult);
                    setSelectedSquare(null);
                    setLastMove({
                        from: randomMove.from as Square,
                        to: randomMove.to as Square,
                    });
                    setGameHistory((prev) => [
                        ...prev,
                        {
                            position: game.board(),
                            move: moveResult,
                            capturedPieces: { ...capturedPieces },
                        },
                    ]);
                    return true;
                }
            }
        }
        return false;
    }, [game, handleCapture, capturedPieces]);

    // Modificar makeMove para manejar mejor los movimientos remotos
    const makeMove = useCallback(
        async (from: Square, to: Square, isRemoteMove: boolean = false) => {
            try {
                console.log("[Game] Attempting move:", {
                    from,
                    to,
                    playerColor,
                    currentTurn: game.turn(),
                    isRemoteMove,
                    boardOrientation,
                });

                // Solo verificar turno para movimientos locales
                if (
                    !isRemoteMove &&
                    gameMode === "online" &&
                    game.turn() !== playerColor
                ) {
                    console.warn("[Game] Not your turn");
                    return false;
                }

                const moveResult = game.move({ from, to, promotion: "q" });
                if (moveResult) {
                    // Asegurarse de que la posición se actualice correctamente
                    const newPosition = game.board();
                    console.log("[Game] Move successful:", {
                        from,
                        to,
                        newPosition: newPosition.map((row) =>
                            row.map((piece) => piece?.type || null)
                        ),
                    });

                    setPosition(newPosition);
                    setMoves(game.history({ verbose: true }));
                    handleCapture(moveResult);
                    setSelectedSquare(null);
                    setLastMove({ from, to });

                    setGameHistory((prev) => [
                        ...prev,
                        {
                            position: newPosition,
                            move: moveResult,
                            capturedPieces: { ...capturedPieces },
                        },
                    ]);

                    // Sincronizar tiempos después de cada movimiento si somos el host
                    if (gameMode === "online" && rtcIsHost) {
                        sendTimeSync(timeWhite, timeBlack);
                    }

                    // AI move if in AI mode
                    if (gameMode === "ai" && !game.isGameOver()) {
                        const boardState = game
                            .board()
                            .map((row) =>
                                row
                                    .map((piece) =>
                                        piece
                                            ? `${piece.color}${piece.type}`
                                            : "--"
                                    )
                                    .join(" ")
                            )
                            .join("\n");

                        // Crear una lista de movimientos legibles
                        const movesList = moves
                            .map(
                                (move, index) =>
                                    `${index}: ${move.color} ${move.piece} ${
                                        move.from
                                    }->${move.to}${
                                        move.captured
                                            ? ` captures ${move.captured}`
                                            : ""
                                    }`
                            )
                            .join("\n");
                        const chatPayload: ChessSchemaPayload = {
                            moves: movesList,
                            playerColor: playerColor as Color,
                            currentBoard: boardState,
                            lastMove: lastMove ? `${lastMove.from}->${lastMove.to}` : null,
                            aiStateData: aiState.toJSON() // Usar estado serializado
                        };
                        const res = await fetch("/api/chess/analysis", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(chatPayload),
                        });
                        const {willTalk, comment: AIComment, updatedState} = await res.json();
                        console.log("🚀 ~ willTalk:", willTalk)
                        if (willTalk && AIComment) {
                            setMessages([
                                ...messages,
                                {
                                    text: AIComment,
                                    sender: "b",
                                    timestamp: Date.now(),
                                    isSystem: true,
                                },
                            ]);
                        }
                        // Actualizar el estado local con la respuesta del servidor
                        if (updatedState) {
                            aiState.loadState(updatedState);
                            setAiStateData(updatedState);
                        }
                        // Usar setTimeout para dar tiempo a que la UI se actualice
                        setTimeout(async () => {
                            const aiMoveSuccess = await makeAIMove();
                            if (!aiMoveSuccess) {
                                toast.error('AI failed to make a move');
                            }
                        }, 500);
                    }

                    return true;
                }
            } catch (e) {
                console.error("[Game] Move error:", e);
            }
            return false;
        },
        [
            game,
            handleCapture,
            gameMode,
            capturedPieces,
            playerColor,
            boardOrientation,
            rtcIsHost,
            sendTimeSync,
            timeWhite,
            timeBlack,
            makeAIMove
        ]
    );

    // Añadir función para el chat con la IA
    const sendAIMessage = useCallback(async (messages: ChatMessage[]) => {
        if (gameMode !== "ai") return;
        
        try {
            setAiThinking(true);
            
            // Preparar el historial del chat (últimos 5 mensajes)
            const recentMessages = messages.slice(-5).map(m => 
                `${m.sender ? 'Player' : 'AI'}: ${m.text}`
            ).join('\n');

            // Preparar el estado actual del tablero
            const boardState = game.board()
                .map(row => row.map(piece => piece ? `${piece.color}${piece.type}` : '--').join(' '))
                .join('\n');

            // Obtener el último movimiento en notación algebraica
            const lastMoveStr = moves.length > 0 ? moves[moves.length - 1].san : null;
            const payloadChat: AIChatPayload = {
                history: recentMessages,
                currentBoard: boardState,
                lastMove: lastMoveStr,
                playerColor: playerColor || "w",
                aiStateData: aiState.toJSON(),
            };
            const res = await fetch("/api/chess/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payloadChat),
            });
            const {text: AIText}: {
                text: string;
            } = await res.json();

            // Añadir mensaje de la IA al chat
            setMessages([
                ...messages,
                {
                    text: AIText,
                    sender: 'b',
                    timestamp: Date.now(),
                    isSystem: false,
                },
            ]);
        } catch (error) {
            console.error('[AI] Chat error:', error);
            toast.error('Failed to get AI response');
        } finally {
            setAiThinking(false);
        }
    }, [gameMode, messages, game, moves, playerColor]);

    // Modificar setupMessageHandlers para ser más robusto
    const setupMessageHandlers = useCallback(() => {
        console.log("[Game] Setting up message handlers:", {
            isConnected,
            playerColor,
            gameMode,
            isHost: rtcIsHost
        });

        if (!gameMode || gameMode !== "online") return;

        const handlers = {
            onMove: (move: GameMove) => {
                console.log("[Game] Received move:", {
                    move,
                    playerColor,
                    currentTurn: game.turn(),
                });
                makeMove(move.from, move.to, true);
            },
            onGameStart: () => {
                console.log("[Game] Received game-start signal");
                game.reset();
                setPosition(game.board());
                setMoves([]);
                setCapturedPieces({ white: [], black: [] });
                setTimeWhite(600);
                setTimeBlack(600);
                setGameHistory([]);
                setCurrentHistoryIndex(-1);
                setIsReviewing(false);
                setIsGameStarted(true);
                aiState.clearAllGames();
            },
            onOpponentDisconnect: () => {
                console.log("[Game] Opponent disconnected");
                toast.error("Opponent left the game", {
                    duration: 5000,
                });
                // Primero limpiar el estado del juego
                game.reset();
                setPosition(game.board());
                setMoves([]);
                setCapturedPieces({ white: [], black: [] });
                setTimeWhite(600);
                setTimeBlack(600);
                setGameHistory([]);
                setCurrentHistoryIndex(-1);
                setIsReviewing(false);
                setIsGameStarted(false);
                // Finalmente cambiar el modo
                setGameMode(null);
                aiState.clearAllGames();
            },
            onChatMessage: (message: ChatMessage) => {
                console.log("[Game] Received chat message:", message);
                setMessages((prev) => [...prev, message]);
            },
            onTimeSync: (tw: number, tb: number) => {
                if (!rtcIsHost) {
                    setTimeWhite(tw);
                    setTimeBlack(tb);
                }
            },
            onConnectionEstablished: () => {
                console.log("[Game] Both players connected");
                setIsGameStarted(true);
                setMessages(prev => [
                    ...prev,
                    {
                        text: "Both players are connected. Game started!",
                        sender: null,
                        timestamp: Date.now(),
                        isSystem: true
                    }
                ]);
            }
        };

        setMessageHandlers(handlers);
    }, [game, playerColor, rtcIsHost, gameMode, isConnected, makeMove]);

    // Efecto unificado para configurar handlers
    useEffect(() => {
        if (gameMode === "online") {
            setupMessageHandlers();
        }
    }, [gameMode, playerColor, isConnected, setupMessageHandlers]);

    // Reset effect cuando cambia el modo de juego
    useEffect(() => {
        // Reset game state
        game.reset();
        aiState.clearAllGames();
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
        setMessages([]); // Reset messages también

        if (gameMode === "ai") {
            setBoardOrientation("white");
            setPlayerColor("w");
            setIsGameStarted(true);
        } else if (gameMode === "practice") {
            setBoardOrientation("white");
            setPlayerColor("w");
            setIsGameStarted(true);
        } else if (gameMode === null) {
            setPlayerColor(null);
            setBoardOrientation("white");
            setMessageHandlers({}); // Limpiar handlers cuando se sale del modo online
        }
    }, [gameMode]);

    // Add effect to monitor game start state
    useEffect(() => {
        if (gameMode === "online" && isGameStarted) {
            console.log("[Game] Online game started:", {
                isHost,
                playerColor,
                currentTurn: game.turn(),
            });
        }
    }, [gameMode, isGameStarted, isHost, playerColor, game]);

    // Añadir efecto para manejar la limpieza del estado
    useEffect(() => {
        return () => {
            if (gameMode === 'online') {
                setGameMode(null);
                setIsGameStarted(false);
                game.reset();
                setPosition(game.board());
                setMoves([]);
                setCapturedPieces({ white: [], black: [] });
                setTimeWhite(600);
                setTimeBlack(600);
                setGameHistory([]);
                setCurrentHistoryIndex(-1);
                setIsReviewing(false);
            }
        };
    }, [gameMode]);

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

    const navigateHistory = useCallback(
        (index: number) => {
            if (index >= -1 && index < gameHistory.length) {
                setCurrentHistoryIndex(index);
                if (index !== -1) {
                    const historyItem = gameHistory[index];
                    setPosition(historyItem.position);
                    setCapturedPieces(historyItem.capturedPieces);
                }
            }
        },
        [gameHistory]
    );

    const startReview = useCallback(() => {
        setIsReviewing(true);
        navigateHistory(gameHistory.length - 1);
    }, [setIsReviewing, gameHistory, navigateHistory]);

    const stopReview = useCallback(() => {
        setIsReviewing(false);
        navigateHistory(gameHistory.length - 1);
    }, [navigateHistory, gameHistory, setIsReviewing]);

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
                setIsGameStarted,
                gameHistory,
                currentHistoryIndex,
                isReviewing,
                navigateHistory,
                startReview,
                stopReview,
                isHost,
                playerColor,
                boardOrientation,
                messages,
                setMessages,
                aiThinking,
                sendAIMessage,
                setGameover: setGameOver,
                gameOver
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
