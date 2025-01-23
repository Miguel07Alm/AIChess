"use client";
import { useRef, useEffect, useState } from "react";
import { Square as ChessSquare, Piece, Color } from "chess.js";
import Image from "next/image";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { motion } from "framer-motion";
import { useRTC } from "@/contexts/RTCContext";
import { useGame } from "@/contexts/GameContext";

const DropIndicator = ({ isCapture }: { isCapture: boolean }) => (
    <div className={`
        absolute inset-0 rounded-sm
        ${isCapture 
            ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 dark:from-red-500/30 dark:to-red-600/30' 
            : 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 dark:from-emerald-500/30 dark:to-emerald-600/30'
        }
        opacity-0 group-hover:opacity-100
        transition-all duration-200
        pointer-events-none
        backdrop-blur-[1px]
        border-2 border-transparent
        ${isCapture 
            ? 'group-hover:border-red-500/40' 
            : 'group-hover:border-emerald-500/40'
        }
    `}>
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
    const {gameMode} = useGame();
    const ref = useRef<HTMLDivElement>(null);
    const pieceRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: '50%', y: '50%' });
    const touchTimeoutRef = useRef<NodeJS.Timeout>(undefined);
    const [isTouching, setIsTouching] = useState(false);

    // Haptic feedback function
    const vibrate = () => {
        if (typeof window !== "undefined" && "navigator" in window) {
            try {
                navigator.vibrate?.(50);
            } catch (e) {
                // Ignore if vibration is not supported
            }
        }
    };
    // Set up draggable behavior - ahora en el div de la pieza
    useEffect(() => {
        if (!pieceRef.current || !piece || piece.color !== turn) {
            return;
        }

        const cleanup = draggable({
            element: pieceRef.current,
            getInitialData: () => ({ square }),
            onDragStart: () => {
                if (playerColor !== turn && gameMode === "online") return;;
                setIsDragging(true);
                vibrate();
                onSelect(square);
            },
            onDrop: () => {
                if (playerColor !== turn && gameMode === "online") return;;
                setIsDragging(false);
            },
        });

        return () => cleanup();
    }, [piece, square, turn, onSelect]);
    const handleClick = async () => {
        if (playerColor !== turn && gameMode === "online") return;
        if (isSelected) {
            onSelect(null);
        } else if (piece && piece.color === turn) {
            onSelect(square);
        } else if (isLegalMove && selectedSquare) {
            // Añadido check de selectedSquare
            await onMove(selectedSquare, square);
        }
    };
    // Touch event handlers
    useEffect(() => {
        const element = pieceRef.current;
        if (!element || !piece || piece.color !== turn) return;

        let startPos = { x: 0, y: 0 };
        let originalTransform = "";
        let touchStartTime = 0;
        let hasMoved = false;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            if (playerColor !== turn && gameMode === "online") return;
            
            touchStartTime = Date.now();
            hasMoved = false;
            setIsTouching(true);

            startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            originalTransform = window.getComputedStyle(element).transform;

            // Iniciar temporizador para detectar toque largo
            touchTimeoutRef.current = setTimeout(() => {
                if (!hasMoved) {
                    vibrate();
                    onSelect(square);
                }
            }, 50);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isTouching || e.touches.length !== 1) return;
            if (playerColor !== turn && gameMode === "online") return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - startPos.x;
            const deltaY = touch.clientY - startPos.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Si el movimiento es significativo, iniciamos el arrastre
            if (distance > 10) {
                hasMoved = true;
                clearTimeout(touchTimeoutRef.current);
                setIsDragging(true);
                element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
            }

            e.preventDefault();
        };

        const handleTouchEnd = async (e: TouchEvent) => {
            if (playerColor !== turn && gameMode === "online") return;
            
            setIsTouching(false);
            clearTimeout(touchTimeoutRef.current);

            if (hasMoved) {
                setIsDragging(false);
                element.style.transform = originalTransform;

                // Manejar el drop si hubo arrastre
                const touch = e.changedTouches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetSquare = target?.closest("[data-square]");
                if (targetSquare) {
                    const toSquare = targetSquare.getAttribute("data-square") as ChessSquare;
                    if (isLegalMove) {
                        await onMove(square, toSquare);
                        vibrate();
                    }
                }
            } else {
                // Si no hubo movimiento y fue un toque rápido, manejar como click
                const touchDuration = Date.now() - touchStartTime;
                if (touchDuration < 200) {
                    handleClick();
                }
            }
        };

        element.addEventListener("touchstart", handleTouchStart, { passive: false });
        element.addEventListener("touchmove", handleTouchMove, { passive: false });
        element.addEventListener("touchend", handleTouchEnd);

        return () => {
            clearTimeout(touchTimeoutRef.current);
            element.removeEventListener("touchstart", handleTouchStart);
            element.removeEventListener("touchmove", handleTouchMove);
            element.removeEventListener("touchend", handleTouchEnd);
        };
    }, [piece, square, turn, onSelect, onMove, isLegalMove, isTouching, handleClick]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearTimeout(touchTimeoutRef.current);
        };
    }, []);

    // Set up drop target behavior - se mantiene en el square
    useEffect(() => {
        if (!ref.current) {
            return;
        }

        const cleanup = dropTargetForElements({
            element: ref.current,
            onDragEnter: () => {
                if (playerColor !== turn && gameMode === "online") return;;
                if (isLegalMove) {
                    ref.current?.classList.add("bg-blue-400/20");
                }
            },
            onDragLeave: () => {
                if (playerColor !== turn && gameMode === "online") return;;
                ref.current?.classList.remove("bg-blue-400/20");
            },
            onDrop: async (args) => {
                if (playerColor !== turn && gameMode === "online") return;;
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
        e.currentTarget.style.setProperty('--cursor-x', `${x}%`);
        e.currentTarget.style.setProperty('--cursor-y', `${y}%`);
    };

    const getPieceImage = () => {
        if (!piece) return null;

        return `/${piece.color}_${piece.type}.svg`;
    };

    const isCapture = isLegalMove && piece;

    return (
        <div
            ref={ref}
            data-square={square}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            className={`
                aspect-square w-full relative
                flex items-center justify-center
                transition-all duration-200
                cursor-pointer
                group
                overflow-hidden
                ${isBlack ? "bg-[#B58863]" : "bg-[#F0D9B5]"}
                ${isLegalMove ? "hover:ring-2 hover:ring-emerald-500/20" : ""}
            `}
            style={{
                '--cursor-x': cursorPos.x,
                '--cursor-y': cursorPos.y,
            } as React.CSSProperties}
        >
            {piece && !isDragging && (
                <motion.div
                    initial={false}
                    ref={pieceRef}
                    animate={{ 
                        scale: isSelected ? 1.1 : 1,
                        filter: isSelected ? 'brightness(1.1)' : 'brightness(1)'
                    }}
                    whileHover={{ 
                        scale: piece.color === turn ? 1.05 : 1,
                        filter: piece.color === turn ? 'brightness(1.05)' : 'brightness(1)'
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 25,
                        mass: 0.5 
                    }}
                    className={`
                        w-[75%] h-[75%] relative
                        transition-all duration-300
                        ${piece.color === turn ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
                        ${isCapture ? "ring-4 ring-red-500/20 rounded-full" : ""}
                    `}
                    data-draggable={piece.color === turn ? "true" : undefined}
                >
                    <Image
                        src={getPieceImage() || ""}
                        alt={`${piece.color} ${piece.type}`}
                        fill
                        className={`
                            object-contain select-none pointer-events-none
                            transition-all duration-300
                            ${piece.color === "b"
                                ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                                : "drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                            }
                            ${isSelected
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

            {/* Coordenadas con mejor estilo */}
            <div className={`
                absolute bottom-0.5 left-0.5
                text-[0.6rem] font-medium
                transition-all duration-200
                ${isBlack ? "text-[#F0D9B5]" : "text-[#B58863]"}
                opacity-0 group-hover:opacity-40
                pointer-events-none select-none
            `}>
                {square}
            </div>

            {/* Indicador de movimiento legal mejorado */}
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
            <div className={`
                absolute inset-0
                bg-black/0 hover:bg-black/5
                dark:bg-white/0 dark:hover:bg-white/5
                transition-colors duration-200
                pointer-events-none
            `} />

            {/* Efecto de último movimiento */}
            {lastMove && (square === lastMove.from || square === lastMove.to) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-yellow-400/15 dark:bg-yellow-300/20"
                />
            )}
        </div>
    );
};
