import { HttpErrorFactory } from "@buildingai/errors";
import { UploadService } from "@modules/upload/services/upload.service";
import { Injectable, Logger } from "@nestjs/common";
import * as mammoth from "mammoth";

/**
 * File parsing service
 * Supports parsing files in multiple formats
 */
@Injectable()
export class FileParserService {
    private readonly logger = new Logger(FileParserService.name);

    constructor(private readonly uploadService: UploadService) {}

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

        // Parse doc files (not supported yet)
        if (mimeType === "application/msword" || originalName.endsWith(".doc")) {
            throw HttpErrorFactory.badRequest(
                "Doc format not supported yet, please use docx format",
            );
        }

        throw HttpErrorFactory.badRequest(
            `Unsupported file type: ${mimeType}, currently only supports .docx, .txt and .md files`,
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
            const processedText = text
                .replace(/\r\n/g, "\n") // Unify line breaks
                .replace(/\r/g, "\n") // Unify line breaks
                .replace(/\t/g, " ") // Convert tabs to spaces
                .replace(/[ ]{2,}/g, " ") // Merge multiple spaces
                .replace(/[ ]+\n/g, "\n") // Remove trailing spaces
                .replace(/\n[ ]+/g, "\n") // Remove leading spaces
                .trim();

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
            const text = buffer.toString("utf-8").trim();

            if (!text) {
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

            this.logger.log(
                `Markdown file parsed successfully, original length: ${markdown.length}, processed length: ${text.length}`,
            );

            return text;
        } catch (error) {
            throw HttpErrorFactory.badRequest(`Failed to parse Markdown file: ${error.message}`);
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
        ];

        const supportedExtensions = [".docx", ".txt", ".md"];

        return (
            supportedMimeTypes.includes(mimeType) ||
            supportedExtensions.some((ext) => originalName.endsWith(ext))
        );
    }
}
