import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { ChessSchema, ChessSchemaPayload } from "@/types/chat";
import { CHESS_SYSTEM_PROMPT, AI_MODEL } from "../../lib/ai-utils";
import { createAIStateManager } from "@/app/lib/ai-state";

export async function POST(request: NextRequest) {
    try {
        const { moves, playerColor, currentBoard, lastMove, aiStateData }: ChessSchemaPayload = await request.json();
        
        const aiState = createAIStateManager(aiStateData);

        const gameId = aiState.generateGameId(currentBoard);

        // Get context from other AI actions
        const aiContext = aiState.getContext(gameId);

        const { object: result } = await generateObject({
            model: AI_MODEL,
            schema: ChessSchema,
            messages: [
                { 
                    role: "system", 
                    content: `${CHESS_SYSTEM_PROMPT}\n\nPrevious AI actions for this game:\n${aiContext}` 
                },
                {
                    role: "user",
                    content: `Current board state:\n${currentBoard}\nLast move: ${
                        lastMove || "Game just started"
                    }\n\nAvailable moves for ${playerColor}:\n${moves}\n\nSelect the best move index for ${
                        playerColor === "w" ? "black" : "white"
                    } considering the previous AI actions.`,
                },
            ],
            temperature: 0.5,
            maxTokens: 200,
        });

        // Store this action
        aiState.addAction(gameId, {
            type: 'move',
            timestamp: Date.now(),
            data: { chosenMove: result.chosenMove, playerColor }
        });

        // Incluir el estado actualizado en la respuesta
        return Response.json({ 
            chosenMove: result.chosenMove,
            updatedState: aiState.toJSON()
        });
    } catch (error) {
        console.error("[Chess Move API Error]:", error);
        return Response.json({ error: "Failed to generate move" }, { status: 500 });
    }
}
