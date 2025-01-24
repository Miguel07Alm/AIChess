"use client";
import { useRef, useEffect, useState } from "react";
import { Square as ChessSquare, Piece, Color } from "chess.js";
import Image from "next/image";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { motion } from "framer-motion";
import { useRTC } from "@/contexts/RTCContext";
import { useGame } from "@/contexts/GameContext";

// DropIndicator para indicar visualmente la posibilidad de soltar una pieza
const DropIndicator = ({ isCapture }: { isCapture: boolean }) => (
    <div
        className={`
        absolute inset-0 rounded-sm
        ${
            isCapture
                ? "bg-gradient-to-b from-red-500/10 via-red-500/5 to-transparent"
                : "bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent"
        }
        opacity-0 group-hover:opacity-100
        transition-all duration-300
        pointer-events-none
        backdrop-blur-[2px]
        border-2 border-transparent
        ${
            isCapture
                ? "group-hover:border-red-500/30"
                : "group-hover:border-emerald-500/30"
        }
    `}
    >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--cursor-x)_var(--cursor-y),rgba(255,255,255,0.15),transparent_50%)]" />
    </div>
);

interface SquareProps {
    piece: Piece | null;
    isBlack: boolean;
    square: ChessSquare;
    isSelected: boolean;
    isLegalMove: boolean;
    onSelect: (square: ChessSquare | null) => void;
    onMove: (from: ChessSquare, to: ChessSquare) => Promise<boolean>;
    turn: Color;
    coord: [number, number];
    selectedSquare: ChessSquare | null;
    lastMove: { from: ChessSquare; to: ChessSquare } | null;
}

// Vibración sutil para feedback táctil
const vibrate = (pattern: number | number[]) => {
    if (typeof window !== "undefined" && "navigator" in window) {
        try {
            navigator.vibrate?.(pattern);
        } catch (e) {
            // Ignorar si la vibración no es compatible
        }
    }
};

