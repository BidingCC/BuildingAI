/**
 * @fileoverview Unstructured.io service parser
 * @description Integrates with unstructured.io API for advanced document parsing
 */

import type {
    ParseOptions,
    ParseResult,
    StructuredTextBlock,
    UnstructuredElement,
} from "../types";
import { BaseParser } from "./base.parser";

export class UnstructuredParser extends BaseParser {
    canParse(_mimeType: string, _filename: string): boolean {
        // Can parse any file type if unstructured service is available
        return true;
    }

    async parse(
        buffer: Buffer,
        filename: string,
        options: ParseOptions = {},
    ): Promise<ParseResult> {
        const { unstructuredApiUrl, unstructuredApiKey, useUnstructuredService } = options;

        if (!useUnstructuredService || !unstructuredApiUrl) {
            throw new Error("Unstructured service is not configured");
        }

        try {
            // Call unstructured.io API
            const formData = new FormData();
            const blob = new Blob([new Uint8Array(buffer)], { type: "application/octet-stream" });
            formData.append("files", blob, filename);

            const headers: Record<string, string> = {};
            if (unstructuredApiKey) {
                headers["unstructured-api-key"] = unstructuredApiKey;
            }

            const response = await fetch(`${unstructuredApiUrl}/general/v0/general`, {
                method: "POST",
                headers,
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                throw new Error(
                    `Unstructured API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
                );
            }

            const elements: UnstructuredElement[] = await response.json();

            // Convert unstructured elements to structured blocks
            const blocks = this.elementsToBlocks(elements);
            const text = this.blocksToText(blocks);

            return {
                blocks,
                text,
                elements,
                metadata: {
                    filename,
                    filetype: this.getFileType(filename),
                    size: buffer.length,
                },
            };
        } catch (error) {
            throw new Error(
                `Failed to parse with unstructured: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }

    private elementsToBlocks(elements: UnstructuredElement[]): StructuredTextBlock[] {
        const blocks: StructuredTextBlock[] = [];

        for (const element of elements) {
            const block = this.elementToBlock(element);
            if (block) {
                blocks.push(block);
            }
        }

        return blocks;
    }

    private elementToBlock(element: UnstructuredElement): StructuredTextBlock | null {
        if (!element.text || !element.text.trim()) {
            return null;
        }

        const type = element.type as string;

        switch (type) {
            case "Title":
                return {
                    type: "heading",
                    level: 1,
                    content: element.text.trim(),
                    metadata: element.metadata,
                };

            case "NarrativeText":
            case "Text":
                return {
                    type: "paragraph",
                    content: element.text.trim(),
                    metadata: element.metadata,
                };

            case "ListItem":
                return {
                    type: "list",
                    content: element.text.trim(),
                    items: [element.text.trim()],
                    metadata: element.metadata,
                };

            case "Table":
                return {
                    type: "table",
                    content: element.text.trim(),
                    metadata: element.metadata,
                };

            default:
                return {
                    type: "paragraph",
                    content: element.text.trim(),
                    metadata: element.metadata,
                };
        }
    }

    private blocksToText(blocks: StructuredTextBlock[]): string {
        return blocks
            .map((block) => {
                switch (block.type) {
                    case "heading":
                        return `# ${block.content}`;
                    case "paragraph":
                        return block.content;
                    case "list":
                        return block.items?.map((item) => `- ${item}`).join("\n") || block.content;
                    default:
                        return block.content;
                }
            })
            .join("\n\n");
    }

    private getFileType(filename: string): string {
        const ext = filename.split(".").pop()?.toLowerCase() || "";
        return ext;
    }
}
