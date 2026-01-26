/**
 * @fileoverview LLM File Parser
 * @description A comprehensive document parser that extracts structured text from various file formats
 *              Designed specifically for LLM consumption with clean, well-organized output
 */

import { StructuredFormatter } from "./formatters/structured.formatter";
import { getParser } from "./parsers";
import { UnstructuredParser } from "./parsers/unstructured.parser";
import type {
    ParseOptions,
    ParseResult,
    ParseStream,
    ParseStreamWithResult,
    StructuredTextBlock,
} from "./types";
import { downloadFile } from "./utils/file-downloader";
import { createParseStream } from "./utils/stream-parser";

/**
 * Main document parser class
 */
export class LLMFileParser {
    private formatter = new StructuredFormatter();

    /**
     * Parse document from URL
     * @param url HTTP/HTTPS URL to the document
     * @param options Parsing options
     * @returns Structured parse result
     */
    async parseFromUrl(url: string, options: ParseOptions = {}): Promise<ParseResult> {
        // Download file
        const file = await downloadFile(url, options);

        // Use unstructured service if configured
        if (options.useUnstructuredService && options.unstructuredApiUrl) {
            const unstructuredParser = new UnstructuredParser();
            return unstructuredParser.parse(file.buffer, file.filename, options);
        }

        // Find appropriate parser
        const parser = getParser(file.mimeType, file.filename);

        if (!parser) {
            throw new Error(
                `Unsupported file type: ${file.mimeType}. Supported types: PDF, DOCX, PPTX, XLSX, XLS, TXT, MD, CSV, RTF, HTML, JSON, XML`,
            );
        }

        // Parse document
        const result = await parser.parse(file.buffer, file.filename, options);

        return result;
    }

    /**
     * Parse document from buffer
     * @param buffer File buffer
     * @param filename Filename (for type detection)
     * @param mimeType MIME type (optional)
     * @param options Parsing options
     * @returns Structured parse result
     */
    async parseFromBuffer(
        buffer: Buffer,
        filename: string,
        mimeType?: string,
        options: ParseOptions = {},
    ): Promise<ParseResult> {
        // Use unstructured service if configured
        if (options.useUnstructuredService && options.unstructuredApiUrl) {
            const unstructuredParser = new UnstructuredParser();
            return unstructuredParser.parse(buffer, filename, options);
        }

        // Find appropriate parser
        const parser = getParser(mimeType || "application/octet-stream", filename);

        if (!parser) {
            throw new Error(
                `Unsupported file type: ${mimeType || "unknown"}. Supported types: PDF, DOCX, PPTX, XLSX, XLS, TXT, MD, CSV, RTF, HTML, JSON, XML`,
            );
        }

        // Parse document
        const result = await parser.parse(buffer, filename, options);

        return result;
    }

    /**
     * Format parse result to structured text for LLM
     * @param result Parse result
     * @returns Formatted text string
     */
    formatForLLM(result: ParseResult): string {
        return this.formatter.format(result);
    }

    /**
     * Parse and format in one call (convenience method)
     * @param url HTTP/HTTPS URL to the document
     * @param options Parsing options
     * @returns Formatted text string ready for LLM
     */
    async parseAndFormat(url: string, options: ParseOptions = {}): Promise<string> {
        const result = await this.parseFromUrl(url, options);
        return this.formatForLLM(result);
    }

    /**
     * Stream parse document from URL
     * @param url HTTP/HTTPS URL to the document
     * @param options Parsing options
     * @returns Stream parse result with both stream and result promise
     */
    async streamParseFromUrl(
        url: string,
        options: ParseOptions = {},
    ): Promise<ParseStreamWithResult> {
        // Download file
        const file = await downloadFile(url, options);

        // Use unstructured service if configured
        if (options.useUnstructuredService && options.unstructuredApiUrl) {
            const unstructuredParser = new UnstructuredParser();
            if (unstructuredParser.streamParse) {
                const stream = await unstructuredParser.streamParse(
                    file.buffer,
                    file.filename,
                    options,
                );
                return {
                    stream,
                    result: stream.finalResult(),
                };
            }
            // Fallback to regular parse
            const result = await unstructuredParser.parse(file.buffer, file.filename, options);
            const stream = createParseStream(this.createStreamFromResult(result));
            return {
                stream,
                result: Promise.resolve(result),
            };
        }

        // Find appropriate parser
        const parser = getParser(file.mimeType, file.filename);

        if (!parser) {
            throw new Error(
                `Unsupported file type: ${file.mimeType}. Supported types: PDF, DOCX, PPTX, XLSX, XLS, TXT, MD, CSV, RTF, HTML, JSON, XML`,
            );
        }

        // Stream parse document
        if (parser.streamParse) {
            const stream = await parser.streamParse(file.buffer, file.filename, options);
            return {
                stream,
                result: stream.finalResult(),
            };
        }

        // Fallback to regular parse then stream
        const result = await parser.parse(file.buffer, file.filename, options);
        const stream = createParseStream(this.createStreamFromResult(result));
        return {
            stream,
            result: Promise.resolve(result),
        };
    }

