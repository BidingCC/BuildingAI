/**
 * @fileoverview Base parser interface
 */

import type { ParseOptions, ParseResult, ParseStream } from "../types";

/**
 * Base parser interface
 */
export interface IParser {
    /**
     * Check if this parser can handle the given file type
     */
    canParse(mimeType: string, filename: string): boolean;

    /**
     * Parse file buffer to structured text
     */
    parse(buffer: Buffer, filename: string, options?: ParseOptions): Promise<ParseResult>;

    /**
     * Stream parse file buffer (optional, defaults to non-streaming parse)
     */
    streamParse?(buffer: Buffer, filename: string, options?: ParseOptions): Promise<ParseStream>;
}

/**
 * Abstract base parser class
 */
export abstract class BaseParser implements IParser {
    abstract canParse(mimeType: string, filename: string): boolean;
    abstract parse(buffer: Buffer, filename: string, options?: ParseOptions): Promise<ParseResult>;

    /**
     * Default stream implementation: parse all then stream blocks
     */
    async streamParse(
        buffer: Buffer,
        filename: string,
        options?: ParseOptions,
    ): Promise<ParseStream> {
        const result = await this.parse(buffer, filename, options);
        const generator = this.createStreamFromResult(result);
        return this.createParseStream(generator, result);
    }

    /**
     * Create stream from parse result
     */
    protected async *createStreamFromResult(
        result: ParseResult,
    ): AsyncGenerator<import("../types").ParseStreamChunk> {
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
            metadata: result.metadata,
        };

        // Yield progress: parsing blocks
        const totalBlocks = result.blocks.length;
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
        for (let i = 0; i < result.blocks.length; i++) {
            // Yield progress update every 10 blocks or at the end
            if ((i + 1) % 10 === 0 || i === result.blocks.length - 1) {
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
                blocksCount: result.blocks.length,
                textLength: result.text.length,
                metadata: result.metadata,
            },
        };
    }

    /**
     * Create ParseStream wrapper from async generator
     */
    protected createParseStream(
        generator: AsyncGenerator<import("../types").ParseStreamChunk>,
        finalResult: ParseResult,
    ): ParseStream {
        return {
            [Symbol.asyncIterator]: () => generator,
            finalResult: async () => finalResult,
        };
    }
}
