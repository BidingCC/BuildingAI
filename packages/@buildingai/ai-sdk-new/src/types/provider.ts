import type {
    EmbeddingModelV3,
    ImageModelV3,
    LanguageModelV3,
    ProviderV3,
    RerankingModelV3,
    SpeechModelV3,
    TranscriptionModelV3,
} from "@ai-sdk/provider";

import type { ImageModelV1 } from "./image";
import type { ModerationModelV1 } from "./moderation";
import type { SpeechModelV1, TranscriptionModelV1 } from "./speech";

export interface BaseProviderSettings {
    apiKey?: string;
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
}

export interface AIProvider extends Omit<
    Partial<ProviderV3>,
    "imageModel" | "speechModel" | "transcriptionModel"
> {
    readonly id: string;
    readonly name: string;
    languageModel(modelId: string): LanguageModelV3;
    embeddingModel?(modelId: string): EmbeddingModelV3;
    speechModel?(modelId: string): SpeechModelV1 | SpeechModelV3;
    transcriptionModel?(modelId: string): TranscriptionModelV1 | TranscriptionModelV3;
    rerankModel?(modelId: string): RerankingModelV3;
    moderationModel?(modelId: string): ModerationModelV1;
    imageModel?(modelId: string): ImageModelV1 | ImageModelV3;
}

export type ProviderFactory<T extends BaseProviderSettings = BaseProviderSettings> = (
    settings?: T,
) => AIProvider;

export interface ProviderRegistryEntry {
    id: string;
    factory: ProviderFactory;
    description?: string;
}