export const Square = ({
    piece,
    isBlack,
    square,
    isSelected,
    isLegalMove,
    onSelect,
    onMove,
    turn,
    selectedSquare,
    lastMove,
}: SquareProps) => {
    const { playerColor } = useRTC();
    const { gameMode } = useGame();
    const ref = useRef<HTMLDivElement>(null);
    const pieceRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: "50%", y: "50%" });
    const ghostRef = useRef<HTMLDivElement | null>(null);
    const tapTimeoutRef = useRef<NodeJS.Timeout>(undefined);

    const handleClick = async () => {
        if (playerColor !== turn && gameMode === "online") return;
        console.log("handleClick for square:", square); // ADDED: Log to check if handleClick is executing
        if (isSelected) {
            onSelect(null);
        } else if (piece && piece.color === turn) {
            onSelect(square);
        } else if (isLegalMove && selectedSquare) {
            await onMove(selectedSquare, square);
        }
    };

    // Drag para PC y Movil unificado con draggable de Atlaskit
    useEffect(() => {
        const element = pieceRef.current;
        if (!element || !piece || piece.color !== turn) return;

        const cleanup = draggable({
            element,
            getInitialData: () => ({ square }), // Pasar la square al iniciar el drag
            onGenerateDragPreview: ({ nativeSetDragImage }) => {
                if (!element || !nativeSetDragImage) return;

                const ghost = element.cloneNode(true) as HTMLDivElement;
                ghost.style.cssText = `
                    width: ${element.offsetWidth}px;
                    height: ${element.offsetHeight}px;
                    transform: scale(1.1);
                    opacity: 0.9;
                    pointer-events: none;
                    position: fixed;
                    z-index: 9999;
                    transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
                `;
                document.body.appendChild(ghost);
                ghostRef.current = ghost;
                nativeSetDragImage(
                    ghost,
                    element.offsetWidth / 2,
                    element.offsetHeight / 2
                );

                return () => {
                    if (ghostRef.current) {
                        ghostRef.current.remove();
                        ghostRef.current = null;
                    }
                };
            },
            onDragStart: () => {
                if (playerColor !== turn && gameMode === "online") return;
                setIsDragging(true);
                vibrate(50);
                onSelect(square);
            },
            onDrag: () => {
                // Puedes agregar feedback visual durante el drag si es necesario
            },
            onDrop: () => {
                if (playerColor !== turn && gameMode === "online") return;
                requestAnimationFrame(() => {
                    setIsDragging(false);
                    if (ghostRef.current) {
                        ghostRef.current.remove();
                        ghostRef.current = null;
                    }
                });
            },
        });

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            if (playerColor !== turn && gameMode === "online") return;
            // e.preventDefault(); // COMMENTED OUT: Let's see if this is blocking tap
        };

        const handleTouchEnd = async (e: TouchEvent) => {
            // No action needed here for touch end in terms of drag cancellation,
            // as `draggable` handles the drop or cancellation.
        };

        element.addEventListener("touchstart", handleTouchStart, {
            passive: false, // Keep passive: false for now, might be needed for drag
        });
        element.addEventListener("touchend", handleTouchEnd);

        return () => {
            cleanup();
            element.removeEventListener("touchstart", handleTouchStart);
            element.removeEventListener("touchend", handleTouchEnd);
        };
    }, [piece, square, turn, onSelect, onMove]);

    // Drop target permanece igual
    useEffect(() => {
        if (!ref.current) {
            return;
        }

        const cleanup = dropTargetForElements({
            element: ref.current,
            onDragEnter: () => {
                if (playerColor !== turn && gameMode === "online") return;
                if (isLegalMove) {
                    ref.current?.classList.add("bg-blue-400/20");
                }
            },
            onDragLeave: () => {
                if (playerColor !== turn && gameMode === "online") return;
                ref.current?.classList.remove("bg-blue-400/20");
            },
            onDrop: async (args) => {
                if (playerColor !== turn && gameMode === "online") return;
                const sourceSquare = args.source.data?.square as ChessSquare;
                if (sourceSquare && isLegalMove) {
                    await onMove(sourceSquare, square);
                }
                ref.current?.classList.remove("bg-blue-400/20");
            },
        });

        return () => cleanup();
    }, [square, isLegalMove, onMove]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isLegalMove) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        e.currentTarget.style.setProperty("--cursor-x", `${x}%`);
        e.currentTarget.style.setProperty("--cursor-y", `${y}%`);
    };

    const getPieceImage = () => {
        if (!piece) return null;
        return `/${piece.color}_${piece.type}.svg`;
    };

    const isCapture = isLegalMove && piece;

    const handleTap = () => {
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
        }
        tapTimeoutRef.current = setTimeout(() => {
            handleClick();
        }, 200); // Simple tap ahora solo ejecuta handleClick después de 200ms
    };

    // Cleanup on unmount - important for removing ghost element if component unmounts during drag
    useEffect(() => {
        return () => {
            if (tapTimeoutRef.current) {
                clearTimeout(tapTimeoutRef.current);
            }
            if (ghostRef.current) {
                ghostRef.current.remove();
                ghostRef.current = null;
            }
        };
    }, []);

    return (
        <div
            ref={ref}
            data-square={square}
            onClick={handleClick} // Keep onClick for tap handling
            onMouseMove={handleMouseMove}
            className={`
                aspect-square w-full h-full relative
                flex items-center justify-center
                transition-all duration-300 ease-out
                cursor-pointer
                group
                overflow-hidden
                ${isBlack ? "bg-[#B58863]" : "bg-[#F0D9B5]"}
                ${
                    isLegalMove
                        ? "hover:ring-2 hover:ring-emerald-500/20 hover:shadow-lg"
                        : ""
                }
                ${isSelected ? "ring-2 ring-blue-500/30" : ""}
            `}
            style={
                {
                    "--cursor-x": cursorPos.x,
                    "--cursor-y": cursorPos.y,
                } as React.CSSProperties
            }
        >
            {piece && !isDragging && (
                <motion.div
                    initial={false}
                    ref={pieceRef}
                    animate={{
                        scale: isSelected ? 1.1 : 1,
                        filter: isSelected
                            ? "brightness(1.1)"
                            : "brightness(1)",
                        y: isSelected ? -2 : 0,
                    }}
                    whileHover={{
                        scale: piece.color === turn ? 1.08 : 1,
                        filter:
                            piece.color === turn
                                ? "brightness(1.08)"
                                : "brightness(1)",
                        y: piece.color === turn ? -1 : 0,
                    }}
                    whileTap={{
                        scale: 0.95,
                        y: 2,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                        mass: 0.8,
                    }}
                    className={`
                        w-[80%] h-[80%] relative
                        transition-all duration-200
                        ${
                            piece.color === turn
                                ? "cursor-grab active:cursor-grabbing"
                                : "cursor-default"
                        }
                        ${
                            isCapture
                                ? "ring-4 ring-red-500/20 rounded-full"
                                : ""
                        }
                        // touch-action: none; // COMMENTED OUT: Let's see if this helps tap
                    `}
                >
                    <Image
                        src={getPieceImage() || ""}
                        alt={`${piece.color} ${piece.type}`}
                        fill
                        className={`
                            object-contain select-none pointer-events-none
                            transition-all duration-300
                            ${
                                piece.color === "b"
                                    ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                                    : "drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                            }
                            ${
                                isSelected
                                    ? piece.color === "b"
                                        ? "drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
                                        : "drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
                                    : ""
                            }
                        `}
                        priority
                        draggable={false}
                    />
                </motion.div>
            )}

            {/* Coordenadas mejoradas */}
            <div
                className={`
                absolute bottom-1 left-1
                text-[0.65rem] font-medium
                transition-all duration-200
                ${isBlack ? "text-[#F0D9B5]" : "text-[#B58863]"}
                opacity-0 group-hover:opacity-50
                pointer-events-none select-none
                font-mono
            `}
            >
                {square}
            </div>

            {/* Indicador de último movimiento */}
            {lastMove &&
                (square === lastMove.from || square === lastMove.to) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-yellow-400/20 dark:bg-yellow-300/25"
                    />
                )}

            {/* Indicador de movimiento legal */}
            {isLegalMove && !isDragging && (
                <DropIndicator isCapture={!!piece} />
            )}

            {/* Efecto de selección */}
            {(isSelected || isLegalMove) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 dark:from-emerald-400/15 dark:to-emerald-500/15"
                />
            )}

            {/* Efecto de hover */}
            <div
                className={`
                absolute inset-0
                bg-black/0 hover:bg-black/5
                dark:bg-white/0 dark:hover:bg-white/5
                transition-colors duration-200
                pointer-events-none
            `}
            />
        </div>
    );
};