    /**
     * Stream parse document from buffer
     * @param buffer File buffer
     * @param filename Filename (for type detection)
     * @param mimeType MIME type (optional)
     * @param options Parsing options
     * @returns Stream parse result with both stream and result promise
     */
    async streamParseFromBuffer(
        buffer: Buffer,
        filename: string,
        mimeType?: string,
        options: ParseOptions = {},
    ): Promise<ParseStreamWithResult> {
        // Use unstructured service if configured
        if (options.useUnstructuredService && options.unstructuredApiUrl) {
            const unstructuredParser = new UnstructuredParser();
            if (unstructuredParser.streamParse) {
                const stream = await unstructuredParser.streamParse(buffer, filename, options);
                return {
                    stream,
                    result: stream.finalResult(),
                };
            }
            // Fallback to regular parse
            const result = await unstructuredParser.parse(buffer, filename, options);
            const stream = createParseStream(this.createStreamFromResult(result));
            return {
                stream,
                result: Promise.resolve(result),
            };
        }

        // Find appropriate parser
        const parser = getParser(mimeType || "application/octet-stream", filename);

        if (!parser) {
            throw new Error(
                `Unsupported file type: ${mimeType || "unknown"}. Supported types: PDF, DOCX, PPTX, XLSX, XLS, TXT, MD, CSV, RTF, HTML, JSON, XML`,
            );
        }

        // Stream parse document
        if (parser.streamParse) {
            const stream = await parser.streamParse(buffer, filename, options);
            return {
                stream,
                result: stream.finalResult(),
            };
        }

        // Fallback to regular parse then stream
        const result = await parser.parse(buffer, filename, options);
        const stream = createParseStream(this.createStreamFromResult(result));
        return {
            stream,
            result: Promise.resolve(result),
        };
    }

    /**
     * Stream parse and format in one call
     * @param url HTTP/HTTPS URL to the document
     * @param options Parsing options
     * @returns Async generator that yields formatted text chunks
     */
    async *streamParseAndFormat(url: string, options: ParseOptions = {}): AsyncGenerator<string> {
        const { stream } = await this.streamParseFromUrl(url, options);
        const blocks: StructuredTextBlock[] = [];
        let metadata: ParseResult["metadata"] = {};

        for await (const chunk of stream) {
            if (chunk.type === "block" && chunk.block) {
                blocks.push(chunk.block);
                const formatted = this.formatter.formatBlock(chunk.block);
                yield formatted;
            } else if (chunk.type === "text" && chunk.text) {
                yield chunk.text;
            } else if (chunk.type === "metadata" && chunk.metadata) {
                metadata = chunk.metadata;
            } else if (chunk.type === "done") {
                // Final result already yielded through blocks
                break;
            }
        }
    }

    /**
     * Create stream from parse result
     */
    private async *createStreamFromResult(
        result: ParseResult,
    ): AsyncGenerator<import("./types").ParseStreamChunk> {
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
}

// Export singleton instance
export const llmFileParser = new LLMFileParser();

// Export types
export type {
    ElementType,
    ParseOptions,
    ParseProgress,
    ParseResult,
    ParseStream,
    ParseStreamChunk,
    ParseStreamWithResult,
    StructuredTextBlock,
    UnstructuredElement,
} from "./types";

// Export formatters
export { StructuredFormatter } from "./formatters/structured.formatter";

// Export parsers
export type { IParser } from "./parsers";
export { getParser } from "./parsers";
export {
    DocxParser,
    ExcelParser,
    HtmlParser,
    JsonXmlParser,
    PdfParser,
    PptxParser,
    TextParser,
} from "./parsers";
export { UnstructuredParser } from "./parsers/unstructured.parser";
