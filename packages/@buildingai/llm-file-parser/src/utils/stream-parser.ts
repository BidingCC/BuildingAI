/**
 * @fileoverview Stream parser utility
 * @description Utilities for streaming document parsing
 */

import type { ParseResult, ParseStream, ParseStreamChunk, StructuredTextBlock } from "../types";

/**
 * Create a stream parser from blocks
 */
export async function* createStreamFromBlocks(
    blocks: StructuredTextBlock[],
    metadata: ParseResult["metadata"],
    text: string,
): AsyncGenerator<ParseStreamChunk> {
    // Yield progress: starting
    yield {
        type: "progress",
        progress: {
            stage: "parsing",
            message: "开始解析文档",
            progress: 0,
        },
    };

    // Yield metadata first
    yield {
        type: "metadata",
        metadata,
    };

    // Yield progress: parsing blocks
    const totalBlocks = blocks.length;
    yield {
        type: "progress",
        progress: {
            stage: "parsing",
            message: `正在解析内容 (0/${totalBlocks})`,
            progress: 10,
            current: 0,
            total: totalBlocks,
        },
    };

    // Yield progress updates without returning content
    for (let i = 0; i < blocks.length; i++) {
        // Yield progress update every 10 blocks or at the end
        if ((i + 1) % 10 === 0 || i === blocks.length - 1) {
            const progress = 10 + Math.floor(((i + 1) / totalBlocks) * 80);
            yield {
                type: "progress",
                progress: {
                    stage: "parsing",
                    message: `正在解析内容 (${i + 1}/${totalBlocks})`,
                    progress,
                    current: i + 1,
                    total: totalBlocks,
                },
            };
        }
    }

    // Yield final statistics
    yield {
        type: "progress",
        progress: {
            stage: "complete",
            message: "解析完成",
            progress: 100,
        },
    };

    yield {
        type: "done",
        stats: {
            blocksCount: blocks.length,
            textLength: text.length,
            metadata,
        },
    };
}

/**
 * Create a stream parser from text chunks
 */
export async function* createStreamFromText(
    textChunks: string[],
    metadata: ParseResult["metadata"],
    blocks: StructuredTextBlock[],
): AsyncGenerator<ParseStreamChunk> {
    // Yield progress: starting
    yield {
        type: "progress",
        progress: {
            stage: "parsing",
            message: "开始解析文档",
            progress: 0,
        },
    };

    // Yield metadata first
    yield {
        type: "metadata",
        metadata,
    };

    const totalChunks = textChunks.length;
    const fullText = textChunks.join("");

    // Yield progress: parsing text chunks
    yield {
        type: "progress",
        progress: {
            stage: "parsing",
            message: `正在解析文本块 (0/${totalChunks})`,
            progress: 10,
            current: 0,
            total: totalChunks,
        },
    };

    // Yield progress updates without returning content
    for (let i = 0; i < textChunks.length; i++) {
        // Yield progress update every 10 chunks or at the end
        if ((i + 1) % 10 === 0 || i === textChunks.length - 1) {
            const progress = 10 + Math.floor(((i + 1) / totalChunks) * 80);
            yield {
                type: "progress",
                progress: {
                    stage: "parsing",
                    message: `正在解析文本块 (${i + 1}/${totalChunks})`,
                    progress,
                    current: i + 1,
                    total: totalChunks,
                },
            };
        }
    }

    // Yield final statistics
    yield {
        type: "progress",
        progress: {
            stage: "complete",
            message: "解析完成",
            progress: 100,
        },
    };

    yield {
        type: "done",
        stats: {
            blocksCount: blocks.length,
            textLength: fullText.length,
            metadata,
        },
    };
}

/**
 * Convert stream to final result
 */
export async function streamToResult(stream: ParseStream): Promise<ParseResult> {
    // Use the stream's finalResult method if available
    if (stream.finalResult) {
        return stream.finalResult();
    }

    // Fallback: collect chunks and reconstruct
    const chunks: ParseStreamChunk[] = [];
    let finalResult: ParseResult | undefined;

    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    // Reconstruct from chunks
    const blocks: StructuredTextBlock[] = [];
    const textParts: string[] = [];
    let metadata: ParseResult["metadata"] = {};

    for (const chunk of chunks) {
        if (chunk.type === "block" && chunk.block) {
            blocks.push(chunk.block);
        }
        if (chunk.type === "text" && chunk.text) {
            textParts.push(chunk.text);
        }
        if (chunk.type === "metadata" && chunk.metadata) {
            metadata = chunk.metadata;
        }
        if (chunk.type === "done" && chunk.stats) {
            // Use stats metadata if available
            if (chunk.stats.metadata) {
                metadata = chunk.stats.metadata;
            }
        }
    }

    return {
        blocks,
        text: textParts.join(""),
        metadata,
    };
}

/**
 * Create a ParseStream with finalResult method
 */
export function createParseStream(generator: AsyncGenerator<ParseStreamChunk>): ParseStream {
    let resultPromise: Promise<ParseResult> | undefined;

    const stream: ParseStream = {
        [Symbol.asyncIterator]() {
            return generator;
        },
        async finalResult() {
            if (!resultPromise) {
                resultPromise = streamToResult(stream);
            }
            return resultPromise;
        },
    };

    return stream;
}
