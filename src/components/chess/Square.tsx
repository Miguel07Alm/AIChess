"use client";
import { useRef, useEffect, useState } from 'react'
import { Square as ChessSquare, Piece, Color } from 'chess.js'
import Image from 'next/image'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { motion } from 'framer-motion'

interface SquareProps {
  piece: Piece | null
  isBlack: boolean
  square: ChessSquare
  isSelected: boolean
  isLegalMove: boolean
  onSelect: (square: ChessSquare | null) => void
  onMove: (from: ChessSquare, to: ChessSquare) => boolean
  turn: Color
  coord: [number, number]
  selectedSquare: ChessSquare | null // Añadido este prop
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
  selectedSquare  // Añadido a la desestructuración
}: SquareProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const pieceRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Haptic feedback function
  const vibrate = () => {
    if (typeof window !== 'undefined' && 'navigator' in window) {
      try {
        navigator.vibrate?.(50)
      } catch (e) {
        // Ignore if vibration is not supported
      }
    }
  }

  // Set up draggable behavior - ahora en el div de la pieza
  useEffect(() => {
    if (!pieceRef.current || !piece || piece.color !== turn) {
      return;
    }

    const cleanup = draggable({
      element: pieceRef.current,
      getInitialData: () => ({ square }),
      onDragStart: () => {
        setIsDragging(true)
        vibrate()
        onSelect(square);
      },
      onDrop: () => {
        setIsDragging(false)
      },
    });

    return () => cleanup();
  }, [piece, square, turn, onSelect]);

  // Touch event handlers
  useEffect(() => {
    const element = pieceRef.current
    if (!element || !piece || piece.color !== turn) return

    let startPos = { x: 0, y: 0 }
    let originalTransform = ''
    let moving = false

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      vibrate()
      moving = true
      startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      originalTransform = window.getComputedStyle(element).transform
      onSelect(square)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!moving || e.touches.length !== 1) return
      const touch = e.touches[0]
      const deltaX = touch.clientX - startPos.x
      const deltaY = touch.clientY - startPos.y
      element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`
      e.preventDefault()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!moving) return
      moving = false
      element.style.transform = originalTransform
      
      // Find the square under the touch point
      const touch = e.changedTouches[0]
      const target = document.elementFromPoint(touch.clientX, touch.clientY)
      const targetSquare = target?.closest('[data-square]')
      if (targetSquare) {
        const toSquare = targetSquare.getAttribute('data-square') as ChessSquare
        if (isLegalMove) {
          onMove(square, toSquare)
          vibrate()
        }
      }
    }

    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [piece, square, turn, onSelect, onMove, isLegalMove])

  // Set up drop target behavior - se mantiene en el square
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const cleanup = dropTargetForElements({
      element: ref.current,
      onDragEnter: () => {
        if (isLegalMove) {
          ref.current?.classList.add('bg-blue-400/20');
        }
      },
      onDragLeave: () => {
        ref.current?.classList.remove('bg-blue-400/20');
      },
      onDrop: (args) => {
        const sourceSquare = args.source.data?.square as ChessSquare;
        if (sourceSquare && isLegalMove) {
          onMove(sourceSquare, square);
        }
        ref.current?.classList.remove('bg-blue-400/20');
      }
    });

    return () => cleanup();
  }, [square, isLegalMove, onMove]);

  const handleClick = () => {
    if (isSelected) {
      onSelect(null)
    } else if (piece && piece.color === turn) {
      onSelect(square)
    } else if (isLegalMove && selectedSquare) {  // Añadido check de selectedSquare
      onMove(selectedSquare, square)
    }
  }

  const getPieceImage = () => {
    if (!piece) return null
    
    return `/${piece.color}_${piece.type}.svg`
  }

  const isCapture = isLegalMove && piece;

  return (
    <div
      ref={ref}
      data-square={square}
      onClick={handleClick}
      className={`
        aspect-square w-full flex items-center justify-center relative
        ${isBlack ? 'bg-[#B58863]' : 'bg-[#F0D9B5]'}
        ${isSelected ? 'ring-2 ring-[#007AFF]/50' : ''}
        ${isLegalMove && !isCapture ? 'after:absolute after:w-[25%] after:h-[25%] after:bg-[#007AFF] after:mix-blend-multiply after:rounded-full after:opacity-40' : ''}
        ${isCapture ? 'ring-2 ring-red-500/50' : ''}
        transition-all duration-200
        cursor-pointer
        group
      `}
    >
      {piece && !isDragging && (
        <motion.div 
          ref={pieceRef}
          initial={false}
          animate={{ scale: isSelected ? 1.1 : 1 }}
          whileHover={{ scale: piece.color === turn ? 1.05 : 1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className={`
            w-[70%] h-[70%] relative
            transition-transform duration-300
            ${piece.color === turn ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
            ${isCapture ? 'ring-4 ring-red-500/30 rounded-full' : ''}
          `}
          data-draggable={piece.color === turn ? 'true' : undefined}
        >
          <Image
            src={getPieceImage() || ''}
            alt={`${piece.color} ${piece.type}`}
            fill
            className={`
              object-contain
              select-none
              pointer-events-none
              transition-[filter,transform]
              duration-200
              ${piece.color === 'b' 
                ? 'drop-shadow-[0_2px_3px_rgba(255,255,255,0.25)]' 
                : 'drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]'
              }
              ${isSelected 
                ? piece.color === 'b'
                  ? 'drop-shadow-[0_4px_6px_rgba(255,255,255,0.35)]'
                  : 'drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]'
                : ''
              }
            `}
            priority
            draggable={false}
          />
        </motion.div>
      )}
      
      <div className={`
        absolute bottom-1 left-1
        text-[0.6rem] font-medium
        transition-opacity duration-200
        ${isBlack ? 'text-[#F0D9B5]' : 'text-[#B58863]'}
        opacity-30 group-hover:opacity-50        pointer-events-none select-none
      `}>
        {square}
      </div>

      {/* Highlight effect for legal moves */}
      {isLegalMove && (
        <div className={`
          absolute inset-0 
          ${isCapture 
            ? 'bg-red-500 opacity-5 hover:opacity-20' 
            : 'bg-[#007AFF] opacity-0 hover:opacity-10'
          } 
          transition-opacity duration-200 
          rounded-sm 
          pointer-events-none
        `} />
      )}
    </div>
  )
}
