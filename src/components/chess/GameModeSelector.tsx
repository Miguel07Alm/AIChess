"use client";
import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { Bot, Users } from "lucide-react"
import { motion } from "framer-motion"

interface GameModeSelectorProps {
  onSelectMode: (mode: 'ai' | 'online' | null) => void
  selectedMode: 'ai' | 'online' | null
}

export const GameModeSelector = ({ onSelectMode, selectedMode }: GameModeSelectorProps) => {
  return (
    <Card className="p-4 mb-4">
      <h3 className="text-lg font-medium mb-4">Select Game Mode</h3>
      <div className="flex gap-4">
        <Button
          variant={selectedMode === 'ai' ? 'default' : 'outline'}
          className="flex-1 h-20"
          onClick={() => onSelectMode(selectedMode === 'ai' ? null : 'ai')}
        >
          <div className="flex flex-col items-center gap-2">
            <Bot className="w-6 h-6" />
            <span>VS AI</span>
          </div>
          {selectedMode === 'ai' && (
            <motion.div
              layoutId="activeMode"
              className="absolute inset-0 bg-primary/10 rounded-md"
              initial={false}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </Button>
        <Button
          variant={selectedMode === 'online' ? 'default' : 'outline'}
          className="flex-1 h-20 relative"
          onClick={() => onSelectMode(selectedMode === 'online' ? null : 'online')}
        >
          <div className="flex flex-col items-center gap-2">
            <Users className="w-6 h-6" />
            <span>Online</span>
          </div>
          {selectedMode === 'online' && (
            <motion.div
              layoutId="activeMode"
              className="absolute inset-0 bg-primary/10 rounded-md"
              initial={false}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </Button>
      </div>
    </Card>
  )
}
