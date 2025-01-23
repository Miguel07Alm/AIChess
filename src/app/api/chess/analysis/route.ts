import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { AI_MODEL, PROBABILITY_PROMPT } from "../../lib/ai-utils";

export async function POST(request: NextRequest) {
    try {
        const { moves, playerColor, currenBoard, lastMove } = await request.json();

        // First check probability
        const { object: probabilityResult } = await generateObject({
            model: AI_MODEL,
            schema: z.object({
                probability: z.number().min(0).max(100)
            }),
            messages: [
                { role: "system", content: PROBABILITY_PROMPT },
                {
                    role: "user",
                    content: `Current board:\n${currenBoard}\nLast move:\n${lastMove}\n\nMoves:\n${moves}`,
                },
            ],
            temperature: 0.3,
            maxTokens: 50,
        });

        if (probabilityResult.probability < 50) {
            return Response.json({ willTalk: false, comment: null });
        }

        // Generate comment if probability is high enough
        const { object: commentResult } = await generateObject({
            model: AI_MODEL,
            schema: z.object({
                comment: z.string()
            }),
            messages: [
                {
                    role: "system",
                    content: `You are a playful, mischievous chess AI playing as ${
                        playerColor === "w" ? "black" : "white"
                    }. Keep responses short, witty and use edgy emojis like 😈 👻 💀.`
                },
                {
                    role: "user",
                    content: `Comment on:\n${currenBoard}\nLast move: ${
                        lastMove || "Game just started"
                    }\n\nMoves:\n${moves}`,
                },
            ],
            temperature: 0.8,
            maxTokens: 200,
        });

        return Response.json({
            willTalk: true,
            comment: commentResult.comment
        });
    } catch (error) {
        console.error("[Chess Analysis API Error]:", error);
        return Response.json({ error: "Failed to generate analysis" }, { status: 500 });
    }
}
