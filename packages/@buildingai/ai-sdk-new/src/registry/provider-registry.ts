import {
    anthropic,
    cohere,
    custom,
    deepseek,
    giteeAi,
    google,
    hunyuan,
    minimax,
    moonshot,
    ollama,
    openai,
    siliconflow,
    tongyi,
    volcengine,
    wenxin,
    x,
    zhipuai,
} from "../providers";
import type { AIProvider, BaseProviderSettings, ProviderFactory } from "../types";

interface ProviderEntry {
    factory: ProviderFactory;
    description: string;
}

class ProviderRegistry {
    private providers = new Map<string, ProviderEntry>();

    constructor() {
        this.registerDefaults();
    }

    private registerDefaults(): void {
        this.register("openai", openai, "OpenAI GPT 系列模型");
        this.register("deepseek", deepseek, "DeepSeek 深度求索");
        this.register("zhipuai", zhipuai, "智谱AI GLM 系列模型");
        this.register("moonshot", moonshot, "月之暗面 Kimi");
        this.register("siliconflow", siliconflow, "硅基流动");
        this.register("tongyi", tongyi, "阿里云通义千问");
        this.register("volcengine", volcengine, "火山引擎豆包");
        this.register("hunyuan", hunyuan, "腾讯混元");
        this.register("wenxin", wenxin, "百度文心一言");
        this.register("ollama", ollama, "Ollama 本地模型");
        this.register("minimax", minimax, "MiniMax M2 系列模型");
        this.register("anthropic", anthropic, "Anthropic Claude 系列模型");
        this.register("google", google, "Google Gemini 系列模型");
        this.register("cohere", cohere, "Cohere 系列模型");
        this.register("gitee_ai", giteeAi, "Gitee AI 魔力方舟");
        this.register("x", x, "xAI Grok 系列模型");
        this.register("custom", custom, "自定义 OpenAI 兼容 API");
    }

    register(id: string, factory: ProviderFactory, description: string = ""): void {
        this.providers.set(id, { factory, description });
    }

    get<T extends BaseProviderSettings>(id: string, settings?: T): AIProvider {
        const entry = this.providers.get(id);

        if (!entry) {
            console.warn(`Provider "${id}" 未注册，使用自定义 Provider`);
            return custom({
                id,
                name: id,
                ...settings,
            } as any);
        }

        return entry.factory(settings);
    }

    has(id: string): boolean {
        return this.providers.has(id);
    }

    list(): Array<{ id: string; description: string }> {
        return Array.from(this.providers.entries()).map(([id, entry]) => ({
            id,
            description: entry.description,
        }));
    }

    unregister(id: string): boolean {
        return this.providers.delete(id);
    }
}

export const providerRegistry = new ProviderRegistry();

export function getProvider<T extends BaseProviderSettings>(id: string, settings?: T): AIProvider {
    return providerRegistry.get(id, settings);
}

export function listProviders(): Array<{ id: string; description: string }> {
    return providerRegistry.list();
}
