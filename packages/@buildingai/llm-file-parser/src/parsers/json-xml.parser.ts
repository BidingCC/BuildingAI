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
        _options: ParseOptions = {},
    ): Promise<ParseResult> {
        try {
            const lowerFilename = filename.toLowerCase();
            const isJson = lowerFilename.endsWith(".json") || lowerFilename.endsWith(".jsonl");
            const isXml = lowerFilename.endsWith(".xml");
            const content = buffer.toString("utf-8").trim();

            let blocks: StructuredTextBlock[];
            let text: string;
            let filetype: string;

            if (isJson) {
                const result = this.parseJson(content, lowerFilename.endsWith(".jsonl"));
                blocks = result.blocks;
                text = result.text;
                filetype = "json";
            } else if (isXml) {
                const result = await this.parseXml(content);
                blocks = result.blocks;
                text = result.text;
                filetype = "xml";
            } else {
                try {
                    const result = this.parseJson(content, false);
                    blocks = result.blocks;
                    text = result.text;
                    filetype = "json";
                } catch {
                    const result = await this.parseXml(content);
                    blocks = result.blocks;
                    text = result.text;
                    filetype = "xml";
                }
            }

            return {
                blocks,
                text,
                metadata: {
                    filename,
                    filetype,
                    size: buffer.length,
                },
            };
        } catch (error) {
            throw new Error(
                `Failed to parse JSON/XML: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }

    private parseJson(
        content: string,
        isJsonl: boolean,
    ): { blocks: StructuredTextBlock[]; text: string } {
        const blocks: StructuredTextBlock[] = [];

        if (isJsonl) {
            const lines = content.split("\n").filter((line) => line.trim());
            const items: string[] = [];

            for (const line of lines) {
                try {
                    const obj = JSON.parse(line);
                    items.push(JSON.stringify(obj, null, 2));
                } catch {
                    continue;
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

        try {
            const parsed = JSON.parse(content);
            const formatted = JSON.stringify(parsed, null, 2);

            blocks.push({
                type: "heading",
                level: 1,
                content: "JSON Document",
            });

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

    private formatJsonValue(value: unknown): string {
        if (value === null) return "null";
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (Array.isArray(value)) return `[Array with ${value.length} items]`;
        if (typeof value === "object") return `[Object with ${Object.keys(value).length} keys]`;
        return String(value);
    }

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

                const rootKey = Object.keys(result)[0];
                blocks.push({
                    type: "heading",
                    level: 1,
                    content: `XML Document: ${rootKey}`,
                });

                const text = this.xmlToText(result, 0);

                blocks.push({
                    type: "code",
                    content: this.formatXml(content),
                });

                const structuredBlocks = this.xmlToStructuredBlocks(result);
                blocks.push(...structuredBlocks);

                resolve({
                    blocks,
                    text: text || this.formatXml(content),
                });
            });
        });
    }

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

    private formatXml(xml: string): string {
        return xml
            .replace(/>\s+</g, ">\n<")
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line)
            .join("\n");
    }
}
