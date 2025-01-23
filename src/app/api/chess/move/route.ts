import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { ChessSchema } from "@/types/chat";
import { CHESS_SYSTEM_PROMPT, AI_MODEL } from "../../lib/ai-utils";

export async function POST(request: NextRequest) {
    try {
        const { moves, playerColor, currenBoard, lastMove } = await request.json();

        const { object: result } = await generateObject({
            model: AI_MODEL,
            schema: ChessSchema,
            messages: [
                { role: "system", content: CHESS_SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `Current board state:\n${currenBoard}\nLast move: ${
                        lastMove || "Game just started"
                    }\n\nAvailable moves for ${playerColor}:\n${moves}\n\nSelect the best move index for ${
                        playerColor === "w" ? "black" : "white"
                    }.`,
                },
            ],
            temperature: 0.5,
            maxTokens: 200,
        });

        return Response.json({ chosenMove: result.chosenMove });
    } catch (error) {
        console.error("[Chess Move API Error]:", error);
        return Response.json({ error: "Failed to generate move" }, { status: 500 });
    }
}
