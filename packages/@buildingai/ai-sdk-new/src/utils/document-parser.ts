import mammoth from "mammoth";
import path from "path";
import pdf from "pdf-parse";
import * as XLSX from "xlsx";

export class DocumentParser {
    static async parseFromUrl(fileUrl: string, fileName: string): Promise<string> {
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.statusText}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            const ext = path.extname(fileName).toLowerCase();

            switch (ext) {
                case ".pdf":
                    return await this.parsePDF(buffer);
                case ".docx":
                    return await this.parseDOCX(buffer);
                case ".xlsx":
                case ".xls":
                    return await this.parseExcel(buffer);
                case ".txt":
                case ".md":
                    return buffer.toString("utf-8");
                case ".rtf":
                    return await this.parseRTF(buffer);
                case ".csv":
                    return await this.parseCSV(buffer);
                case ".pptx":
                    return await this.parsePPTX(buffer);
                default:
                    try {
                        return buffer.toString("utf-8");
                    } catch {
                        return `[Unsupported file format: ${ext}]`;
                    }
            }
        } catch (error) {
            console.error(`文档解析失败 [${fileName}]:`, error);
            return `[无法解析文档: ${fileName}]`;
        }
    }

    private static async parsePDF(buffer: Buffer): Promise<string> {
        try {
            const data = await pdf(buffer);
            return data.text || "[PDF 无文本内容]";
        } catch (error) {
            console.error("PDF 解析失败:", error);
            return "[PDF 解析失败]";
        }
    }

    private static async parseDOCX(buffer: Buffer): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value || "[DOCX 无文本内容]";
        } catch (error) {
            console.error("DOCX 解析失败:", error);
            return "[DOCX 解析失败]";
        }
    }

    private static parseExcel(buffer: Buffer): string {
        try {
            const workbook = XLSX.read(buffer, {
                type: "buffer",
                cellText: false,
                cellDates: true,
                raw: false,
            });
            const sheets: string[] = [];

            workbook.SheetNames.forEach((sheetName: string) => {
                const sheet = workbook.Sheets[sheetName];
                if (!sheet) return;

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

                    sheets.push(`[Sheet: ${sheetName}]\n${textData}`);
                }
            });

            return sheets.join("\n\n") || "[Excel file has no data content]";
        } catch (error) {
            console.error("Excel parsing failed:", error);
            return "[Excel parsing failed]";
        }
    }

    private static async parseRTF(buffer: Buffer): Promise<string> {
        try {
            const rtfContent = buffer.toString("utf-8");
            const plainText = rtfContent
                .replace(/\\[a-z]+\d*\s?/g, "") // Remove RTF control words
                .replace(/[{}]/g, "") // Remove braces
                .replace(/\s+/g, " ") // Normalize whitespace
                .trim();

            return plainText || "[RTF file has no text content]";
        } catch (error) {
            console.error("RTF parsing failed:", error);
            return "[RTF parsing failed]";
        }
    }

    private static async parseCSV(buffer: Buffer): Promise<string> {
        try {
            const csvContent = buffer.toString("utf-8");
            const workbook = XLSX.read(csvContent, { type: "string" });
            const sheets: string[] = [];

            workbook.SheetNames.forEach((sheetName: string) => {
                const sheet = workbook.Sheets[sheetName];
                if (!sheet) return;
                const data = XLSX.utils.sheet_to_txt(sheet);
                if (data) {
                    sheets.push(`[Sheet: ${sheetName}]\n${data}`);
                }
            });

            return sheets.join("\n\n") || "[CSV file has no data content]";
        } catch (error) {
            console.error("CSV parsing failed:", error);
            return "[CSV parsing failed]";
        }
    }

    private static async parsePPTX(buffer: Buffer): Promise<string> {
        try {
            const pptxContent = buffer.toString("utf-8");
            const textMatches = pptxContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
            if (textMatches && textMatches.length > 0) {
                const extractedText = textMatches
                    .map((match) => match.replace(/<[^>]*>/g, ""))
                    .join(" ");
                return extractedText || "[PowerPoint file has no text content]";
            }

            return "[PowerPoint file has no text content]";
        } catch (error) {
            console.error("PowerPoint parsing failed:", error);
            return "[PowerPoint parsing failed]";
        }
    }

    static formatDocumentPrompt(fileName: string, content: string): string {
        const maxLength = 10000;
        const truncatedContent =
            content.length > maxLength
                ? content.slice(0, maxLength) + "\n...(content truncated)"
                : content;

        return `\n\n--- Document: ${fileName} ---\n${truncatedContent}\n--- End of Document ---\n\n`;
    }
}
