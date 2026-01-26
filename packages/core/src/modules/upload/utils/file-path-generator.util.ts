import type { FileType } from "@buildingai/db/entities";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import type { FileStoragePath } from "../interfaces/file-storage.interface";

/**
 * File path generator utility
 *
 * Generates organized storage paths for uploaded files
 */
export class FilePathGenerator {
    /**
     * Generate storage path with organization by type and date
     *
     * @param fileType File type category
     * @param extension File extension without dot
     * @param organizeByType Whether to organize by file type
     * @param organizeByDate Whether to organize by date (year/month)
     * @returns Storage path information
     */
    static generate(
        fileType: FileType,
        extension: string,
        organizeByType = true,
        organizeByDate = true,
    ): FileStoragePath {
        const pathSegments: string[] = [];

        // Add file type segment
        if (organizeByType) {
            pathSegments.push(fileType);
        }

        // Add date segments (year/month)
        if (organizeByDate) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            pathSegments.push(String(year), month);
        }

        // Generate unique file name
        const fileName = `${uuidv4()}${extension ? `.${extension}` : ""}`;

        // Combine path segments
        const relativePath = pathSegments.length > 0 ? path.join(...pathSegments) : "";
        const fullPath = path.join(relativePath, fileName);

        return {
            path: relativePath.replace(/\\/g, "/"),
            fileName,
            fullPath: fullPath.replace(/\\/g, "/"),
        };
    }

    // /**
    //  * Generate simple storage path without organization
    //  *
    //  * @param extension File extension without dot
    //  * @returns Storage path information
    //  */
    // static generateSimple(extension: string): FileStoragePath {
    //     const fileName = `${uuidv4()}${extension ? `.${extension}` : ""}`;
    //
    //     return {
    //         path: "",
    //         fileName,
    //         fullPath: fileName,
    //     };
    // }
}
