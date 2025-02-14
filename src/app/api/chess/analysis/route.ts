import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { AI_MODEL, PROBABILITY_PROMPT } from "../../lib/ai-utils";
import { ChessSchemaPayload } from "@/types/chat";
import { AIStateManager, createAIStateManager } from "@/app/lib/ai-state";

export async function POST(request: NextRequest) {
    try {
        const {
            moves,
            playerColor,
            currentBoard,
            lastMove,
            aiStateData, // Usar aiStateData en lugar de aiState
        }: ChessSchemaPayload = await request.json();

        const aiState = createAIStateManager(aiStateData);

        aiState.loadState(aiStateData);

        const gameId = aiState.generateGameId(currentBoard);

        // Get context from other AI actions
        const aiContext = aiState.getContext(gameId);

        // First check probability with context
        const { object: probabilityResult } = await generateObject({
            model: AI_MODEL,
            schema: z.object({
                probability: z.number().min(0).max(100),
            }),
            messages: [
                {
                    role: "system",
                    content: `${PROBABILITY_PROMPT}\n\nPrevious AI actions for this game:\n${aiContext}`,
                },
                {
                    role: "user",
                    content: `Current board:\n${currentBoard}\nLast move:\n${lastMove}\n\nMoves:\n${moves}\n\nConsider previous AI interactions when determining probability`,
                },
            ],
            temperature: 0.3,
            maxTokens: 50,
        });

        if (probabilityResult.probability < 50) {
            // Store the "no comment" decision
            aiState.addAction(gameId, {
                type: "analysis",
                timestamp: Date.now(),
                data: {
                    commented: false,
                    probability: probabilityResult.probability,
                },
            });
            return Response.json({ willTalk: false, comment: null });
        }

        // Generate comment with context if probability is high enough
        const { object: commentResult } = await generateObject({
            model: AI_MODEL,
            schema: z.object({
                comment: z.string(),
            }),
            messages: [
                {
                    role: "system",
                    content: `You are a playful, mischievous chess AI playing as ${
                        playerColor === "w" ? "black" : "white"
                    }. Keep responses short, witty and use edgy emojis like 😈 👻 💀.\n\nPrevious AI actions for this game:\n${aiContext}`,
                },
                {
                    role: "user",
                    content: `Comment on:\n${currentBoard}\nLast move: ${
                        lastMove || "Game just started"
                    }\n\nMoves:\n${moves}\n\nConsider previous moves and chat messages in your response`,
                },
            ],
            temperature: 0.8,
            maxTokens: 200,
        });

        // Store the successful analysis
        aiState.addAction(gameId, {
            type: "analysis",
            timestamp: Date.now(),
            data: {
                commented: true,
                probability: probabilityResult.probability,
                comment: commentResult.comment.substring(0, 50) + "...",
            },
        });

        return Response.json({
            willTalk: true,
            comment: commentResult.comment,
        });
    } catch (error) {
        console.error("[Chess Analysis API Error]:", error);
        return Response.json(
            { error: "Failed to generate analysis" },
            { status: 500 }
        );
    }
}
