/**
 * @fileoverview File download utility
 * @description Downloads files from HTTP/HTTPS URLs
 */

import { fileTypeFromBuffer } from "file-type";

import type { FileDownloadResult, ParseOptions } from "../types";

/**
 * Download file from URL
 */
export async function downloadFile(
    url: string,
    options: ParseOptions = {},
): Promise<FileDownloadResult> {
    const { timeout = 30000, maxFileSize = 50 * 1024 * 1024 } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "BuildingAI-LLMFileParser/1.0",
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
        }

        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > maxFileSize) {
            throw new Error(`File size exceeds maximum allowed size: ${maxFileSize} bytes`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length > maxFileSize) {
            throw new Error(`File size exceeds maximum allowed size: ${maxFileSize} bytes`);
        }

        // Detect MIME type
        const fileType = await fileTypeFromBuffer(buffer);
        const mimeType =
            fileType?.mime || response.headers.get("content-type") || "application/octet-stream";

        // Extract filename from URL or Content-Disposition header
        let filename = extractFilenameFromUrl(url);
        const contentDisposition = response.headers.get("content-disposition");
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(
                /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
            );
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, "");
            }
        }

        return {
            buffer,
            filename: filename || "unknown",
            mimeType,
            size: buffer.length,
        };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error) {
            if (error.name === "AbortError") {
                throw new Error(`Download timeout after ${timeout}ms`);
            }
            throw error;
        }
        throw new Error("Unknown error occurred during file download");
    }
}

/**
 * Extract filename from URL
 */
function extractFilenameFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split("/").pop() || "";
        return decodeURIComponent(filename);
    } catch {
        return "";
    }
}
