/**
 * @fileoverview HTML parser
 * @description Extracts structured content from HTML documents
 */

import * as cheerio from "cheerio";

import type { ParseOptions, ParseResult, StructuredTextBlock } from "../types";
import { BaseParser } from "./base.parser";

export class HtmlParser extends BaseParser {
    canParse(mimeType: string, filename: string): boolean {
        const lowerFilename = filename.toLowerCase();
        return (
            mimeType === "text/html" ||
            mimeType === "application/xhtml+xml" ||
            lowerFilename.endsWith(".html") ||
            lowerFilename.endsWith(".htm") ||
            lowerFilename.endsWith(".xhtml")
        );
    }

    async parse(
        buffer: Buffer,
        filename: string,
        options: ParseOptions = {},
    ): Promise<ParseResult> {
        try {
            const html = buffer.toString("utf-8");
            const $ = cheerio.load(html);

            // Remove script and style tags
            $("script, style, noscript").remove();

            const blocks: StructuredTextBlock[] = [];

            // Extract title
            const title = $("title").text().trim();
            if (title) {
                blocks.push({
                    type: "heading",
                    level: 1,
                    content: title,
                });
            }

            // Extract main content
            const mainContent = $("main, article, .content, #content, body");

            // Process headings
            mainContent.find("h1, h2, h3, h4, h5, h6").each((_, element) => {
                const $el = $(element);
                const level = this.getHeadingLevel(element.tagName);
                const text = $el.text().trim();

                if (text) {
                    blocks.push({
                        type: "heading",
                        level,
                        content: text,
                    });
                }
            });

            // Process paragraphs
            mainContent.find("p").each((_, element) => {
                const $el = $(element);
                const text = $el.text().trim();

                if (text) {
                    blocks.push({
                        type: "paragraph",
                        content: text,
                    });
                }
            });

            // Process lists
            mainContent.find("ul, ol").each((_, element) => {
                const $el = $(element);
                const items: string[] = [];

                $el.find("li").each((_, li) => {
                    const itemText = $(li).text().trim();
                    if (itemText) {
                        items.push(itemText);
                    }
                });

                if (items.length > 0) {
                    blocks.push({
                        type: "list",
                        content: items.join("\n"),
                        items,
                    });
                }
            });

            // Process blockquotes
            mainContent.find("blockquote").each((_, element) => {
                const $el = $(element);
                const text = $el.text().trim();

                if (text) {
                    blocks.push({
                        type: "quote",
                        content: text,
                    });
                }
            });

            // Process code blocks
            mainContent.find("pre, code").each((_, element) => {
                const $el = $(element);
                const text = $el.text().trim();

                if (text && text.length > 10) {
                    // Only add if it's substantial code
                    blocks.push({
                        type: "code",
                        content: text,
                    });
                }
            });

            // Extract plain text as fallback
            const plainText = mainContent.text().trim();

            // If no structured blocks found, create paragraph blocks from plain text
            if (blocks.length === 0 && plainText) {
                const lines = plainText.split("\n").filter((line) => line.trim());
                lines.forEach((line) => {
                    if (line.trim()) {
                        blocks.push({
                            type: "paragraph",
                            content: line.trim(),
                        });
                    }
                });
            }

            return {
                blocks,
                text: this.cleanText(plainText),
                metadata: {
                    filename,
                    filetype: "html",
                    size: buffer.length,
                },
            };
        } catch (error) {
            throw new Error(
                `Failed to parse HTML: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }

    private getHeadingLevel(tagName: string): number {
        const match = tagName.match(/h([1-6])/i);
        return match ? parseInt(match[1], 10) : 1;
    }

    private cleanText(text: string): string {
        return text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/[ \t]+/g, " ")
            .trim();
    }
}
