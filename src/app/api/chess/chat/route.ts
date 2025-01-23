import { NextRequest } from "next/server";
import { generateText } from "ai";
import { AI_CHAT_PROMPT, AI_MODEL } from "../../lib/ai-utils";

export async function POST(request: NextRequest) {
    try {
        const { history, currentBoard, lastMove, playerColor } = await request.json();

        const { text } = await generateText({
            model: AI_MODEL,
            system: AI_CHAT_PROMPT,
            prompt: `Game context:
Current position:
${currentBoard}

Last move: ${lastMove || "Game just started"}
Player is: ${playerColor === "w" ? "White" : "Black"}

Recent chat history:
${history}

Provide strategic advice for the current position:`,
            temperature: 0.7,
            maxTokens: 200,
        });

        return Response.json({ text });
    } catch (error) {
        console.error("[Chess Chat API Error]:", error);
        return Response.json({ error: "Failed to generate chat response" }, { status: 500 });
    }
}
