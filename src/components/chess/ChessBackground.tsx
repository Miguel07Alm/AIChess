"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

export const ChessBackground = () => {
  const [pieces, setPieces] = useState<{ id: number; piece: string; color: 'w' | 'b'; x: number; y: number; }[]>([]);

  useEffect(() => {
    // Create 24 random pieces
    const newPieces = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      piece: ['p', 'n', 'b', 'r', 'q', 'k'][Math.floor(Math.random() * 6)],
      color: (Math.random() > 0.5 ? 'w' : 'b') as 'w' | 'b',
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/30" />
      
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute"
          initial={{ 
            x: piece.x,
            y: piece.y,
            scale: 0,
            opacity: 0,
            rotate: Math.random() * 360 
          }}
          animate={{
            x: [piece.x, piece.x + (Math.random() * 200 - 100)],
            y: [piece.y, piece.y + (Math.random() * 200 - 100)],
            scale: [0, 1.5],
            opacity: [0, 0.08], // Reducida la opacidad
            rotate: [0, Math.random() * 360]
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        >
          <Image
            src={`/${piece.color}_${piece.piece}.svg`}
            alt={`${piece.color}${piece.piece}`}
            className="select-none pointer-events-none"
            style={{
              filter: "blur(1px)"
            }}
            width={64}
            height={64}
          />
        </motion.div>
      ))}

      {/* Light effect overlay */}
      <motion.div 
        className="absolute inset-0"
        initial={{ background: "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)" }}
        animate={{ 
          background: [
            "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 100% 100%, rgba(255,255,255,0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 0% 100%, rgba(255,255,255,0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 100% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)",
          ]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
};
