/**
 * @fileoverview Structured text formatter for LLM
 * @description Formats structured blocks into clean, well-organized text for LLM consumption
 */

import type { ParseResult, StructuredTextBlock } from "../types";

/**
 * Format structured blocks to clean text for LLM
 */
export class StructuredFormatter {
    /**
     * Format parse result to structured text
     */
    format(result: ParseResult): string {
        const sections: string[] = [];

        // Add document header if metadata available
        if (result.metadata.filename) {
            sections.push(`# Document: ${result.metadata.filename}\n`);
        }

        // Format each block
        for (const block of result.blocks) {
            const formatted = this.formatBlock(block);
            if (formatted) {
                sections.push(formatted);
            }
        }

        return sections.join("\n\n").trim();
    }

    /**
     * Format a single block (public for stream usage)
     */
    formatBlock(block: StructuredTextBlock): string {
        switch (block.type) {
            case "heading":
                return this.formatHeading(block);
            case "paragraph":
                return this.formatParagraph(block);
            case "list":
                return this.formatList(block);
            case "table":
                return this.formatTable(block);
            case "code":
                return this.formatCode(block);
            case "quote":
                return this.formatQuote(block);
            default:
                return block.content;
        }
    }

    private formatHeading(block: StructuredTextBlock): string {
        const level = block.level || 1;
        const prefix = "#".repeat(level);
        return `${prefix} ${block.content}`;
    }

    private formatParagraph(block: StructuredTextBlock): string {
        // Clean up paragraph: remove extra spaces, normalize line breaks
        const cleaned = block.content.replace(/\s+/g, " ").replace(/\n\s+/g, " ").trim();

        return cleaned;
    }

    private formatList(block: StructuredTextBlock): string {
        if (block.items && block.items.length > 0) {
            return block.items.map((item) => `- ${item.trim()}`).join("\n");
        }
        return block.content;
    }

    private formatTable(block: StructuredTextBlock): string {
        // For tables, return as structured text
        return `[Table]\n${block.content}`;
    }

    private formatCode(block: StructuredTextBlock): string {
        return `\`\`\`\n${block.content}\n\`\`\``;
    }

    private formatQuote(block: StructuredTextBlock): string {
        const lines = block.content.split("\n");
        return lines.map((line) => `> ${line}`).join("\n");
    }

    /**
     * Format to markdown-like structure (more compact)
     */
    formatToMarkdown(result: ParseResult): string {
        return this.format(result);
    }

    /**
     * Format to plain text with structure indicators
     */
    formatToPlainText(result: ParseResult): string {
        const sections: string[] = [];

        for (const block of result.blocks) {
            switch (block.type) {
                case "heading":
                    sections.push(`\n${"=".repeat(50)}\n${block.content}\n${"=".repeat(50)}`);
                    break;
                case "paragraph":
                    sections.push(block.content);
                    break;
                case "list":
                    if (block.items) {
                        sections.push(block.items.map((item) => `  • ${item}`).join("\n"));
                    }
                    break;
                default:
                    sections.push(block.content);
            }
        }

        return sections.join("\n\n").trim();
    }
}
