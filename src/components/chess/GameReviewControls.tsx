"use client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { useGame } from "@/contexts/GameContext";
import { 
  SkipBack, 
  SkipForward, 
  PlaySquare, 
  StopCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export const GameReviewControls = () => {
  const {
    gameHistory,
    currentHistoryIndex,
    isReviewing,
    navigateHistory,
    startReview,
    stopReview,
    game,
  } = useGame();

  if (!game.isGameOver() || gameHistory.length === 0) return null;

  if (!isReviewing) {
    return (
      <Card className="p-4">
        <Button 
          className="w-full" 
          onClick={startReview}
          variant="outline"
        >
          <PlaySquare className="w-4 h-4 mr-2" />
          Review Game
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Button
          size="icon"
          variant="outline"
          onClick={() => navigateHistory(-1)}
          disabled={currentHistoryIndex === -1}
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => navigateHistory(currentHistoryIndex - 1)}
          disabled={currentHistoryIndex <= -1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-mono">
          {currentHistoryIndex + 1} / {gameHistory.length}
        </span>
        <Button
          size="icon"
          variant="outline"
          onClick={() => navigateHistory(currentHistoryIndex + 1)}
          disabled={currentHistoryIndex >= gameHistory.length - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => navigateHistory(gameHistory.length - 1)}
          disabled={currentHistoryIndex === gameHistory.length - 1}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
      <Slider
        value={[currentHistoryIndex + 1]}
        min={0}
        max={gameHistory.length}
        step={1}
        onValueChange={([value]) => navigateHistory(value - 1)}
        className="mt-2"
      />
      <Button 
        className="w-full" 
        onClick={stopReview}
        variant="outline"
      >
        <StopCircle className="w-4 h-4 mr-2" />
        Exit Review
      </Button>
    </Card>
  );
};
