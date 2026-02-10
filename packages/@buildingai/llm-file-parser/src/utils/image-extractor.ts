/**
 * @fileoverview Image extractor utility
 * @description Extracts images from various document formats
 */

import AdmZip from "adm-zip";

import type { ParseOptions } from "../types";

export interface ExtractedImage {
    buffer: Buffer;
    format: string; // jpeg, png, etc.
    index: number;
}

/**
 * Extract images from DOCX file
 */
export async function extractImagesFromDocx(buffer: Buffer): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = [];
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    let imageIndex = 0;

    for (const entry of zipEntries) {
        // DOCX images are typically in word/media/
        if (entry.entryName.startsWith("word/media/")) {
            const ext = entry.entryName.split(".").pop()?.toLowerCase() || "";
            if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) {
                images.push({
                    buffer: entry.getData(),
                    format: ext === "jpg" ? "jpeg" : ext,
                    index: imageIndex++,
                });
            }
        }
    }

    return images;
}

/**
 * Extract images from PPTX file
 */
export async function extractImagesFromPptx(buffer: Buffer): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = [];
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    let imageIndex = 0;

    for (const entry of zipEntries) {
        // PPTX images are typically in ppt/media/
        if (entry.entryName.startsWith("ppt/media/")) {
            const ext = entry.entryName.split(".").pop()?.toLowerCase() || "";
            if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) {
                images.push({
                    buffer: entry.getData(),
                    format: ext === "jpg" ? "jpeg" : ext,
                    index: imageIndex++,
                });
            }
        }
    }

    return images;
}

/**
 * Extract images from PDF file
 * Note: This is a basic implementation. For production, consider using pdf-lib or pdfjs-dist
 */
export async function extractImagesFromPdf(buffer: Buffer): Promise<ExtractedImage[]> {
    // PDF image extraction is complex and requires specialized libraries
    // For now, return empty array. Can be enhanced with pdf-lib or pdfjs-dist
    // TODO: Implement PDF image extraction using pdf-lib or pdfjs-dist
    return [];
}

