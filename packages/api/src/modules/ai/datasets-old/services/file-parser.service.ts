import { HttpErrorFactory } from "@buildingai/errors";
import { UploadService } from "@modules/upload/services/upload.service";
import { Injectable, Logger } from "@nestjs/common";
import * as mammoth from "mammoth";
import pdf from "pdf-parse";
import * as XLSX from "xlsx";

/**
 * File parsing service
 * Supports parsing files in multiple formats
 */
@Injectable()
export class FileParserService {
    private readonly logger = new Logger(FileParserService.name);

    constructor(private readonly uploadService: UploadService) {}

    /**
     * Clean text content to remove invalid UTF-8 characters that PostgreSQL cannot handle
     * Removes null bytes (0x00) and other invalid characters
     */
    private cleanTextForDatabase(text: string): string {
        if (!text) return text;
        // Remove null bytes and other control characters that PostgreSQL UTF-8 cannot handle
        // Keep only valid characters: \n (0x0A), \r (0x0D), \t (0x09) and printable characters
        let cleaned = text.replace(/\0/g, ""); // Remove null bytes

        // Remove control characters except \n (0x0A), \r (0x0D), \t (0x09)
        cleaned = cleaned
            .split("")
            .filter((char) => {
                const code = char.charCodeAt(0);
                // Keep printable characters (32-126), \n (10), \r (13), \t (9), and extended ASCII/Unicode
                return (
                    code === 9 || // \t
                    code === 10 || // \n
                    code === 13 || // \r
                    (code >= 32 && code !== 127) || // Printable ASCII except DEL
                    code > 127 // Extended ASCII and Unicode
                );
            })
            .join("");

        // Remove replacement characters (invalid UTF-8 sequences)
        return cleaned.replace(/\uFFFD/g, "");
    }

    /**
     * Get file information
     * @param fileId File ID
     * @returns File information
     */
    async getFileInfo(fileId: string) {
        try {
            const fileInfo = await this.uploadService.getFileById(fileId);
            if (!fileInfo) {
                throw new Error(`文件不存在: ${fileId}`);
            }
            return {
                id: fileId,
                name: fileInfo.originalName,
                type: fileInfo.type,
                size: fileInfo.size,
                path: fileInfo.path,
            };
        } catch (error) {
            this.logger.error(`Failed to get file info: ${error.message}`, error);
            throw HttpErrorFactory.badRequest(`Failed to get file info: ${error.message}`);
        }
    }

    /**
     * Parse file content by file ID
     * @param fileId File ID
     * @returns Parsed text content
     */
    async parseFileById(fileId: string): Promise<string> {
        try {
            const file = await this.uploadService.getFileById(fileId);
            if (!file) {
                throw new Error(`文件不存在: ${fileId}`);
            }

            const filePath = await this.uploadService.getFilePath(fileId);
            const { readFile } = await import("fs-extra");
            const buffer = await readFile(filePath);

            const mockFile: Express.Multer.File = {
                buffer,
                originalname: file.originalName,
                mimetype: file.mimeType,
                size: file.size,
                fieldname: "file",
                encoding: "utf-8",
                filename: file.storageName,
                destination: "",
                path: filePath,
                stream: null,
            };

            return this.parseFile(mockFile);
        } catch (error) {
            this.logger.error(`Failed to parse file by ID: ${error.message}`, error);
            throw HttpErrorFactory.badRequest(`Failed to parse file: ${error.message}`);
        }
    }

    /**
     * Parse file content
     */
    async parseFile(file: Express.Multer.File): Promise<string> {
        if (!file || !file.buffer) {
            throw HttpErrorFactory.badRequest("File cannot be empty");
        }

        const mimeType = file.mimetype.toLowerCase();
        const originalName = file.originalname.toLowerCase();

        // Parse docx files
        if (
            mimeType ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            originalName.endsWith(".docx")
        ) {
            return this.parseDocx(file.buffer);
        }

        // Parse plain text files
        if (mimeType === "text/plain" || originalName.endsWith(".txt")) {
            return this.parseText(file.buffer);
        }

        // Parse Markdown files
        if (mimeType === "text/markdown" || originalName.endsWith(".md")) {
            return this.parseMarkdown(file.buffer);
        }

        // Parse PDF files
        if (mimeType === "application/pdf" || originalName.endsWith(".pdf")) {
            return this.parsePDF(file.buffer);
        }

        // Parse Excel files (.xlsx)
        if (
            mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            originalName.endsWith(".xlsx")
        ) {
            return this.parseExcel(file.buffer);
        }

        // Parse Excel files (.xls)
        if (mimeType === "application/vnd.ms-excel" || originalName.endsWith(".xls")) {
            return this.parseExcel(file.buffer);
        }

        // Parse doc files (not supported yet)
        if (mimeType === "application/msword" || originalName.endsWith(".doc")) {
            throw HttpErrorFactory.badRequest(
                "Doc format not supported yet, please use docx format",
            );
        }

        throw HttpErrorFactory.badRequest(
            `Unsupported file type: ${mimeType}, currently only supports .docx, .txt, .md, .pdf, .xlsx and .xls files`,
        );
    }

