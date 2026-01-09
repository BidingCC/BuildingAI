import {
    embed,
    embedMany,
    getProvider,
    getProviderForEmbedding,
    getProviderForText,
    rerankV3,
    streamText,
} from "@buildingai/ai-sdk-new";
import { BaseController } from "@buildingai/base";
import { Public } from "@buildingai/decorators/public.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Post, Res } from "@nestjs/common";
import type { Response } from "express";

@WebController("test")
export class TestController extends BaseController {
    private readonly API_KEY = "sk-rMpEIStVGmWNVVCbXUdAncg4ejr0CwH8h6QEKQsDh8B1RPQq";
    private readonly BASE_URL = "https://llm.aipg.work/v1";
    private readonly PROVIDER = "openai";

    @Post("embedding")
    @Public()
    async testEmbedding(@Body() body: { text: string }) {
        const provider = getProviderForEmbedding(this.PROVIDER, {
            apiKey: this.API_KEY,
            baseURL: this.BASE_URL,
        });

        const result = await embed({
            ...provider("nomic-embed-text:latest"),
            value: body.text || "Hello, world!",
        });

        return {
            success: true,
            data: {
                embedding: result.embedding,
                dimensions: result.embedding.length,
            },
        };
    }

    @Post("embedding-many")
    @Public()
    async testEmbeddingMany(@Body() body: { texts: string[] }) {
        const provider = getProviderForEmbedding(this.PROVIDER, {
            apiKey: this.API_KEY,
            baseURL: this.BASE_URL,
        });

        const result = await embedMany({
            ...provider("nomic-embed-text:latest"),
            values: body.texts || ["Hello", "World"],
        });

        return {
            success: true,
            data: {
                embeddings: result.embeddings,
                count: result.embeddings.length,
                dimensions: result.embeddings[0]?.length || 0,
            },
        };
    }

    @Post("chat")
    @Public()
    async testChat(@Body() body: { prompt: string; model?: string }, @Res() res: Response) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

        const provider = getProviderForText(this.PROVIDER, {
            apiKey: this.API_KEY,
            baseURL: this.BASE_URL,
        });

        try {
            const result = streamText({
                ...provider(body.model || "gpt-4o-mini"),
                messages: [
                    {
                        role: "user",
                        content: [
                            // {
                            //     type: "image",
                            //     image: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
                            // },
                            {
                                type: "text",
                                text: body.prompt || "Hello, how are you?",
                            },
                        ],
                    },
                ],
                onError: (error) => {
                    throw error;
                },
            });

            for await (const textDelta of result.textStream) {
                res.write(`data: ${JSON.stringify({ type: "text", data: textDelta })}\n\n`);
            }

            const finalResult = await result;
            res.write(
                `data: ${JSON.stringify({
                    type: "done",
                    data: {
                        usage: finalResult.usage,
                        finishReason: finalResult.finishReason,
                    },
                })}\n\n`,
            );
            res.write("data: [DONE]\n\n");
            res.end();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : error.error;
            const errorDetails = JSON.parse(errorMessage.responseBody).error.message;
            console.log("--------------------------------errorMessage", errorMessage);
            res.write(
                `data: ${JSON.stringify({
                    type: "error",
                    data: { message: errorDetails },
                })}\n\n`,
            );
            res.end();
        }
    }

    @Post("rerank")
    @Public()
    async testRerank(
        @Body()
        body: {
            query: string;
            documents: string[];
            topN?: number;
        },
    ) {
        const provider = getProvider(this.PROVIDER, {
            apiKey: this.API_KEY,
            baseURL: this.BASE_URL,
        });

        const result = await rerankV3({
            ...provider("BAAI/bge-reranker-v2-m3"),
            query: body.query || "AI technology",
            documents: body.documents || [
                "Machine learning is a subset of AI",
                "Deep learning uses neural networks",
                "Natural language processing enables text understanding",
            ],
            topN: body.topN || 2,
        });

        return {
            success: true,
            data: {
                ranking: result.ranking.map((item) => ({
                    index: item.originalIndex,
                    relevanceScore: item.score,
                })),
                count: result.ranking.length,
            },
        };
    }
}
