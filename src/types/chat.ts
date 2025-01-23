import { Color, Move, PieceSymbol, Square } from "chess.js";
import { z } from "zod";

export interface ChessSchemaPayload {
    moves: string;
    playerColor: Color;
    currenBoard: string;
    lastMove: string | null;
}

export const ChessSchema = z.object({
    chosenMove: z.number().min(0).describe('Index of the selected move from the available moves array')
});

export interface AIChatPayload {
    history: string;
    currentBoard: string;
    lastMove: string | null;
    playerColor: "w" | "b";
}