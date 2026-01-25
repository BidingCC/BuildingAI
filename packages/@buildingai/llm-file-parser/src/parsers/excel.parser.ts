/**
 * @fileoverview Excel parser (XLSX, XLS, CSV)
 */

import * as XLSX from "xlsx";

import type { ParseOptions, ParseResult, StructuredTextBlock } from "../types";
import { BaseParser } from "./base.parser";

export class ExcelParser extends BaseParser {
    canParse(mimeType: string, filename: string): boolean {
        const lowerFilename = filename.toLowerCase();
        return (
            mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            mimeType === "application/vnd.ms-excel" ||
            mimeType === "text/csv" ||
            lowerFilename.endsWith(".xlsx") ||
            lowerFilename.endsWith(".xls") ||
            lowerFilename.endsWith(".csv")
        );
    }

    async parse(
        buffer: Buffer,
        filename: string,
        options: ParseOptions = {},
    ): Promise<ParseResult> {
        try {
            const lowerFilename = filename.toLowerCase();
            const isCsv = lowerFilename.endsWith(".csv") || buffer.toString("utf-8").includes(",");

            let workbook: XLSX.WorkBook;

            if (isCsv) {
                // Parse CSV
                const csvContent = buffer.toString("utf-8");
                workbook = XLSX.read(csvContent, {
                    type: "string",
                    raw: false,
                });
            } else {
                // Parse Excel
                workbook = XLSX.read(buffer, {
                    type: "buffer",
                    cellText: false,
                    cellDates: true,
                    raw: false,
                });
            }

            const blocks: StructuredTextBlock[] = [];
            const sheets: string[] = [];

            workbook.SheetNames.forEach((sheetName: string) => {
                const sheet = workbook.Sheets[sheetName];
                if (!sheet) return;

                // Convert sheet to JSON first, then format as text
                const jsonData = XLSX.utils.sheet_to_json(sheet, {
                    header: 1,
                    defval: "",
                    raw: false,
                });

                if (jsonData && jsonData.length > 0) {
                    // Convert JSON array to readable text format
                    const textData = (jsonData as any[][])
                        .map((row: any[]) => row.join("\t"))
                        .join("\n");

                    // Add sheet as heading
                    blocks.push({
                        type: "heading",
                        level: 2,
                        content: `Sheet: ${sheetName}`,
                    });

                    // Add table content
                    blocks.push({
                        type: "table",
                        content: textData,
                    });

                    sheets.push(`[Sheet: ${sheetName}]\n${textData}`);
                }
            });

            const text = sheets.join("\n\n") || "[Excel file has no data content]";

            return {
                blocks,
                text,
                metadata: {
                    filename,
                    filetype: isCsv ? "csv" : lowerFilename.endsWith(".xlsx") ? "xlsx" : "xls",
                    size: buffer.length,
                },
            };
        } catch (error) {
            throw new Error(
                `Failed to parse Excel: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    }
}
