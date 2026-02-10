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
import {
    llmFileParser,
    type ParseOptions,
    type ParseStreamWithResult,
    StructuredFormatter,
} from "@buildingai/llm-file-parser";
import { WebController } from "@common/decorators/controller.decorator";
import { UploadService } from "@modules/upload/services/upload.service";
import { Body, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";

@WebController("test")
export class TestController extends BaseController {
    private readonly API_KEY = "sk-rMpEIStVGmWNVVCbXUdAncg4ejr0CwH8h6QEKQsDh8B1RPQq";
    private readonly BASE_URL = "https://llm.aipg.work/v1";
    private readonly PROVIDER = "openai";

    constructor(private readonly uploadService: UploadService) {
        super();
    }

    /**
     * Build parse options with smart defaults
     */
    private buildParseOptions(body: {
        useUnstructuredService?: boolean;
        unstructuredApiUrl?: string;
        unstructuredApiKey?: string;
    }): ParseOptions {
        return {
            useUnstructuredService: body.useUnstructuredService || false,
            unstructuredApiUrl: body.unstructuredApiUrl,
            unstructuredApiKey: body.unstructuredApiKey,
        };
    }

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

    /**
     * Parse file from upload - Stream response
     */
    @Post("parse-file-stream")
    @Public()
    @UseInterceptors(FileInterceptor("file"))
    async parseFileStream(
        @UploadedFile() file: Express.Multer.File,
        @Body()
        body: {
            useUnstructuredService?: boolean;
            unstructuredApiUrl?: string;
            unstructuredApiKey?: string;
        },
        @Res() res: Response,
    ) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

        try {
            if (!file) {
                res.write(
                    `data: ${JSON.stringify({ type: "error", data: { message: "文件不能为空" } })}\n\n`,
                );
                res.write("data: [DONE]\n\n");
                res.end();
                return;
            }

            const options = this.buildParseOptions(body);
            const { stream, result } = await llmFileParser.streamParseFromBuffer(
                file.buffer,
                file.originalname,
                file.mimetype,
                options,
            );

            // Start consuming the result promise in the background
            result
                .then((parseResult) => {
                    console.log("parse result", parseResult);
                })
                .catch((error) => {
                    console.error("Parse result error:", error);
                });

            for await (const chunk of stream) {
                if (chunk.type === "metadata") {
                    res.write(
                        `data: ${JSON.stringify({
                            type: "metadata",
                            data: chunk.metadata,
                        })}\n\n`,
                    );
                } else if (chunk.type === "progress" && chunk.progress) {
                    res.write(
                        `data: ${JSON.stringify({
                            type: "progress",
                            data: chunk.progress,
                        })}\n\n`,
                    );
                } else if (chunk.type === "done" && chunk.stats) {
                    res.write(
                        `data: ${JSON.stringify({
                            type: "done",
                            data: chunk.stats,
                        })}\n\n`,
                    );
                }
            }

            res.write("data: [DONE]\n\n");
            res.end();
        } catch (error) {
            res.write(
                `data: ${JSON.stringify({
                    type: "error",
                    data: {
                        message: error instanceof Error ? error.message : "Unknown error",
                        stack: error instanceof Error ? error.stack : undefined,
                    },
                })}\n\n`,
            );
            res.write("data: [DONE]\n\n");
            res.end();
        }
    }

    /**
     * Parse file from URL - Stream response
     */
    @Post("parse-url-stream")
    @Public()
    async parseUrlStream(
        @Body()
        body: {
            url: string;
            useUnstructuredService?: boolean;
            unstructuredApiUrl?: string;
            unstructuredApiKey?: string;
        },
        @Res() res: Response,
    ) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

        try {
            if (!body.url) {
                res.write(
                    `data: ${JSON.stringify({ type: "error", data: { message: "URL不能为空" } })}\n\n`,
                );
                res.write("data: [DONE]\n\n");
                res.end();
                return;
            }

            const options = this.buildParseOptions(body);
            const { stream, result } = await llmFileParser.streamParseFromUrl(body.url, options);

            // Start consuming the result promise in the background
            result
                .then((parseResult) => {
                    console.log("parse result", parseResult);
                })
                .catch((error) => {
                    console.error("Parse result error:", error);
                });

            for await (const chunk of stream) {
                if (chunk.type === "metadata") {
                    res.write(
                        `data: ${JSON.stringify({
                            type: "metadata",
                            data: chunk.metadata,
                        })}\n\n`,
                    );
                } else if (chunk.type === "progress" && chunk.progress) {
                    res.write(
                        `data: ${JSON.stringify({
                            type: "progress",
                            data: chunk.progress,
                        })}\n\n`,
                    );
                } else if (chunk.type === "done" && chunk.stats) {
                    res.write(
                        `data: ${JSON.stringify({
                            type: "done",
                            data: chunk.stats,
                        })}\n\n`,
                    );
                }
            }

            res.write("data: [DONE]\n\n");
            res.end();
        } catch (error) {
            res.write(
                `data: ${JSON.stringify({
                    type: "error",
                    data: {
                        message: error instanceof Error ? error.message : "Unknown error",
                        stack: error instanceof Error ? error.stack : undefined,
                    },
                })}\n\n`,
            );
            res.write("data: [DONE]\n\n");
            res.end();
        }
    }

    /**
     * Parse file from upload - Static response
     */
    @Post("parse-file")
    @Public()
    @UseInterceptors(FileInterceptor("file"))
    async parseFile(
        @UploadedFile() file: Express.Multer.File,
        @Body()
        body: {
            useUnstructuredService?: boolean;
            unstructuredApiUrl?: string;
            unstructuredApiKey?: string;
        },
    ) {
        try {
            if (!file) {
                return {
                    success: false,
                    error: "文件不能为空",
                };
            }

            const options = this.buildParseOptions(body);
            const result = await llmFileParser.parseFromBuffer(
                file.buffer,
                file.originalname,
                file.mimetype,
                options,
            );

            const formattedText = llmFileParser.formatForLLM(result);

            return {
                success: true,
                data: {
                    metadata: result.metadata,
                    blocks: result.blocks,
                    text: result.text,
                    formattedText,
                    blocksCount: result.blocks.length,
                    textLength: result.text.length,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
            };
        }
    }

    /**
     * Parse file from URL - Static response
     */
    @Post("parse-url")
    @Public()
    async parseUrl(
        @Body()
        body: {
            url: string;
            useUnstructuredService?: boolean;
            unstructuredApiUrl?: string;
            unstructuredApiKey?: string;
        },
    ) {
        try {
            if (!body.url) {
                return {
                    success: false,
                    error: "URL不能为空",
                };
            }

            const options = this.buildParseOptions(body);
            const result = await llmFileParser.parseFromUrl(body.url, options);

            const formattedText = llmFileParser.formatForLLM(result);

            return {
                success: true,
                data: {
                    metadata: result.metadata,
                    blocks: result.blocks,
                    text: result.text,
                    formattedText,
                    blocksCount: result.blocks.length,
                    textLength: result.text.length,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
            };
        }
    }
}
