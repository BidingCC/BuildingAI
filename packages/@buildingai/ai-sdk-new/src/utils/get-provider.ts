import type { EmbeddingModelV3, LanguageModelV3, RerankingModelV3 } from "@ai-sdk/provider";

import { ProviderCapabilityError } from "../errors";
import { getProvider as getProviderFromRegistry } from "../registry";
import type {
    AIProvider,
    BaseProviderSettings,
    ImageModelV1,
    ModerationModelV1,
    ProviderCapabilities,
    ProviderCapability,
    SpeechModelV1,
    TranscriptionModelV1,
} from "../types";
import { createCapabilities } from "../types/capabilities";

export interface ProviderModelConfig {
    model: LanguageModelV3;
}

export interface ProviderEmbeddingConfig {
    model: EmbeddingModelV3;
}

export interface ProviderSpeechConfig {
    model: SpeechModelV1;
}

export interface ProviderTranscriptionConfig {
    model: TranscriptionModelV1;
}

export interface ProviderImageConfig {
    model: ImageModelV1;
}

export interface ProviderModerationConfig {
    model: ModerationModelV1;
}

export interface ProviderRerankConfig {
    model: RerankingModelV3;
}

type InferModelType<T extends string> =
    Lowercase<T> extends `${string}rerank${string}`
        ? ProviderRerankConfig
        : Lowercase<T> extends `${string}embed${string}` | `${string}embedding${string}`
          ? ProviderEmbeddingConfig
          : ProviderModelConfig;

export interface CallableProvider extends AIProvider {
    <T extends string>(modelId: T): InferModelType<T>;
    speech(modelId: string): ProviderSpeechConfig;
    transcription(modelId: string): ProviderTranscriptionConfig;
    image(modelId: string): ProviderImageConfig;
    moderation(modelId: string): ProviderModerationConfig;
    rerank(modelId: string): ProviderRerankConfig;
    supports(capability: ProviderCapability): boolean;
    readonly capabilities: ProviderCapabilities;
}

export function getProvider<T extends BaseProviderSettings = BaseProviderSettings>(
    providerName: string,
    settings?: T,
): CallableProvider {
    const provider = getProviderFromRegistry(providerName, settings);
    const caps: ProviderCapability[] = ["language"];
    if (provider.embeddingModel) caps.push("embedding");
    if (provider.speechModel) caps.push("speech");
    if (provider.transcriptionModel) caps.push("transcription");
    if (provider.imageModel) caps.push("image");
    if (provider.moderationModel) caps.push("moderation");
    if (provider.rerankModel) caps.push("rerank");
    const capabilities = createCapabilities(caps);

    const createMethod =
        <T>(
            method: keyof AIProvider,
            cap: ProviderCapability,
            getModel: (p: AIProvider, id: string) => T,
        ) =>
        (id: string): { model: T } => {
            if (!provider[method]) throw new ProviderCapabilityError(provider.id, cap);
            return { model: getModel(provider, id) };
        };

    const methods = {
        supports: (c: ProviderCapability) => capabilities.supports(c),
        capabilities,
        speech: createMethod(
            "speechModel",
            "speech",
            (p, id) => p.speechModel!(id) as SpeechModelV1,
        ),
        transcription: createMethod(
            "transcriptionModel",
            "transcription",
            (p, id) => p.transcriptionModel!(id) as TranscriptionModelV1,
        ),
        image: createMethod("imageModel", "image", (p, id) => p.imageModel!(id) as ImageModelV1),
        moderation: createMethod("moderationModel", "moderation", (p, id) =>
            p.moderationModel!(id),
        ),
        rerank: createMethod("rerankModel", "rerank", (p, id) => p.rerankModel!(id)),
    };

    return new Proxy(
        (modelId: string): ProviderModelConfig | ProviderEmbeddingConfig | ProviderRerankConfig => {
            const lower = modelId.toLowerCase();
            if (provider.rerankModel && lower.includes("rerank"))
                return { model: provider.rerankModel(modelId) } as ProviderRerankConfig;
            if (provider.embeddingModel && (lower.includes("embed") || lower.includes("embedding")))
                return { model: provider.embeddingModel(modelId) } as ProviderEmbeddingConfig;
            return { model: provider.languageModel(modelId) } as ProviderModelConfig;
        },
        {
            get: (target, prop) => {
                if (prop in methods) return methods[prop as keyof typeof methods];
                if (prop in provider) {
                    const v = (provider as unknown as Record<string, unknown>)[prop as string];
                    return typeof v === "function" ? v.bind(provider) : v;
                }
                return (target as unknown as Record<string, unknown>)[prop as string];
            },
            has: (target, prop) => prop in methods || prop in provider || prop in target,
            ownKeys: () => [...Object.keys(provider), ...Object.keys(methods)],
            getOwnPropertyDescriptor: (target, prop) =>
                prop in provider
                    ? Object.getOwnPropertyDescriptor(provider, prop)
                    : Object.getOwnPropertyDescriptor(target, prop),
        },
    ) as CallableProvider;
}

