/**
 * @fileoverview Text parser (TXT, MD, RTF)
 */

import type { ParseOptions, ParseResult, StructuredTextBlock } from "../types";
import { BaseParser } from "./base.parser";

export class TextParser extends BaseParser {
    canParse(mimeType: string, filename: string): boolean {
        const lowerFilename = filename.toLowerCase();
        return (
            mimeType === "text/plain" ||
            mimeType === "text/markdown" ||
            mimeType === "text/rtf" ||
            lowerFilename.endsWith(".txt") ||
            lowerFilename.endsWith(".md") ||
            lowerFilename.endsWith(".markdown") ||
            lowerFilename.endsWith(".rtf")
        );
    }

    async parse(
        buffer: Buffer,
        filename: string,
        options: ParseOptions = {},
    ): Promise<ParseResult> {
        try {
            const lowerFilename = filename.toLowerCase();
            const isRtf = lowerFilename.endsWith(".rtf");
            const isMarkdown = lowerFilename.endsWith(".md") || lowerFilename.endsWith(".markdown");

            let text = buffer.toString("utf-8");

            // Handle RTF format
            if (isRtf) {
                text = this.parseRtf(text);
            }

            // Convert to structured blocks
            const blocks = isMarkdown
                ? this.markdownToStructuredBlocks(text)
                : this.textToStructuredBlocks(text);

            return {
                blocks,
                text: this.cleanText(text),
                metadata: {
                    filename,
                    filetype: isRtf ? "rtf" : isMarkdown ? "md" : "txt",
                    size: buffer.length,
                },
            };
        } catch (error) {
            throw new Error(
                `Failed to parse text file: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }

    private parseRtf(rtfContent: string): string {
        // Remove RTF formatting codes and extract plain text
        return rtfContent
            .replace(/\\[a-z]+\d*\s?/g, "") // Remove RTF control words
            .replace(/[{}]/g, "") // Remove braces
            .replace(/\s+/g, " ") // Normalize whitespace
            .trim();
    }

    private markdownToStructuredBlocks(text: string): StructuredTextBlock[] {
        const blocks: StructuredTextBlock[] = [];
        const lines = text.split("\n");

        let currentParagraph: string[] = [];
        let currentList: string[] = [];
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect headings
            if (line.startsWith("#")) {
                // Flush current paragraph/list
                if (currentParagraph.length > 0) {
                    blocks.push({
                        type: "paragraph",
                        content: currentParagraph.join(" "),
                    });
                    currentParagraph = [];
                }
                if (currentList.length > 0) {
                    blocks.push({
                        type: "list",
                        content: currentList.join("\n"),
                        items: currentList,
                    });
                    currentList = [];
                    inList = false;
                }

                // Extract heading level and content
                const match = line.match(/^(#{1,6})\s+(.+)$/);
                if (match) {
                    const level = match[1].length;
                    const content = match[2];
                    blocks.push({
                        type: "heading",
                        level,
                        content,
                    });
                }
                continue;
            }

            // Detect list items
            if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
                if (!inList && currentParagraph.length > 0) {
                    blocks.push({
                        type: "paragraph",
                        content: currentParagraph.join(" "),
                    });
                    currentParagraph = [];
                }
                inList = true;
                const item = line.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "");
                currentList.push(item);
                continue;
            }

            // Detect code blocks
            if (line.startsWith("```")) {
                if (currentParagraph.length > 0) {
                    blocks.push({
                        type: "paragraph",
                        content: currentParagraph.join(" "),
                    });
                    currentParagraph = [];
                }
                if (currentList.length > 0) {
                    blocks.push({
                        type: "list",
                        content: currentList.join("\n"),
                        items: currentList,
                    });
                    currentList = [];
                    inList = false;
                }

                // Extract code block
                const codeLines: string[] = [];
                i++; // Skip opening ```
                while (i < lines.length && !lines[i].trim().startsWith("```")) {
                    codeLines.push(lines[i]);
                    i++;
                }
                blocks.push({
                    type: "code",
                    content: codeLines.join("\n"),
                });
                continue;
            }

            // Regular paragraph text
            if (line) {
                if (inList) {
                    // Flush list
                    blocks.push({
                        type: "list",
                        content: currentList.join("\n"),
                        items: currentList,
                    });
                    currentList = [];
                    inList = false;
                }
                currentParagraph.push(line);
            } else {
                // Empty line - flush current paragraph
                if (currentParagraph.length > 0) {
                    blocks.push({
                        type: "paragraph",
                        content: currentParagraph.join(" "),
                    });
                    currentParagraph = [];
                }
            }
        }

        // Flush remaining content
        if (currentParagraph.length > 0) {
            blocks.push({
                type: "paragraph",
                content: currentParagraph.join(" "),
            });
        }
        if (currentList.length > 0) {
            blocks.push({
                type: "list",
                content: currentList.join("\n"),
                items: currentList,
            });
        }

        return blocks;
    }

    private textToStructuredBlocks(text: string): StructuredTextBlock[] {
        const blocks: StructuredTextBlock[] = [];
        const lines = text.split("\n").filter((line) => line.trim());

        let currentParagraph: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Detect potential headings (short lines without punctuation)
            if (
                trimmed.length < 100 &&
                !trimmed.match(/[.!?]$/) &&
                trimmed.length > 0 &&
                currentParagraph.length === 0
            ) {
                blocks.push({
                    type: "heading",
                    level: this.detectHeadingLevel(trimmed),
                    content: trimmed,
                });
            } else {
                currentParagraph.push(trimmed);
            }

            // Flush paragraph on empty line or when it gets too long
            if (trimmed === "" || currentParagraph.length > 5) {
                if (currentParagraph.length > 0) {
                    blocks.push({
                        type: "paragraph",
                        content: currentParagraph.join(" "),
                    });
                    currentParagraph = [];
                }
            }
        }

        // Flush remaining paragraph
        if (currentParagraph.length > 0) {
            blocks.push({
                type: "paragraph",
                content: currentParagraph.join(" "),
            });
        }

        return blocks;
    }

    private detectHeadingLevel(text: string): number {
        if (text.length < 30) return 1;
        if (text.length < 50) return 2;
        if (text.length < 70) return 3;
        return 4;
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
