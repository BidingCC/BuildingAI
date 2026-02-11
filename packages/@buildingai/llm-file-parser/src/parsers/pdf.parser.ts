import pdf from "pdf-parse";

import type { ParseOptions, ParseResult, StructuredTextBlock } from "../types";
import { BaseParser } from "./base.parser";

export class PdfParser extends BaseParser {
    canParse(mimeType: string, filename: string): boolean {
        return mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
    }

    async parse(
        buffer: Buffer,
        filename: string,
        _options: ParseOptions = {},
    ): Promise<ParseResult> {
        try {
            const data = await pdf(buffer);
            const text = data.text || "";

            const blocks = this.textToStructuredBlocks(text, data.numpages);

            return {
                blocks,
                text,
                metadata: {
                    filename,
                    filetype: "pdf",
                    size: buffer.length,
                    pages: data.numpages,
                },
            };
        } catch (error) {
            throw new Error(
                `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }

    private textToStructuredBlocks(text: string, _pages?: number): StructuredTextBlock[] {
        const blocks: StructuredTextBlock[] = [];
        const lines = text.split("\n").filter((line) => line.trim());

        let currentParagraph: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.length < 100 && !trimmed.match(/[.!?]$/) && trimmed.length > 0) {
                if (currentParagraph.length > 0) {
                    blocks.push({
                        type: "paragraph",
                        content: currentParagraph.join(" "),
                    });
                    currentParagraph = [];
                }

                const level = this.detectHeadingLevel(trimmed);
                blocks.push({
                    type: "heading",
                    level,
                    content: trimmed,
                });
            } else {
                currentParagraph.push(trimmed);
            }
        }

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
}