    /**
     * Parse docx file
     */
    private async parseDocx(buffer: Buffer): Promise<string> {
        try {
            // Use different mammoth options to better preserve text formatting
            const options = {
                includeEmbeddedStyleMap: true,
                ignoreEmptyParagraphs: false,
            };

            const result = await mammoth.extractRawText({ buffer, ...options });
            let text = result.value;

            console.log(
                "🔍 Raw mammoth output (first 500 chars):",
                JSON.stringify(text.substring(0, 500)),
            );

            if (!text || !text.trim()) {
                throw HttpErrorFactory.badRequest("文档内容为空");
            }

            // Minimize processing, focus on preserving punctuation and paragraph structure
            let processedText = text
                .replace(/\r\n/g, "\n") // Unify line breaks
                .replace(/\r/g, "\n") // Unify line breaks
                .replace(/\t/g, " ") // Convert tabs to spaces
                .replace(/[ ]{2,}/g, " ") // Merge multiple spaces
                .replace(/[ ]+\n/g, "\n") // Remove trailing spaces
                .replace(/\n[ ]+/g, "\n") // Remove leading spaces
                .trim();

            // Clean invalid UTF-8 characters for database storage
            processedText = this.cleanTextForDatabase(processedText);

            console.log(
                "🔍 Processed text (first 500 chars):",
                JSON.stringify(processedText.substring(0, 500)),
            );

            return processedText;
        } catch (error) {
            throw HttpErrorFactory.badRequest(`Failed to parse docx file: ${error.message}`);
        }
    }

    /**
     * Parse plain text file
     */
    private parseText(buffer: Buffer): string {
        try {
            let text = buffer.toString("utf-8").trim();

            if (!text) {
                throw HttpErrorFactory.badRequest("文档内容为空");
            }

            // Clean invalid UTF-8 characters for database storage
            text = this.cleanTextForDatabase(text);

            if (!text || !text.trim()) {
                throw HttpErrorFactory.badRequest("文档内容为空");
            }

            return text;
        } catch (error) {
            throw HttpErrorFactory.badRequest(`Failed to parse text file: ${error.message}`);
        }
    }

    /**
     * Parse Markdown file
     * Convert Markdown format to plain text, preserving basic structure
     */
    private parseMarkdown(buffer: Buffer): string {
        try {
            const markdown = buffer.toString("utf-8").trim();

            if (!markdown) {
                throw HttpErrorFactory.badRequest("文档内容为空");
            }

            // Convert Markdown to plain text, preserving basic structure
            let text = markdown
                .replace(/[ ]+\n/g, "\n")
                .replace(/\n[ ]+/g, "\n")
                .trim();

            // Clean invalid UTF-8 characters for database storage
            text = this.cleanTextForDatabase(text);

            if (!text || !text.trim()) {
                throw HttpErrorFactory.badRequest("文档内容为空");
            }

            this.logger.log(
                `Markdown file parsed successfully, original length: ${markdown.length}, processed length: ${text.length}`,
            );

            return text;
        } catch (error) {
            throw HttpErrorFactory.badRequest(`Failed to parse Markdown file: ${error.message}`);
        }
    }

    /**
     * Parse PDF file
     */
    private async parsePDF(buffer: Buffer): Promise<string> {
        try {
            const data = await pdf(buffer);
            let text = data.text?.trim();

            if (!text) {
                throw HttpErrorFactory.badRequest("PDF 文档内容为空");
            }

            // Clean invalid UTF-8 characters for database storage
            text = this.cleanTextForDatabase(text);

            if (!text || !text.trim()) {
                throw HttpErrorFactory.badRequest("PDF 文档内容为空");
            }

            return text;
        } catch (error) {
            this.logger.error(`Failed to parse PDF file: ${error.message}`, error);
            throw HttpErrorFactory.badRequest(`Failed to parse PDF file: ${error.message}`);
        }
    }

    /**
     * Parse Excel file (.xlsx or .xls)
     */
    private parseExcel(buffer: Buffer): string {
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

                    sheets.push(`[Sheet: ${sheetName}]\n${textData}`);
                }
            });

            let result = sheets.join("\n\n");

            if (!result || result.trim() === "") {
                throw HttpErrorFactory.badRequest("Excel 文件内容为空");
            }

            // Clean invalid UTF-8 characters for database storage
            result = this.cleanTextForDatabase(result);

            if (!result || result.trim() === "") {
                throw HttpErrorFactory.badRequest("Excel 文件内容为空");
            }

            return result;
        } catch (error) {
            this.logger.error(`Failed to parse Excel file: ${error.message}`, error);
            throw HttpErrorFactory.badRequest(`Failed to parse Excel file: ${error.message}`);
        }
    }

    /**
     * Validate file type
     */
    isSupportedFile(file: Express.Multer.File): boolean {
        const mimeType = file.mimetype.toLowerCase();
        const originalName = file.originalname.toLowerCase();

        const supportedMimeTypes = [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "text/markdown",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        ];

        const supportedExtensions = [".docx", ".txt", ".md", ".pdf", ".xlsx", ".xls"];

        return (
            supportedMimeTypes.includes(mimeType) ||
            supportedExtensions.some((ext) => originalName.endsWith(ext))
        );
    }
}
