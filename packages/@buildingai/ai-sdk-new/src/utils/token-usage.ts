import type { LanguageModelUsage } from "ai";
import { encoding_for_model, get_encoding, type TiktokenModel } from "tiktoken";

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export interface EstimateTokenUsageParams {
    model?: string;
    inputText: string;
    outputText: string;
}

export interface ChatUsageDetails {
    noCacheTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
}

export interface ChatOutputTokenDetails {
    textTokens?: number;
    reasoningTokens?: number;
}

export interface NormalizedChatUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputTokenDetails: ChatUsageDetails;
    outputTokenDetails: ChatOutputTokenDetails;
    reasoningTokens: number;
    cachedInputTokens: number;
    raw?: unknown;
}

function getEncoding(model?: string) {
    try {
        return encoding_for_model((model || "gpt-3.5-turbo") as TiktokenModel);
    } catch {
        return get_encoding("cl100k_base");
    }
}

export function countTokens(params: { model?: string; text: string }): number {
    const enc = getEncoding(params.model);
    try {
        return enc.encode(params.text || "").length;
    } finally {
        enc.free();
    }
}

export function estimateTokenUsage(params: EstimateTokenUsageParams): TokenUsage {
    const enc = getEncoding(params.model);
    try {
        const inputTokens = enc.encode(params.inputText || "").length;
        const outputTokens = enc.encode(params.outputText || "").length;
        return {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
        };
    } finally {
        enc.free();
    }
}

export function formatMessagesForTokenCount(
    messages: Array<{ role?: unknown; content?: unknown }>,
): string {
    return messages
        .map((m) => {
            const role = m.role ?? "";
            let contentText = "";

            if (typeof m.content === "string") {
                contentText = m.content;
            } else if (Array.isArray(m.content)) {
                contentText = m.content
                    .map((part) => {
                        if (typeof part === "object" && part !== null && "text" in part) {
                            return String((part as { text?: unknown }).text ?? "");
                        }
                        return "";
                    })
                    .filter(Boolean)
                    .join(" ");
            } else if (m.content) {
                contentText = String(m.content);
            }

            return `${String(role)}: ${contentText}`;
        })
        .join("\n");
}

export function extractTextFromParts(parts: Array<{ type?: unknown; text?: string }>): {
    textText: string;
    reasoningText: string;
    fullText: string;
} {
    const textText = parts
        .filter((p) => p && typeof p === "object" && (p as { type?: unknown }).type === "text")
        .map((p) => (p as { text?: string }).text ?? "")
        .join("");
    const reasoningText = parts
        .filter((p) => p && typeof p === "object" && (p as { type?: unknown }).type === "reasoning")
        .map((p) => (p as { text?: string }).text ?? "")
        .join("");
    return {
        textText,
        reasoningText,
        fullText: [reasoningText, textText].filter(Boolean).join("\n"),
    };
}

export function normalizeChatUsage(params: {
    rawUsage: LanguageModelUsage;
    model?: string;
    textText?: string;
    reasoningText?: string;
}): NormalizedChatUsage {
    const inputTokens = params.rawUsage.inputTokens ?? 0;

    const inputTokenDetails =
        params.rawUsage.inputTokenDetails ??
        ({
            noCacheTokens: inputTokens,
            cacheReadTokens: 0,
            cacheWriteTokens: undefined,
        } as const);

    const cachedInputTokens =
        inputTokenDetails.cacheReadTokens ??
        (params.rawUsage as { cachedInputTokens?: number }).cachedInputTokens ??
        0;

    const providerReasoningTokens =
        params.rawUsage.outputTokenDetails?.reasoningTokens ??
        (params.rawUsage as { reasoningTokens?: number }).reasoningTokens ??
        0;

    const reasoningTokens =
        providerReasoningTokens > 0
            ? providerReasoningTokens
            : params.reasoningText
              ? countTokens({ model: params.model, text: params.reasoningText })
              : 0;

    const textTokens =
        params.rawUsage.outputTokenDetails?.textTokens ??
        (params.textText ? countTokens({ model: params.model, text: params.textText }) : 0) ??
        params.rawUsage.outputTokens ??
        0;

    const outputTokens = textTokens + reasoningTokens;
    const totalTokens = inputTokens + outputTokens;

    return {
        inputTokens,
        outputTokens,
        totalTokens,
        inputTokenDetails,
        outputTokenDetails: {
            textTokens,
            reasoningTokens,
        },
        reasoningTokens,
        cachedInputTokens,
        raw: (params.rawUsage as { raw?: unknown }).raw,
    };
}
