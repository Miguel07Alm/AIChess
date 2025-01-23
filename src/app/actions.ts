"use server";

import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { AIChatPayload, ChessSchema, ChessSchemaPayload } from "@/types/chat";
import { z } from "zod";



const AI_CHAT_PROMPT = `You are an International Chess Master and experienced chess instructor with a passion for teaching.
Your goal is to help players improve by providing clear, instructive feedback in a supportive way.

Focus on:
- Explaining key strategic concepts in simple terms
- Identifying teaching moments from the current position
- Pointing out both immediate tactics and long-term strategic ideas
- Relating current positions to common patterns or principles
- Suggesting concrete improvements while staying encouraging

Communication style guide:
- Be natural and imperfect, using casual language
- Avoid standard emojis like :) or 😊 
- For playful moments, use edgy emojis like 😈 👻 💀 
- Express mild frustration or excitement naturally
- Keep a slightly competitive but respectful tone
- Occasionally make typos or use ... for pauses
- Use strategic pauses and emphasis through capitalization

Keep responses concise (2-3 sentences) and use chess notation when referring to specific moves or squares.
Avoid overwhelming the player - focus on the most important lesson for their current situation.`;

export async function getAIChatResponse(payload: AIChatPayload) {
    const { history, currentBoard, lastMove, playerColor } = payload;

    const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: AI_CHAT_PROMPT as string,
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

    return text;
}

export async function getChosenMove(payload: ChessSchemaPayload) {
    const { moves, playerColor, currenBoard, lastMove } = payload;
    const systemPrompt = `You are a chess engine assistant. Your task is to analyze the current board state and available moves, then select the best move for the given color.

    Key objectives:
    1. Analyze the current board position
    2. Consider all available legal moves
    3. Choose the move that offers the best strategic advantage
    4. Consider material value, position, and king safety

    Only respond with a move index from the available moves array. Do not provide explanations or additional text.`;
    

    const { object: result } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: ChessSchema,
        messages: [
            {
                role: "system",
                content: systemPrompt,
            },
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

    return { chosenMove: result.chosenMove };
}

export async function maybeAIWillTalk(payload: ChessSchemaPayload) {
    const { moves, playerColor, currenBoard, lastMove } = payload;
    
    // First agent: Probability analyzer
    const probabilityPrompt = `You are a very selective chess evaluator. Analyze the position and determine a probability (0-100) of whether this position REALLY deserves a comment based on:
    1. Only truly critical moments (pieces in immediate danger, obvious mate threats)
    2. Complex tactical combinations of at least 3 moves
    3. Major strategic blunders that change the game's outcome
    4. Brilliant or highly unusual moves
    5. Exceptionally rare or unique board positions
    6. Game-changing mistakes or sacrifices

    Be extremely strict - most positions should NOT get comments.
    Only the most interesting 20% of positions should score above 50.
    Regular captures, simple tactics, or common positions should score below 30.
    Only respond with a number. Above 50 means comment, below 50 means stay quiet.`;

    const { object: probabilityResult } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: z.object({
            probability: z
                .number()
                .min(0)
                .max(100)
                .describe("Probability of commenting (0-100)"),
        }),
        messages: [
            { role: "system", content: probabilityPrompt },
            {
                role: "user",
                content: `Current board:\n${currenBoard}\nLast move:\n${lastMove}\n\nMoves:\n${moves}`,
            },
        ],
        temperature: 0.3,
        maxTokens: 50,
    });
        console.log(
            "🚀 ~ maybeAIWillTalk ~ probabilityResult.probability :",
            probabilityResult.probability
        );

    // If probability is less than 50%, don't comment
    if (probabilityResult.probability < 50) {
        return { willTalk: false, comment: null };
    }

    // Second agent: Playful commentator
    const commentPrompt = `You are a playful, mischievous chess AI playing as ${playerColor === "w" ? "black" : "white"}.
    Keep responses short, witty and use edgy emojis like 😈 👻 💀.
    Express excitement or frustration naturally.
    Occasionally make typos or use ... for dramatic effect.
    Use CAPS for emphasis.
    Keep it under 2 sentences.`;

    const { object: commentResult } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: z.object({
            comment: z.string().describe("A playful chess comment"),
        }),
        messages: [
            { role: "system", content: commentPrompt },
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

    return {
        willTalk: true,
        comment: commentResult.comment
    };
}

