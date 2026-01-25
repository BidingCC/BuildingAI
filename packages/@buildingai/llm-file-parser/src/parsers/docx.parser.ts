/**
 * @fileoverview DOCX parser
 */

import mammoth from "mammoth";

import type { ParseOptions, ParseResult, StructuredTextBlock } from "../types";
import { BaseParser } from "./base.parser";

export class DocxParser extends BaseParser {
    canParse(mimeType: string, filename: string): boolean {
        return (
            mimeType ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            filename.toLowerCase().endsWith(".docx")
        );
    }

    async parse(
        buffer: Buffer,
        filename: string,
        options: ParseOptions = {},
    ): Promise<ParseResult> {
        try {
            // Extract raw text first
            const rawResult = await mammoth.extractRawText({ buffer });
            const text = rawResult.value || "";

            // Extract with formatting to get structure
            const htmlResult = await mammoth.convertToHtml({ buffer });
            const blocks = this.htmlToStructuredBlocks(htmlResult.value, text);

            return {
                blocks,
                text: this.cleanText(text),
                metadata: {
                    filename,
                    filetype: "docx",
                    size: buffer.length,
                },
            };
        } catch (error) {
            throw new Error(
                `Failed to parse DOCX: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }

    private htmlToStructuredBlocks(html: string, fallbackText: string): StructuredTextBlock[] {
        const blocks: StructuredTextBlock[] = [];

        // Extract headings (h1-h6)
        const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
        let match;
        const headingMatches: Array<{ level: number; text: string; index: number }> = [];

        while ((match = headingRegex.exec(html)) !== null) {
            const level = parseInt(match[1], 10);
            const text = this.stripHtml(match[2]);
            headingMatches.push({ level, text, index: match.index });
        }

        // Extract paragraphs
        const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
        const paragraphs: string[] = [];

        while ((match = paragraphRegex.exec(html)) !== null) {
            paragraphs.push(this.stripHtml(match[1]));
        }

        // Extract lists
        const listRegex = /<ul[^>]*>(.*?)<\/ul>|<ol[^>]*>(.*?)<\/ol>/gi;
        const lists: string[][] = [];

        while ((match = listRegex.exec(html)) !== null) {
            const listContent = match[1] || match[2];
            const items = listContent.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
            lists.push(items.map((item) => this.stripHtml(item)));
        }

        // Build structured blocks
        headingMatches.forEach((heading) => {
            blocks.push({
                type: "heading",
                level: heading.level,
                content: heading.text,
            });
        });

        paragraphs.forEach((para) => {
            if (para.trim()) {
                blocks.push({
                    type: "paragraph",
                    content: para.trim(),
                });
            }
        });

        lists.forEach((list) => {
            if (list.length > 0) {
                blocks.push({
                    type: "list",
                    content: list.join("\n"),
                    items: list,
                });
            }
        });

        // Fallback to simple text blocks if no structure found
        if (blocks.length === 0 && fallbackText) {
            const lines = fallbackText.split("\n").filter((line) => line.trim());
            lines.forEach((line) => {
                blocks.push({
                    type: "paragraph",
                    content: line.trim(),
                });
            });
        }

        return blocks;
    }

    private stripHtml(html: string): string {
        return html
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
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
