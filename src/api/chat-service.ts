/*
IMPORTANT NOTICE: DO NOT REMOVE
./src/api/chat-service.ts
If the user wants to use AI to generate text, answer questions, or analyze images you can use the functions defined in this file to communicate with the OpenAI and Grok APIs.
*/
import { AIMessage, AIRequestOptions, AIResponse } from "../types/ai";
import { getOpenAIClient, isOpenAIConfigured } from "./openai";
import { getGrokClient, isGrokConfigured } from "./grok";

const DEFAULT_OPENAI_MODEL = "gpt-4o-2024-11-20"; // supports vision + strong general performance
const DEFAULT_GROK_MODEL = "grok-3-latest";

const clampMaxTokens = (value: number | undefined, fallback: number): number => {
  const v = typeof value === "number" ? value : fallback;
  // Keep within reasonable bounds to avoid accidental huge requests.
  // (Vendors can still reject based on model context limits.)
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.min(Math.max(Math.floor(v), 1), 8192);
};

const normalizeMessages = (messages: AIMessage[]): AIMessage[] => {
  // Ensure every message has a valid role/content payload.
  // (Also prevents "undefined" content from causing weird API errors.)
  return (messages || [])
    .filter(Boolean)
    .map((m) => ({
      role: m.role,
      // Some apps use array content for vision; keep as-is if not a string.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: (m as any).content ?? "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as AIMessage[];
};

const wrapProviderError = (provider: "OpenAI" | "Grok", err: unknown): Error => {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
  const e = new Error(`[${provider}] Request failed: ${message}`);
  // Preserve original error for debugging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (e as any).cause = err;
  return e;
};

/**
 * Get a text response from OpenAI
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getOpenAITextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions,
): Promise<AIResponse> => {
  // Fail fast with a clear error so UI can disable/hide AI features.
  if (!isOpenAIConfigured()) {
    throw new Error("[OpenAI] Not configured: missing EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY");
  }

  try {
    const client = getOpenAIClient();
    const model = options?.model || DEFAULT_OPENAI_MODEL;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = clampMaxTokens(options?.maxTokens, 2048);

    const response = await client.chat.completions.create({
      model,
      messages: normalizeMessages(messages),
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: response.choices?.[0]?.message?.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error: unknown) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error("OpenAI API Error:", error);
    }
    throw wrapProviderError("OpenAI", error);
  }
};

/**
 * Get a simple chat response from OpenAI
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getOpenAIChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getOpenAITextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from Grok
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getGrokTextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions,
): Promise<AIResponse> => {
  if (!isGrokConfigured()) {
    throw new Error("[Grok] Not configured: missing EXPO_PUBLIC_VIBECODE_GROK_API_KEY");
  }

  try {
    const client = getGrokClient();
    const model = options?.model || DEFAULT_GROK_MODEL;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = clampMaxTokens(options?.maxTokens, 2048);

    const response = await client.chat.completions.create({
      model,
      messages: normalizeMessages(messages),
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: response.choices?.[0]?.message?.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error: unknown) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error("Grok API Error:", error);
    }
    throw wrapProviderError("Grok", error);
  }
};

/**
 * Get a simple chat response from Grok
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getGrokChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getGrokTextResponse([{ role: "user", content: prompt }]);
};
