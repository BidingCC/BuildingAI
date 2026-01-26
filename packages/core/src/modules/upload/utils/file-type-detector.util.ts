import { FileType } from "@buildingai/db/entities";

/**
 * File type detector utility
 *
 * Detects file type based on MIME type
 */
export class FileTypeDetector {
    /**
     * Detect file type from MIME type
     *
     * @param mimeType File MIME type
     * @returns File type enum
     */
    static detect(mimeType: string): FileType {
        if (mimeType.startsWith("image/")) {
            return FileType.IMAGE;
        }

        if (mimeType.startsWith("video/")) {
            return FileType.VIDEO;
        }

        if (mimeType.startsWith("audio/")) {
            return FileType.AUDIO;
        }

        if (this.isDocument(mimeType)) {
            return FileType.DOCUMENT;
        }

        if (this.isArchive(mimeType)) {
            return FileType.ARCHIVE;
        }

        return FileType.OTHER;
    }

    /**
     * Check if MIME type is a document
     *
     * @param mimeType File MIME type
     * @returns True if document type
     */
    private static isDocument(mimeType: string): boolean {
        const documentTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv",
        ];

        return (
            documentTypes.includes(mimeType) ||
            mimeType.includes("officedocument") ||
            mimeType.startsWith("text/")
        );
    }

    /**
     * Check if MIME type is an archive
     *
     * @param mimeType File MIME type
     * @returns True if archive type
     */
    private static isArchive(mimeType: string): boolean {
        const archiveTypes = [
            "application/zip",
            "application/x-rar-compressed",
            "application/x-7z-compressed",
            "application/x-tar",
            "application/gzip",
            "application/x-bzip2",
        ];

        return archiveTypes.includes(mimeType);
    }
}
