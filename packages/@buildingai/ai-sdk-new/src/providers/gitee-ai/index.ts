import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV3 } from "@ai-sdk/provider";

import type { AIProvider, BaseProviderSettings } from "../../types";

export interface GiteeAIProviderSettings extends BaseProviderSettings {}

class GiteeAIProviderImpl implements AIProvider {
    readonly id = "gitee_ai";
    readonly name = "Gitee AI";

    private baseProvider: ReturnType<typeof createOpenAICompatible>;

    constructor(settings: GiteeAIProviderSettings = {}) {
        this.baseProvider = createOpenAICompatible({
            name: "gitee_ai",
            baseURL: settings.baseURL || "https://ai.gitee.com/v1",
            headers: {
                Authorization: `Bearer ${settings.apiKey}`,
                ...settings.headers,
            },
        });
    }

    languageModel(modelId: string): LanguageModelV3 {
        return this.baseProvider.languageModel(modelId);
    }
}

export function giteeAi(settings: GiteeAIProviderSettings = {}): AIProvider {
    return new GiteeAIProviderImpl(settings);
}
