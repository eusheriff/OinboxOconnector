import { GoogleGenerativeAI } from '@google/generative-ai';
import { TOOLS_SCHEMA, executeTool } from '../tools/agentTools';
import { DatadogLogger } from '../utils/datadog';
import { DatabaseBinding } from '../types';

// Helper to init SDK
const getGenAI = (apiKey: string) => new GoogleGenerativeAI(apiKey);

export interface AgentResult {
  text: string;
  model: string;
  toolUsed: boolean;
}

/**
 * Executes the Agentic Loop:
 * 1. Sends prompt + tools to Gemini
 * 2. Checks if Gemini wants to call a tool (Function Call)
 * 3. Executes tool locally (SQL)
 * 4. Sends tool output back to Gemini
 * 5. Returns final text response
 */
export async function runAgent(
  apiKey: string,
  modelName: string,
  prompt: string,
  db: DatabaseBinding,
  tenantId: string,
  logger: DatadogLogger | null,
  history: any[] = [],
  systemInstruction?: string
): Promise<AgentResult> {
  try {
    const genAI = getGenAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      tools: [{ functionDeclarations: TOOLS_SCHEMA }],
      systemInstruction: systemInstruction,
    });

    const chat = model.startChat({
      history: history.map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
    });

    let result = await chat.sendMessage(prompt);
    let response = await result.response;
    let functionCalls = response.functionCalls();
    let toolUsed = false;

    // Loop for multi-turn tool execution (max 5 turns to prevent loops)
    let turns = 0;
    while (functionCalls && functionCalls.length > 0 && turns < 5) {
      toolUsed = true;
      turns++;

      const parts: any[] = [];

      for (const call of functionCalls) {
        await logger?.info(`Agent executing tool: ${call.name}`, { args: call.args });

        try {
          // Execute the tool locally
          const toolResult = await executeTool(call.name, call.args, db, tenantId);

          parts.push({
            functionResponse: {
              name: call.name,
              response: { result: toolResult },
            },
          });
        } catch (err: any) {
          await logger?.error(`Tool execution failed`, { tool: call.name, error: err.message });
          parts.push({
            functionResponse: {
              name: call.name,
              response: { error: err.message },
            },
          });
        }
      }

      // Send tool outputs back to Gemini
      result = await chat.sendMessage(parts);
      response = await result.response;
      functionCalls = response.functionCalls();
    }

    return {
      text: response.text(),
      model: modelName,
      toolUsed,
    };
  } catch (e: any) {
    // Fallback to REST API if SDK fails (e.g. version mismatch) or simple text generation
    await logger?.error('Agent Loop failed, falling back to simple generation', {
      error: e.message,
    });
    // Retry without tools
    try {
      const genAI = getGenAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName }); // No tools
      const result = await model.generateContent(prompt);
      return { text: result.response.text(), model: modelName + '-fallback', toolUsed: false };
    } catch (fallbackError: any) {
       await logger?.error('Fallback generation failed', { error: fallbackError.message });
       return { text: "Desculpe, estou com dificuldades técnicas no momento.", model: 'error', toolUsed: false };
    }
  }
}
