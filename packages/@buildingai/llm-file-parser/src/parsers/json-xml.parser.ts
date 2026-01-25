/**
 * @fileoverview JSON/XML parser
 * @description Extracts structured content from JSON and XML files
 */

import { parseString } from "xml2js";

import type { ParseOptions, ParseResult, StructuredTextBlock } from "../types";
import { BaseParser } from "./base.parser";

export class JsonXmlParser extends BaseParser {
    canParse(mimeType: string, filename: string): boolean {
        const lowerFilename = filename.toLowerCase();
        return (
            mimeType === "application/json" ||
            mimeType === "application/xml" ||
            mimeType === "text/xml" ||
            mimeType === "text/json" ||
            lowerFilename.endsWith(".json") ||
            lowerFilename.endsWith(".xml") ||
            lowerFilename.endsWith(".jsonl")
        );
    }

    async parse(
        buffer: Buffer,
        filename: string,
        options: ParseOptions = {},
    ): Promise<ParseResult> {
        try {
            const lowerFilename = filename.toLowerCase();
            const isJson = lowerFilename.endsWith(".json") || lowerFilename.endsWith(".jsonl");
            const isXml = lowerFilename.endsWith(".xml");

            // Try to detect format from content if extension is unclear
            const content = buffer.toString("utf-8").trim();
            const detectedIsJson = content.startsWith("{") || content.startsWith("[");
            const detectedIsXml = content.startsWith("<");

            let blocks: StructuredTextBlock[];
            let text: string;

            if (isJson || (!isXml && detectedIsJson)) {
                // Parse JSON
                const result = this.parseJson(content, lowerFilename.endsWith(".jsonl"));
                blocks = result.blocks;
                text = result.text;
            } else if (isXml || detectedIsXml) {
                // Parse XML
                const result = await this.parseXml(content);
                blocks = result.blocks;
                text = result.text;
            } else {
                // Try JSON first, then XML
                try {
                    const result = this.parseJson(content, false);
                    blocks = result.blocks;
                    text = result.text;
                } catch {
                    const result = await this.parseXml(content);
                    blocks = result.blocks;
                    text = result.text;
                }
            }

            return {
                blocks,
                text,
                metadata: {
                    filename,
                    filetype: isJson ? "json" : "xml",
                    size: buffer.length,
                },
            };
        } catch (error) {
            throw new Error(
                `Failed to parse JSON/XML: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }

    /**
     * Parse JSON content
     */
    private parseJson(
        content: string,
        isJsonl: boolean,
    ): { blocks: StructuredTextBlock[]; text: string } {
        const blocks: StructuredTextBlock[] = [];

        if (isJsonl) {
            // JSONL format - one JSON object per line
            const lines = content.split("\n").filter((line) => line.trim());
            const items: string[] = [];

            for (const line of lines) {
                try {
                    const obj = JSON.parse(line);
                    items.push(JSON.stringify(obj, null, 2));
                } catch {
                    // Skip invalid lines
                }
            }

            if (items.length > 0) {
                blocks.push({
                    type: "code",
                    content: items.join("\n\n"),
                });
            }

            return {
                blocks,
                text: items.join("\n\n"),
            };
        }

        // Regular JSON
        try {
            const parsed = JSON.parse(content);
            const formatted = JSON.stringify(parsed, null, 2);

            // Create structured representation
            blocks.push({
                type: "heading",
                level: 1,
                content: "JSON Document",
            });

            // If it's an object, extract key-value pairs
            if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
                const entries = Object.entries(parsed);
                for (const [key, value] of entries) {
                    const valueStr = this.formatJsonValue(value);
                    blocks.push({
                        type: "paragraph",
                        content: `**${key}**: ${valueStr}`,
                    });
                }
            } else {
                // For arrays or primitives, show as code
                blocks.push({
                    type: "code",
                    content: formatted,
                });
            }

            return {
                blocks,
                text: formatted,
            };
        } catch (error) {
            throw new Error(
                `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }

    /**
     * Format JSON value for display
     */
    private formatJsonValue(value: unknown): string {
        if (value === null) return "null";
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (Array.isArray(value)) return `[Array with ${value.length} items]`;
        if (typeof value === "object") return `[Object with ${Object.keys(value).length} keys]`;
        return String(value);
    }

    /**
     * Parse XML content
     */
    private async parseXml(
        content: string,
    ): Promise<{ blocks: StructuredTextBlock[]; text: string }> {
        return new Promise((resolve, reject) => {
            parseString(content, { explicitArray: false, mergeAttrs: true }, (err, result) => {
                if (err) {
                    reject(new Error(`Invalid XML: ${err.message}`));
                    return;
                }

                const blocks: StructuredTextBlock[] = [];

                // Extract root element name
                const rootKey = Object.keys(result)[0];
                blocks.push({
                    type: "heading",
                    level: 1,
                    content: `XML Document: ${rootKey}`,
                });

                // Convert XML to structured text
                const text = this.xmlToText(result, 0);

                // Create code block with formatted XML
                blocks.push({
                    type: "code",
                    content: this.formatXml(content),
                });

                // Also create structured blocks from parsed content
                const structuredBlocks = this.xmlToStructuredBlocks(result);
                blocks.push(...structuredBlocks);

                resolve({
                    blocks,
                    text: text || this.formatXml(content),
                });
            });
        });
    }

    /**
     * Convert XML object to text
     */
    private xmlToText(obj: any, depth: number): string {
        const indent = "  ".repeat(depth);
        let text = "";

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === "object" && value !== null) {
                if (Array.isArray(value)) {
                    for (const item of value) {
                        text += `${indent}${key}:\n${this.xmlToText(item, depth + 1)}`;
                    }
                } else {
                    text += `${indent}${key}:\n${this.xmlToText(value, depth + 1)}`;
                }
            } else {
                text += `${indent}${key}: ${value}\n`;
            }
        }

        return text;
    }

    /**
     * Convert XML object to structured blocks
     */
    private xmlToStructuredBlocks(obj: any): StructuredTextBlock[] {
        const blocks: StructuredTextBlock[] = [];

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === "object" && value !== null) {
                if (Array.isArray(value)) {
                    const items: string[] = [];
                    for (const item of value) {
                        if (typeof item === "string") {
                            items.push(item);
                        } else {
                            items.push(JSON.stringify(item));
                        }
                    }
                    if (items.length > 0) {
                        blocks.push({
                            type: "heading",
                            level: 2,
                            content: key,
                        });
                        blocks.push({
                            type: "list",
                            content: items.join("\n"),
                            items,
                        });
                    }
                } else {
                    blocks.push({
                        type: "heading",
                        level: 2,
                        content: key,
                    });
                    const nestedBlocks = this.xmlToStructuredBlocks(value);
                    blocks.push(...nestedBlocks);
                }
            } else {
                blocks.push({
                    type: "paragraph",
                    content: `**${key}**: ${value}`,
                });
            }
        }

        return blocks;
    }

    /**
     * Format XML with proper indentation
     */
    private formatXml(xml: string): string {
        // Simple XML formatting - can be enhanced with a proper formatter
        return xml
            .replace(/>\s+</g, ">\n<")
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line)
            .join("\n");
    }
}
