import { NextRequest } from "next/server";
import { generateText } from "ai";
import { AI_CHAT_PROMPT, AI_MODEL } from "../../lib/ai-utils";
import { AIChatPayload } from "@/types/chat";
import { createAIStateManager } from "@/app/lib/ai-state";

export async function POST(request: NextRequest) {
    try {
        const {
            history,
            currentBoard,
            lastMove,
            playerColor,
            aiStateData,
        }: AIChatPayload = await request.json();
        const aiState = createAIStateManager(aiStateData);
        aiState.loadState(aiStateData);

        const gameId = aiState.generateGameId(currentBoard);

        // Get context from other AI actions
        const aiContext = aiState.getContext(gameId);

        const { text } = await generateText({
            model: AI_MODEL,
            system: `${AI_CHAT_PROMPT}\n\nPrevious AI actions for this game:\n${aiContext}`,
            prompt: `Game context:
Current position:
${currentBoard}

Last move: ${lastMove || "Game just started"}
Player is: ${playerColor === "w" ? "White" : "Black"}

Recent chat history:
${history}

Considering previous AI moves and analysis, provide strategic advice for the current position:`,
            temperature: 0.7,
            maxTokens: 200,
        });

        // Store this action
        aiState.addAction(gameId, {
            type: "chat",
            timestamp: Date.now(),
            data: { response: text.substring(0, 50) + "..." },
        });

        return Response.json({ text });
    } catch (error) {
        console.error("[Chess Chat API Error]:", error);
        return Response.json({ error: "Failed to generate chat response" }, { status: 500 });
    }
}
