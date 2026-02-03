import { TerminalLogger } from "@buildingai/logger";
import { Injectable } from "@nestjs/common";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/**
 * Plugin link information interface
 * @description Interface for plugin link data structure
 */
export interface PluginLinkInfo {
    /** Plugin name */
    pluginName: string;
    /** Link display name */
    linkName: string;
    /** Link path */
    linkPath: string;
    /** File path relative to extensions directory */
    filePath: string;
    /** Full file path */
    fullPath: string;
}

/**
 * Plugin Links Service
 * @description Service for scanning and parsing plugin links from Vue files
 */
@Injectable()
export class PluginLinksService {
    private readonly extensionsDir: string;

    constructor() {
        // Get extensions directory from project root
        this.extensionsDir = join(process.cwd(), "..", "..", "extensions");
    }

    /**
     * Get all plugin links
     * @returns Promise<PluginLinkInfo[]> Array of plugin link information
     */
    async getPluginLinks(): Promise<PluginLinkInfo[]> {
        try {
            return await this.scanPluginLinks();
        } catch (error) {
            TerminalLogger.error("PluginLinks", `Failed to scan plugin links: ${error.message}`);
            return [];
        }
    }

    /**
     * Scan all plugin links from extensions directory
     * @returns Promise<PluginLinkInfo[]> Array of plugin link information
     */
    private async scanPluginLinks(): Promise<PluginLinkInfo[]> {
        const pluginLinks: PluginLinkInfo[] = [];

        try {
            // Check if extensions directory exists
            if (!this.existsSync(this.extensionsDir)) {
                TerminalLogger.warn(
                    "PluginLinks",
                    `Extensions directory not found: ${this.extensionsDir}`,
                );
                return pluginLinks;
            }

            // Read all plugin directories from extensions directory
            const pluginDirs = this.readdirSync(this.extensionsDir, { withFileTypes: true })
                .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
                .map((entry) => entry.name);

            TerminalLogger.info(
                "PluginLinks",
                `Found ${pluginDirs.length} plugin directories: ${pluginDirs.join(", ")}`,
            );

            // Iterate through each plugin directory
            for (const pluginDir of pluginDirs) {
                const pluginPath = join(this.extensionsDir, pluginDir);
                const manifestPath = join(pluginPath, "manifest.json");
                const webPagesPath = join(pluginPath, "src", "web", "pages");

                // Read plugin identifier and name from manifest.json
                const { identifier, name } = this.getPluginInfoFromManifest(
                    manifestPath,
                    pluginDir,
                );
                const pluginName = name; // Use name for display
                const pluginIdentifier = identifier; // Use identifier for path

                // Check if src/web/pages directory exists
                if (!this.existsSync(webPagesPath)) {
                    TerminalLogger.warn(
                        "PluginLinks",
                        `Pages directory not found for plugin "${pluginName}": ${webPagesPath}`,
                    );
                    continue;
                }

                // Scan all Vue files in this plugin
                const pluginLinksForPlugin = this.scanVueFilesInDirectory(
                    webPagesPath,
                    pluginName,
                    pluginIdentifier,
                    "",
                );
                pluginLinks.push(...pluginLinksForPlugin);
            }

            TerminalLogger.info("PluginLinks", `Found ${pluginLinks.length} plugin links total`);
            return pluginLinks;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            TerminalLogger.error("PluginLinks", `Failed to scan plugin links: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Recursively scan Vue files in a directory
     * @param dirPath Directory path to scan
     * @param pluginName Plugin name (for display)
     * @param pluginIdentifier Plugin identifier (for path)
     * @param relativePath Relative path within pages directory
     * @returns PluginLinkInfo[] Array of plugin link information
     */
    private scanVueFilesInDirectory(
        dirPath: string,
        pluginName: string,
        pluginIdentifier: string,
        relativePath: string,
    ): PluginLinkInfo[] {
        const pluginLinks: PluginLinkInfo[] = [];

        try {
            const entries = this.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = join(dirPath, entry.name);
                const entryRelativePath = relativePath
                    ? join(relativePath, entry.name)
                    : entry.name;

                if (entry.isDirectory()) {
                    // Skip console directory as it contains admin pages, not public links
                    if (
                        entry.name === "console" ||
                        entry.name === "components" ||
                        entry.name === "component"
                    ) {
                        continue;
                    }

                    // Recursively scan subdirectories
                    const subDirLinks = this.scanVueFilesInDirectory(
                        entryPath,
                        pluginName,
                        pluginIdentifier,
                        entryRelativePath,
                    );
                    pluginLinks.push(...subDirLinks);
                } else if (entry.isFile() && entry.name.endsWith(".vue")) {
                    // Process Vue file
                    const linkInfo = this.parseVueFile(
                        entryPath,
                        pluginName,
                        pluginIdentifier,
                        entryRelativePath,
                    );
                    if (linkInfo) {
                        pluginLinks.push(linkInfo);
                    }
                }
            }
        } catch (error) {
            TerminalLogger.warn(
                "PluginLinks",
                `Failed to scan directory ${dirPath}: ${error.message}`,
            );
        }

        return pluginLinks;
    }

    /**
     * Parse Vue file to extract link information
     * @param filePath Vue file path
     * @param pluginName Plugin name (for display)
     * @param pluginIdentifier Plugin identifier (for path)
     * @param relativePath Relative path within pages directory
     * @returns PluginLinkInfo | null Parsed link information or null if not a link
     */
    private parseVueFile(
        filePath: string,
        pluginName: string,
        pluginIdentifier: string,
        relativePath: string,
    ): PluginLinkInfo | null {
        try {
            const content = this.readFileSync(filePath, "utf-8");

            // Find definePageMeta call - extract object content with balanced braces
            const definePageMetaIndex = content.indexOf("definePageMeta");
            if (definePageMetaIndex === -1) {
                return null;
            }

            // Find the opening parenthesis after definePageMeta
            let startIndex = content.indexOf("(", definePageMetaIndex);
            if (startIndex === -1) {
                return null;
            }
            startIndex += 1; // Skip the opening parenthesis

            // Find the opening brace
            startIndex = content.indexOf("{", startIndex);
            if (startIndex === -1) {
                return null;
            }
            startIndex += 1; // Skip the opening brace

            // Find the matching closing brace by counting braces
            let braceCount = 1;
            let endIndex = startIndex;
            while (braceCount > 0 && endIndex < content.length) {
                if (content[endIndex] === "{") {
                    braceCount++;
                } else if (content[endIndex] === "}") {
                    braceCount--;
                }
                endIndex++;
            }

            if (braceCount !== 0) {
                return null; // Unbalanced braces
            }

            const metaContent = content.substring(startIndex, endIndex - 1);

            // Check if contains inLinkSelector: true (case-insensitive, handle whitespace)
            const inLinkSelectorRegex = /inLinkSelector\s*:\s*true/i;
            if (!inLinkSelectorRegex.test(metaContent)) {
                return null;
            }

            // Extract name field - support both single and double quotes
            const nameRegex = /name\s*:\s*["']([^"']+)["']/;
            const nameMatch = metaContent.match(nameRegex);
            const linkName = nameMatch ? nameMatch[1] : this.generateLinkNameFromPath(relativePath);

            // Generate link path using identifier (not name)
            const linkPath = this.generateLinkPath(pluginIdentifier, relativePath);

            return {
                pluginName,
                linkName,
                linkPath,
                filePath: relativePath,
                fullPath: filePath,
            };
        } catch (error) {
            TerminalLogger.warn(
                "PluginLinks",
                `Failed to parse Vue file ${filePath}: ${error.message}`,
            );
            return null;
        }
    }

    /**
     * Generate link name from file path if name is not found in meta
     * @param relativePath Relative file path
     * @returns string Generated link name
     */
    private generateLinkNameFromPath(relativePath: string): string {
        const fileName = relativePath.replace(/\.vue$/, "");
        const pathParts = fileName.split("/");
        const lastPart = pathParts[pathParts.length - 1];

        // Simple name conversion: index -> Home, others keep as is
        if (lastPart === "index") {
            return "Home";
        }

        return lastPart;
    }

    /**
     * Generate link path from plugin identifier and relative path
     * @param pluginIdentifier Plugin identifier (from manifest.identifier)
     * @param relativePath Relative file path
     * @returns string Generated link path
     */
    private generateLinkPath(pluginIdentifier: string, relativePath: string): string {
        const fileName = relativePath.replace(/\.vue$/, "");
        const pathParts = fileName.split("/").filter((part) => part !== "");

        // If it's index.vue at root level, path is just plugin identifier
        if (fileName === "index" || pathParts.length === 0) {
            return `/app/${pluginIdentifier}`;
        }

        // If the last part is index, remove it from the path
        if (pathParts[pathParts.length - 1] === "index") {
            pathParts.pop();
        }

        // If no path parts left after removing index, return root path
        if (pathParts.length === 0) {
            return `/app/${pluginIdentifier}`;
        }

        // Otherwise concatenate plugin identifier and remaining path parts
        const remainingPath = pathParts.join("/");
        return `/app/${pluginIdentifier}/${remainingPath}`;
    }

    /**
     * Get plugin info (identifier and name) from manifest.json
     * @param manifestPath Path to manifest.json
     * @param fallbackName Fallback name if manifest.json is not found or invalid
     * @returns Object with identifier and name
     */
    private getPluginInfoFromManifest(
        manifestPath: string,
        fallbackName: string,
    ): { identifier: string; name: string } {
        try {
            if (!this.existsSync(manifestPath)) {
                TerminalLogger.warn(
                    "PluginLinks",
                    `Manifest not found: ${manifestPath}, using fallback: ${fallbackName}`,
                );
                return {
                    identifier: fallbackName,
                    name: fallbackName,
                };
            }

            const manifestContent = this.readFileSync(manifestPath, "utf-8");
            const manifest = JSON.parse(manifestContent);

            const identifier =
                manifest.identifier && typeof manifest.identifier === "string"
                    ? manifest.identifier
                    : fallbackName;
            const name =
                manifest.name && typeof manifest.name === "string" ? manifest.name : fallbackName;

            if (!manifest.identifier || !manifest.name) {
                TerminalLogger.warn(
                    "PluginLinks",
                    `Missing identifier or name in manifest: ${manifestPath}, using fallback: ${fallbackName}`,
                );
            }

            return { identifier, name };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            TerminalLogger.warn(
                "PluginLinks",
                `Failed to read manifest: ${manifestPath}, error: ${errorMessage}, using fallback: ${fallbackName}`,
            );
            return {
                identifier: fallbackName,
                name: fallbackName,
            };
        }
    }

    /**
     * Check if file or directory exists
     * @param path File or directory path
     * @returns boolean True if exists
     */
    private existsSync(path: string): boolean {
        try {
            statSync(path);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Read directory contents
     * @param path Directory path
     * @param options Read options
     * @returns Dirent[] Directory entries
     */
    private readdirSync(path: string, options?: { withFileTypes: true }): any[] {
        return readdirSync(path, options);
    }

    /**
     * Read file contents
     * @param path File path
     * @param encoding File encoding
     * @returns string File contents
     */
    private readFileSync(path: string, encoding: BufferEncoding): string {
        return readFileSync(path, encoding);
    }
}
