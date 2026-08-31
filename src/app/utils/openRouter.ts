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

/**
 * Turns a provider failure into something a farmer can act on.
 *
 * The free tier answers with 402 once its daily allowance is spent and 429 when
 * requests come too fast. Passing those through verbatim tells the user nothing
 * about what to do next.
 */
const toAdvisoryError = (error: unknown): AppError => {
  const message = error instanceof Error ? error.message : "unknown error";

  if (message.includes("402")) {
    return new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "The advisory service has used up today's allowance. It will be available again tomorrow."
    );
  }
  if (message.includes("429")) {
    return new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      "The advisory service is busy right now. Try again in a minute."
    );
  }
  if (message.includes("404") || message.toLowerCase().includes("model")) {
    return new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "The advisory model is unavailable. An administrator needs to check the configured model."
    );
  }

  return new AppError(
    httpStatus.BAD_GATEWAY,
    `Advisory model request failed: ${message}`
  );
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

    /**
     * OpenRouter answers a rejected request with an error object in place of
     * `choices`, so indexing straight into it turned a quota or availability
     * problem into an opaque TypeError. Read the provider's own message
     * instead — that is what makes the failure diagnosable.
     */
    const providerError = (response as unknown as { error?: { message?: string; code?: number } })
      .error;
    if (providerError) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        `Advisory model unavailable: ${providerError.message ?? "provider rejected the request"}`
      );
    }

    const text = response.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "The advisory model returned an empty response"
      );
    }
    return text;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw toAdvisoryError(error);
  }
};

/**
 * Streaming variant. Same request, but tokens are handed to `onChunk` as they
 * arrive and the accumulated text is returned at the end.
 *
 * On the free tier a full answer takes tens of seconds; streaming does not make
 * that faster, but it makes it usable — the farmer sees the reply forming
 * instead of watching a spinner.
 */
export const streamChatCompletion = async (
  messages: TChatMessage[],
  onChunk: (delta: string) => void,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> => {
  assertWithinRateLimit();

  let full = "";

  try {
    const stream = await getClient().chat.completions.create({
      model: config.openrouter.model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 1200,
      stream: true,
    });

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;
      if (delta) {
        full += delta;
        onChunk(delta);
      }
    }
  } catch (error) {
    // Partial text is returned rather than discarded: the farmer has already
    // seen it on screen, and dropping it would leave the transcript
    // disagreeing with what was displayed.
    if (full.trim()) return full.trim();

    throw toAdvisoryError(error);
  }

  if (!full.trim()) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "The advisory model returned an empty response"
    );
  }
  return full.trim();
};