export function getProviderForText<T extends BaseProviderSettings = BaseProviderSettings>(
    providerName: string,
    settings?: T,
): (modelId: string) => ProviderModelConfig {
    const provider = getProviderFromRegistry(providerName, settings);
    return (modelId: string): ProviderModelConfig => ({
        model: provider.languageModel(modelId),
    });
}

export function getProviderForEmbedding<T extends BaseProviderSettings = BaseProviderSettings>(
    providerName: string,
    settings?: T,
): (modelId: string) => ProviderEmbeddingConfig {
    const provider = getProviderFromRegistry(providerName, settings);
    if (!provider.embeddingModel) {
        throw new ProviderCapabilityError(providerName, "embedding");
    }
    return (modelId: string): ProviderEmbeddingConfig => ({
        model: provider.embeddingModel!(modelId),
    });
}

export function getProviderForSpeech<T extends BaseProviderSettings = BaseProviderSettings>(
    providerName: string,
    settings?: T,
): (modelId: string) => ProviderSpeechConfig {
    const provider = getProviderFromRegistry(providerName, settings);
    if (!provider.speechModel) {
        throw new ProviderCapabilityError(providerName, "speech");
    }
    return (modelId: string): ProviderSpeechConfig => ({
        model: provider.speechModel!(modelId) as SpeechModelV1,
    });
}

export function getProviderForTranscription<T extends BaseProviderSettings = BaseProviderSettings>(
    providerName: string,
    settings?: T,
): (modelId: string) => ProviderTranscriptionConfig {
    const provider = getProviderFromRegistry(providerName, settings);
    if (!provider.transcriptionModel) {
        throw new ProviderCapabilityError(providerName, "transcription");
    }
    return (modelId: string): ProviderTranscriptionConfig => ({
        model: provider.transcriptionModel!(modelId) as TranscriptionModelV1,
    });
}

export function getProviderForImage<T extends BaseProviderSettings = BaseProviderSettings>(
    providerName: string,
    settings?: T,
): (modelId: string) => ProviderImageConfig {
    const provider = getProviderFromRegistry(providerName, settings);
    if (!provider.imageModel) {
        throw new ProviderCapabilityError(providerName, "image");
    }
    return (modelId: string): ProviderImageConfig => ({
        model: provider.imageModel!(modelId) as ImageModelV1,
    });
}

export function getProviderForModeration<T extends BaseProviderSettings = BaseProviderSettings>(
    providerName: string,
    settings?: T,
): (modelId: string) => ProviderModerationConfig {
    const provider = getProviderFromRegistry(providerName, settings);
    if (!provider.moderationModel) {
        throw new ProviderCapabilityError(providerName, "moderation");
    }
    return (modelId: string): ProviderModerationConfig => ({
        model: provider.moderationModel!(modelId),
    });
}

export function getProviderForRerank<T extends BaseProviderSettings = BaseProviderSettings>(
    providerName: string,
    settings?: T,
): (modelId: string) => ProviderRerankConfig {
    const provider = getProviderFromRegistry(providerName, settings);
    if (!provider.rerankModel) {
        throw new ProviderCapabilityError(providerName, "rerank");
    }
    return (modelId: string): ProviderRerankConfig => ({
        model: provider.rerankModel!(modelId),
    });
}
