import { AIStateManager, SerializableAIState } from "@/app/lib/ai-state";
import { Color, Move, PieceSymbol, Square } from "chess.js";
import { z } from "zod";

export interface ChessSchemaPayload {
    moves: string;
    playerColor: 'w' | 'b';
    currentBoard: string;
    lastMove: string | null;
    aiStateData: SerializableAIState; // Cambiar de aiState a aiStateData
}

export const ChessSchema = z.object({
    chosenMove: z.number().min(0).describe('Index of the selected move from the available moves array')
});

export interface AIChatPayload {
    history: string;
    currentBoard: string;
    lastMove: string | null;
    playerColor: string;
    aiStateData: SerializableAIState; // Cambiar de aiState a aiStateData
}