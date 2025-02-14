"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Crown } from "lucide-react";
import { Chess } from "chess.js";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";

export const GameStatus = ({ game }: { game: Chess }) => {
  const [show, setShow] = useState(true);
  const [statusKey, setStatusKey] = useState<string>('');
  const { gameOver } = useGame(); // Añadir este hook

  const statusInfo = () => {
    if (gameOver || game.isGameOver()) {
      if (game.isCheckmate()) {
        const winner = game.turn() === 'w' ? "Black" : "White";
        return {
          text: "CHECKMATE",
          subText: "Game Over",
          extraText: `${winner} Wins`,
          class: 'from-zinc-900 to-zinc-800',
          animation: {
            scale: [1, 1.1, 1],
          },
          permanent: true, // Nuevo flag para estado permanente
        }
      }
      if (game.isStalemate() || game.isDraw()) {
        return {
          text: game.isStalemate() ? "STALEMATE" : "DRAW",
          subText: "Game Over",
          class: 'from-blue-600 to-blue-700',
          animation: {
            scale: [1, 1.05, 1],
          },
          permanent: true,
        }
      }
    }
    if (game.isCheck()) {
      return {
        text: "CHECK",
        class: 'from-rose-500 to-rose-600',
        animation: {
          scale: [1, 1.05, 1],
        },
        iconAnimation: {
          rotate: [-10, 10],
          scale: [1, 1.2, 1],
        },
        duration: 1500,
      }
    }
    return null;
  }

  const status = statusInfo();
  
  useEffect(() => {
    if (status) {
      const newKey = `${status.text}-${Date.now()}`;
      setStatusKey(newKey);
      setShow(true);
    }
  }, [game.fen()]);

  useEffect(() => {
    if (status?.duration && !status.permanent) {
      const timer = setTimeout(() => setShow(false), status.duration);
      return () => clearTimeout(timer);
    }
  }, [status?.duration, status?.permanent, statusKey]);

  if (!status) return null;

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key={statusKey}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full flex items-center justify-center"
        >
          <motion.div
            className={cn(
              "px-6 py-3 rounded-2xl bg-gradient-to-b shadow-2xl",
              "border border-white/10 backdrop-blur-md mx-auto",
              status.class
            )}
            animate={status.animation}
            transition={{
              duration: 0.6,
              repeat: status?.text === "CHECKMATE" ? 0 : Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          >
            <div className="flex flex-col items-center gap-2 text-white">
              {status.text === "CHECKMATE" && (
                <motion.div
                  className="mb-2"
                  animate={{
                    rotateZ: [-5, 5],
                    y: [0, -2, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <Crown className="w-8 h-8" />
                </motion.div>
              )}
              <span className="font-bold tracking-wider text-xl">
                {status.text}
              </span>
              {status.subText && (
                <span className="text-sm font-medium tracking-wide text-white/80">
                  {status.subText}
                </span>
              )}
              {status.extraText && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="text-lg font-bold text-primary"
                >
                  {status.extraText}
                </motion.span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
