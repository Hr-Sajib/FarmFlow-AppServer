import OpenAI from "openai";
import httpStatus from "http-status";

import config from "../../config";
import AppError from "../errors/AppError";

/**
 * OpenRouter speaks the OpenAI wire format, so the official SDK works against
 * it unchanged. The model lives in config rather than in code: free models are
 * withdrawn without notice, and swapping one is then a config change.
 */
let client: OpenAI | null = null;

const getClient = (): OpenAI => {
  if (!config.openrouter.api_key) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "AI advisory is not configured"
    );
  }
  if (!client) {
    client = new OpenAI({
      apiKey: config.openrouter.api_key,
      baseURL: config.openrouter.base_url,
    });
  }
  return client;
};

/**
 * Sliding-window limiter over outbound calls. The free tier caps the whole
 * account at 20 requests/minute, so this is deliberately global rather than
 * per-user — a per-user limit would not prevent ten users together exceeding
 * the account quota.
 *
 * In-process only: with more than one server instance this would need Redis.
 */
const callTimestamps: number[] = [];

const assertWithinRateLimit = (): void => {
  const now = Date.now();
  const windowStart = now - 60_000;

  while (callTimestamps.length && callTimestamps[0] < windowStart) {
    callTimestamps.shift();
  }

  if (callTimestamps.length >= config.openrouter.max_requests_per_minute) {
    const retryInSeconds = Math.ceil((callTimestamps[0] + 60_000 - now) / 1000);
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      `The advisory service is busy. Please try again in ${retryInSeconds} second(s).`
    );
  }

  callTimestamps.push(now);
};

/** OpenAI-compatible content part: text, or an image referenced by URL. */
export type TContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type TChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | TContentPart[];
};

export const createChatCompletion = async (
  messages: TChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> => {
  assertWithinRateLimit();

  try {
    const response = await getClient().chat.completions.create({
      model: config.openrouter.model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: options.temperature ?? 0.4,
      // Headroom set for Bangla: non-Latin scripts tokenise far less
      // efficiently than English, so the same ~150-word answer costs
      // noticeably more tokens and a tighter cap truncates mid-sentence.
      max_tokens: options.maxTokens ?? 1200,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "The advisory model returned an empty response"
      );
    }
    return text;
  } catch (error) {
    if (error instanceof AppError) throw error;

    // Surface upstream failures as a clear 502 rather than a generic 500, so a
    // withdrawn or rate-limited model is diagnosable from the response alone.
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `Advisory model request failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }
};
