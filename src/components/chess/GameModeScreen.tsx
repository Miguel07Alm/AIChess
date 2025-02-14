import { motion } from "framer-motion";
import { Bot, Users, Swords } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { useGame } from "@/contexts/GameContext";

export const GameModeScreen = () => {
  const { setGameMode } = useGame();
  
  const modes = [
    {
      id: "practice",
      title: "Practice Mode",
      description: "Play both sides",
      icon: <Swords className="w-8 h-8" />,
    },
    {
      id: "ai",
      title: "Play vs AI",
      description: "Challenge our AI opponent",
      icon: <Bot className="w-8 h-8" />,
    },
    {
      id: "online",
      title: "Play Online",
      description: "Challenge other players",
      icon: <Users className="w-8 h-8" />,
    },
  ] as const;

  return (
    <div className="h-[100dvh] w-full flex items-center justify-center p-4 overflow-hidden fixed inset-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-2">Chess Game</h1>
          <p className="text-muted-foreground">Select your preferred game mode</p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-4">
          {modes.map((mode, i) => (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Button
                variant="outline"
                className="w-full min-h-[160px] p-6 flex flex-col items-center gap-6 hover:bg-muted/50 transition-all duration-300"
                onClick={() => setGameMode(mode.id)}
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="text-primary"
                >
                  {mode.icon}
                </motion.div>
                
                <div className="text-center space-y-1.5">
                  <h2 className="font-semibold text-primary">
                    {mode.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {mode.description}
                  </p>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
