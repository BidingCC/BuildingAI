import type { ParseOptions, ParseResult, ParseStream } from "../types";

export interface IParser {
    canParse(mimeType: string, filename: string): boolean;
    parse(buffer: Buffer, filename: string, options?: ParseOptions): Promise<ParseResult>;
    streamParse?(buffer: Buffer, filename: string, options?: ParseOptions): Promise<ParseStream>;
}

export abstract class BaseParser implements IParser {
    abstract canParse(mimeType: string, filename: string): boolean;
    abstract parse(buffer: Buffer, filename: string, options?: ParseOptions): Promise<ParseResult>;

    async streamParse(
        buffer: Buffer,
        filename: string,
        options?: ParseOptions,
    ): Promise<ParseStream> {
        const result = await this.parse(buffer, filename, options);
        const generator = this.createStreamFromResult(result);
        return this.createParseStream(generator, result);
    }

    protected async *createStreamFromResult(
        result: ParseResult,
    ): AsyncGenerator<import("../types").ParseStreamChunk> {
        yield {
            type: "progress",
            progress: {
                stage: "parsing",
                message: "开始解析文档",
                progress: 0,
            },
        };

        yield {
            type: "metadata",
            metadata: result.metadata,
        };

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

        for (let i = 0; i < result.blocks.length; i++) {
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
