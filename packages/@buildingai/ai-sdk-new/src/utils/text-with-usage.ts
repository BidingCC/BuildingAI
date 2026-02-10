import { generateText, type LanguageModelUsage, streamText } from "ai";

import { estimateTokenUsage } from "./token-usage";

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
    return typeof v === "object" && v !== null;
}

function safeStringify(v: unknown): string {
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
}

function buildInputText(params: unknown): string {
    if (!isRecord(params)) return safeStringify(params);
    if ("messages" in params) return safeStringify(params.messages);
    if ("prompt" in params) return safeStringify(params.prompt);
    return safeStringify(params);
}

function getTextPromise(result: unknown): Promise<string> {
    if (!isRecord(result)) return Promise.resolve("");
    const text = result.text;
    if (typeof text === "string" || text === undefined || text === null) {
        return Promise.resolve(typeof text === "string" ? text : "");
    }
    if (typeof (text as { then?: unknown }).then === "function") {
        return Promise.resolve(text as PromiseLike<string>);
    }
    return Promise.resolve("");
}

async function ensureUsage(
    rawUsage: PromiseLike<LanguageModelUsage> | LanguageModelUsage | undefined,
    params: { model?: string; inputText: string; outputTextPromise: Promise<string> },
): Promise<LanguageModelUsage> {
    try {
        const maybePromise = rawUsage as { then?: unknown } | undefined;
        const u =
            rawUsage && typeof maybePromise?.then === "function"
                ? await Promise.resolve(rawUsage as PromiseLike<LanguageModelUsage>)
                : (rawUsage as LanguageModelUsage | undefined);
        if (u && (u.totalTokens ?? 0) > 0) return u;
    } catch {
        // ignore and fallback
    }

    const outputText = await params.outputTextPromise;
    const est = estimateTokenUsage({
        model: params.model,
        inputText: params.inputText,
        outputText,
    });

    return {
        inputTokens: est.inputTokens,
        outputTokens: est.outputTokens,
        totalTokens: est.totalTokens,
        inputTokenDetails: {
            noCacheTokens: est.inputTokens,
            cacheReadTokens: 0,
            cacheWriteTokens: undefined,
        },
        outputTokenDetails: {
            textTokens: est.outputTokens,
            reasoningTokens: 0,
        },
        reasoningTokens: 0,
        cachedInputTokens: 0,
    };
}

export interface WithEstimatedUsageOptions {
    model?: string;
    /**
     * Input text used to estimate prompt tokens when provider doesn't return usage.
     */
    inputText?: string;
    /**
     * Optional original call params (for building inputText when inputText is omitted).
     */
    params?: unknown;
    /**
     * Override output text for usage estimation.
     * Useful for ToolLoopAgent where `result.text` may not include reasoning.
     */
    outputTextPromise?: Promise<string>;
}

/**
 * Wrap an AI SDK result (StreamTextResult or ToolLoopAgent result) to ensure `usage`
 * is always available. Works for `streamText`, `generateText` results and `ToolLoopAgent.stream()`.
 */
export function withEstimatedUsage<T extends object>(
    result: T,
    options?: WithEstimatedUsageOptions,
): T {
    const inputText = options?.inputText ?? buildInputText(options?.params);
    const outputTextPromise = options?.outputTextPromise ?? getTextPromise(result);
    const usagePromise = ensureUsage(
        (
            result as unknown as {
                usage?: PromiseLike<LanguageModelUsage> | LanguageModelUsage;
            }
        ).usage,
        { model: options?.model, inputText, outputTextPromise },
    );

    return new Proxy(result, {
        get(target, prop) {
            if (prop === "usage") return usagePromise;
            return Reflect.get(target, prop);
        },
    });
}

export function streamTextWithUsage(
    params: Parameters<typeof streamText>[0],
    options?: { model?: string; inputText?: string },
): ReturnType<typeof streamText> {
    const result = streamText(params);
    return withEstimatedUsage(result as unknown as object, {
        model: options?.model,
        inputText: options?.inputText,
        params,
    }) as ReturnType<typeof streamText>;
}

export async function generateTextWithUsage(
    params: Parameters<typeof generateText>[0],
    options?: { model?: string; inputText?: string },
): Promise<Awaited<ReturnType<typeof generateText>>> {
    const result = await generateText(params);
    return withEstimatedUsage(result as unknown as object, {
        model: options?.model,
        inputText: options?.inputText,
        params,
    }) as Awaited<ReturnType<typeof generateText>>;
}
