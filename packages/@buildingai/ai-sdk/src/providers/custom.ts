import { ClientOptions } from "openai";
import { ChatCompletion, ChatCompletionCreateParams } from "openai/resources/index";

import { Adapter, ProviderChatCompletionStream } from "../interfaces/adapter";
import { OpenAIAdapter } from "./openai";

export class CustomAdapter extends OpenAIAdapter implements Adapter {
    constructor(options: ClientOptions) {
        super(options);
    }

    validator(): void {
        if (!this.client.apiKey) {
            throw new Error("apiKey is required");
        }

        if (!this.client.baseURL) {
            throw new Error("baseURL is required");
        }
    }

    async generateText(params: ChatCompletionCreateParams): Promise<ChatCompletion> {
        const response = await this.client.chat.completions.create({
            ...params,
            stream: false,
        });

        return response;
    }

    async streamText(params: ChatCompletionCreateParams): Promise<ProviderChatCompletionStream> {
        const stream = await this.client.chat.completions.create({
            ...params,
            stream: true,
            stream_options: {
                include_usage: true,
            },
        });

        return {
            [Symbol.asyncIterator]() {
                return stream[Symbol.asyncIterator]();
            },
            cancel: () => {
                stream.controller.abort();
            },
        };
    }
}

export const custom = (options: ClientOptions = {}) => {
    return new CustomAdapter(options);
};
