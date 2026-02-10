/**
 * @fileoverview PowerPoint (PPTX) parser
 * @description Enhanced PPTX parser that extracts structured content from PowerPoint presentations
 */

import AdmZip from "adm-zip";

import type { ParseOptions, ParseResult, StructuredTextBlock } from "../types";
import { BaseParser } from "./base.parser";

export class PptxParser extends BaseParser {
    canParse(mimeType: string, filename: string): boolean {
        return (
            mimeType ===
                "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
            filename.toLowerCase().endsWith(".pptx")
        );
    }

    async parse(
        buffer: Buffer,
        filename: string,
        options: ParseOptions = {},
    ): Promise<ParseResult> {
        try {
            const zip = new AdmZip(buffer);
            const zipEntries = zip.getEntries();

            const blocks: StructuredTextBlock[] = [];
            const slides: string[] = [];

            // Extract slide content
            for (const entry of zipEntries) {
                if (
                    entry.entryName.startsWith("ppt/slides/slide") &&
                    entry.entryName.endsWith(".xml")
                ) {
                    const slideContent = entry.getData().toString("utf-8");
                    const slideText = this.extractTextFromSlide(slideContent);

                    if (slideText.trim()) {
                        const slideNumber = this.extractSlideNumber(entry.entryName);

                        // Add slide as heading
                        blocks.push({
                            type: "heading",
                            level: 1,
                            content: `Slide ${slideNumber}`,
                        });

                        // Add slide content as structured blocks
                        const slideBlocks = this.textToStructuredBlocks(slideText);
                        blocks.push(...slideBlocks);

                        slides.push(`[Slide ${slideNumber}]\n${slideText}`);
                    }
                }
            }

            const text = slides.join("\n\n") || "[PowerPoint file has no text content]";

            return {
                blocks,
                text,
                metadata: {
                    filename,
                    filetype: "pptx",
                    size: buffer.length,
                    pages: slides.length,
                },
            };
        } catch (error) {
            throw new Error(
                `Failed to parse PPTX: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }

    /**
     * Extract text from slide XML content
     */
    private extractTextFromSlide(xmlContent: string): string {
        const textParts: string[] = [];

        // Extract text from <a:t> tags (text runs)
        const textRegex = /<a:t[^>]*>([^<]*)<\/a:t>/gi;
        let match;

        while ((match = textRegex.exec(xmlContent)) !== null) {
            const text = match[1]
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, " ")
                .trim();

            if (text) {
                textParts.push(text);
            }
        }

        // Also extract from <p:txBody> paragraphs
        const paragraphRegex = /<a:p[^>]*>(.*?)<\/a:p>/gi;
        while ((match = paragraphRegex.exec(xmlContent)) !== null) {
            const paraContent = match[1];
            const paraText = this.extractTextFromXml(paraContent);
            if (paraText.trim()) {
                textParts.push(paraText);
            }
        }

        return textParts.join("\n");
    }

    /**
     * Extract text from XML content recursively
     */
    private extractTextFromXml(xml: string): string {
        // Remove all XML tags and decode entities
        return xml
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    /**
     * Extract slide number from entry name
     */
    private extractSlideNumber(entryName: string): number {
        const match = entryName.match(/slide(\d+)\.xml/);
        return match ? parseInt(match[1], 10) : 0;
    }

    /**
     * Convert text to structured blocks
     */
    private textToStructuredBlocks(text: string): StructuredTextBlock[] {
        const blocks: StructuredTextBlock[] = [];
        const lines = text.split("\n").filter((line) => line.trim());

        let currentParagraph: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Detect potential headings (short lines)
            if (trimmed.length < 80 && trimmed.length > 0 && currentParagraph.length === 0) {
                blocks.push({
                    type: "heading",
                    level: 2,
                    content: trimmed,
                });
            } else {
                currentParagraph.push(trimmed);
            }

            // Flush paragraph on empty line
            if (trimmed === "" && currentParagraph.length > 0) {
                blocks.push({
                    type: "paragraph",
                    content: currentParagraph.join(" "),
                });
                currentParagraph = [];
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
}
