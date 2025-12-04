import type { ChatCompletion, ChatCompletionCreateParams } from "openai/resources/index";
import type { CreateEmbeddingResponse, EmbeddingCreateParams } from "openai/resources/embeddings";

import { Adapter, ProviderChatCompletionStream } from "../interfaces/adapter";

interface AnthropicOptions {
    apiKey?: string;
    baseURL?: string;
}

export class AnthropicAdapter implements Adapter {
    public name = "anthropic";
    private apiKey: string;
    private baseURL: string;

    constructor(options: AnthropicOptions = {}) {
        this.apiKey = options.apiKey || "";
        this.baseURL = options.baseURL || "https://api.anthropic.com/v1";
    }

    validator(): void {
        if (!this.apiKey) {
            throw new Error("API key is required for Anthropic.");
        }
        if (!this.baseURL) {
            throw new Error("Base URL is required for Anthropic.");
        }
    }

    private convertMessagesToAnthropic(
        params: ChatCompletionCreateParams
    ): { messages: any[]; system?: string } {
        const messages = [];
        let system: string | undefined;

        for (const msg of params.messages) {
            if (msg.role === "system") {
                // Anthropic handles system messages separately
                system = typeof msg.content === "string" ? msg.content : "";
            } else {
                messages.push({
                    role: msg.role === "assistant" ? "assistant" : "user",
                    content: msg.content,
                });
            }
        }

        return { messages, system };
    }

    private convertAnthropicToOpenAI(anthropicResponse: any): ChatCompletion {
        return {
            id: anthropicResponse.id,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: anthropicResponse.model,
            choices: [
                {
                    index: 0,
                    message: {
                        role: "assistant",
                        content: anthropicResponse.content[0]?.text || "",
                    },
                    finish_reason: anthropicResponse.stop_reason === "end_turn" ? "stop" : "length",
                    logprobs: null,
                },
            ],
            usage: {
                prompt_tokens: anthropicResponse.usage?.input_tokens || 0,
                completion_tokens: anthropicResponse.usage?.output_tokens || 0,
                total_tokens:
                    (anthropicResponse.usage?.input_tokens || 0) +
                    (anthropicResponse.usage?.output_tokens || 0),
            },
        };
    }

    async generateText(params: ChatCompletionCreateParams): Promise<ChatCompletion> {
        this.validator();

        const { messages, system } = this.convertMessagesToAnthropic(params);

        const requestBody: any = {
            model: params.model,
            messages,
            max_tokens: params.max_tokens || 4096,
        };

        if (system) {
            requestBody.system = system;
        }

        if (params.temperature !== undefined) {
            requestBody.temperature = params.temperature;
        }

        if (params.top_p !== undefined) {
            requestBody.top_p = params.top_p;
        }

        const response = await fetch(`${this.baseURL}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${response.status} ${error}`);
        }

        const data = await response.json();
        return this.convertAnthropicToOpenAI(data);
    }

    async streamText(params: ChatCompletionCreateParams): Promise<ProviderChatCompletionStream> {
        this.validator();

        const { messages, system } = this.convertMessagesToAnthropic(params);

        const requestBody: any = {
            model: params.model,
            messages,
            max_tokens: params.max_tokens || 4096,
            stream: true,
        };

        if (system) {
            requestBody.system = system;
        }

        if (params.temperature !== undefined) {
            requestBody.temperature = params.temperature;
        }

        if (params.top_p !== undefined) {
            requestBody.top_p = params.top_p;
        }

        const response = await fetch(`${this.baseURL}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${response.status} ${error}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Failed to get response stream reader");
        }

        let cancelled = false;
        const decoder = new TextDecoder();

        return {
            async *[Symbol.asyncIterator]() {
                try {
                    let buffer = "";

                    while (!cancelled) {
                        const { done, value } = await reader.read();

                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const data = line.slice(6);
                                if (data === "[DONE]") {
                                    return;
                                }

                                try {
                                    const parsed = JSON.parse(data);

                                    if (parsed.type === "content_block_delta") {
                                        yield {
                                            id: parsed.id || "chatcmpl-anthropic",
                                            object: "chat.completion.chunk",
                                            created: Math.floor(Date.now() / 1000),
                                            model: params.model,
                                            choices: [
                                                {
                                                    index: 0,
                                                    delta: {
                                                        content: parsed.delta?.text || "",
                                                    },
                                                    finish_reason: null,
                                                    logprobs: null,
                                                },
                                            ],
                                        };
                                    } else if (parsed.type === "message_stop") {
                                        yield {
                                            id: "chatcmpl-anthropic",
                                            object: "chat.completion.chunk",
                                            created: Math.floor(Date.now() / 1000),
                                            model: params.model,
                                            choices: [
                                                {
                                                    index: 0,
                                                    delta: {},
                                                    finish_reason: "stop",
                                                    logprobs: null,
                                                },
                                            ],
                                        };
                                    }
                                } catch (e) {
                                    // Skip invalid JSON
                                }
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            },
            cancel: () => {
                cancelled = true;
                reader.cancel();
            },
        };
    }

    async generateEmbedding(params: EmbeddingCreateParams): Promise<CreateEmbeddingResponse> {
        throw new Error("Anthropic does not support embedding generation. Use OpenAI or another provider.");
    }
}

export const anthropic = (options: AnthropicOptions = {}) => {
    return new AnthropicAdapter(options);
};
