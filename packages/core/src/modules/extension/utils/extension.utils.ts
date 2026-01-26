import { AppConfig } from "@buildingai/config";
import { TerminalLogger } from "@buildingai/logger";
import { checkVersionCompatibility, ExtensionEngine, findStackTargetFile } from "@buildingai/utils";
import { DynamicModule } from "@nestjs/common";
import { existsSync } from "fs";
import { readdir, readFile, writeFile } from "fs/promises";
import { basename, join, normalize, sep } from "path";
import { pathToFileURL } from "url";

import {
    ExtensionInfo,
    ExtensionManifest,
    ExtensionsJsonConfig,
} from "../interfaces/extension.interface";

/**
 * 堆栈查找函数类型
 * 用于查找调用栈中匹配特定后缀的文件路径
 */
export type FindStackTargetFileFn = (suffixes: string[]) => string[];

// 全局堆栈查找函数
let stackFinderFn: FindStackTargetFileFn | null = null;

// 插件列表缓存
let extensionListCache: ExtensionInfo[] | null = null;

/**
 * 设置堆栈查找函数
 * 允许外部注入自定义的堆栈查找实现
 *
 * @param fn 堆栈查找函数
 */
export function setStackFinderFn(fn: FindStackTargetFileFn): void {
    stackFinderFn = fn;
}

/**
 * Get the platform version from AppConfig
 *
 * @returns Platform version string
 */
export function getPlatformVersion(): string {
    return AppConfig.version || "0.0.0";
}

/**
 * Get extension engine configuration from package.json
 *
 * @param identifier Extension identifier (directory name)
 * @param extensionsDir Extensions directory path (optional)
 * @returns Engine configuration or null if not found
 */
export async function getExtensionEngine(
    identifier: string,
    extensionsDir?: string,
): Promise<ExtensionEngine | null> {
    try {
        const targetDir = extensionsDir || join(process.cwd(), "..", "..", "extensions");
        const extensionPath = join(targetDir, identifier);
        const packageJsonPath = join(extensionPath, "package.json");

        if (!existsSync(packageJsonPath)) {
            return null;
        }

        const content = await readFile(packageJsonPath, "utf-8");
        const packageJson = JSON.parse(content) as { engine?: ExtensionEngine };

        return packageJson.engine || { buildingai: "<=25.0.4" };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        TerminalLogger.warn(
            "Extension Engine",
            `Failed to read engine config for "${identifier}": ${errorMessage}`,
        );
        return null;
    }
}

/**
 * Check if an extension is compatible with the current platform version
 *
 * @param identifier Extension identifier (directory name)
 * @param extensionsDir Extensions directory path (optional)
 * @returns True if compatible, false otherwise
 */
export async function isExtensionCompatible(
    identifier: string,
    extensionsDir?: string,
): Promise<boolean> {
    const engine = await getExtensionEngine(identifier, extensionsDir);
    const platformVersion = getPlatformVersion();
    const result = checkVersionCompatibility(platformVersion, engine);
    return result.compatible;
}

/**
 * Read extension manifest.json file
 *
 * @param extensionPath Extension directory path
 * @returns Manifest content or null if not found
 */
async function readExtensionManifest(extensionPath: string): Promise<ExtensionManifest | null> {
    try {
        const manifestPath = join(extensionPath, "manifest.json");

        if (!existsSync(manifestPath)) {
            return null;
        }

        const content = await readFile(manifestPath, "utf-8");
        return JSON.parse(content);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        TerminalLogger.warn("Extension Manifest", `Failed to read manifest: ${errorMessage}`);
        return null;
    }
}

/**
 * Update extension enabled status in extensions.json
 *
 * @param extensionsDir Extensions directory path
 * @param identifier Extension identifier
 * @param enabled New enabled status
 */
async function updateExtensionEnabledStatus(
    extensionsDir: string,
    identifier: string,
    enabled: boolean,
): Promise<void> {
    try {
        const configPath = join(extensionsDir, "extensions.json");

        if (!existsSync(configPath)) {
            return;
        }

        const content = await readFile(configPath, "utf-8");
        const config = JSON.parse(content) as ExtensionsJsonConfig;

        let updated = false;

        // Update in applications
        if (config.applications?.[identifier]) {
            config.applications[identifier].enabled = enabled;
            updated = true;
        }

        // Update in functionals
        if (config.functionals?.[identifier]) {
            config.functionals[identifier].enabled = enabled;
            updated = true;
        }

        if (updated) {
            await writeFile(configPath, JSON.stringify(config, null, 4), "utf-8");
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        TerminalLogger.error(
            "Extension Config",
            `Failed to update enabled status for ${identifier}: ${errorMessage}`,
        );
    }
}

/**
 * 读取 extensions.json 配置文件
 *
 * @param extensionsDir 插件目录路径
 * @returns 配置文件内容,如果读取失败则返回 null
 */
async function readExtensionsConfig(extensionsDir: string): Promise<ExtensionsJsonConfig | null> {
    try {
        const configPath = join(extensionsDir, "extensions.json");

        if (!existsSync(configPath)) {
            TerminalLogger.warn("Extensions Config", `Config file not found: ${configPath}`);
            return null;
        }

        const configContent = await readFile(configPath, "utf-8");
        const config: ExtensionsJsonConfig = JSON.parse(configContent);

        return config;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        TerminalLogger.error("Extensions Config", `Failed to read config: ${errorMessage}`);
        return null;
    }
}

/**
 * 从配置文件中获取已启用的插件标识符集合
 * 同时检查版本兼容性，不兼容的插件将被禁用
 *
 * @param extensionsDir 插件目录路径
 * @returns 已启用插件的标识符集合
 */
export async function getEnabledExtensionsFromConfig(extensionsDir?: string): Promise<Set<string>> {
    const targetDir = extensionsDir || join(process.cwd(), "..", "..", "extensions");
    const config = await readExtensionsConfig(targetDir);
    const platformVersion = getPlatformVersion();

    const enabledIdentifiers = new Set<string>();

    if (!config) {
        TerminalLogger.warn(
            "Extensions Config",
            "No config found, all file system extensions will be loaded",
        );
        return enabledIdentifiers;
    }

    TerminalLogger.info("Platform Version", `Current platform version: ${platformVersion}`);

    // 处理 applications 类型的插件
    for (const [key, extensionConfig] of Object.entries(config.applications || {})) {
        if (!extensionConfig.enabled) {
            continue;
        }

        const extensionPath = join(targetDir, key);
        const manifest = await readExtensionManifest(extensionPath);
        const engine = manifest?.engine || { buildingai: "<=25.0.4" };

        // Check version compatibility
        const compatResult = checkVersionCompatibility(platformVersion, engine);

        if (!compatResult.compatible) {
            TerminalLogger.warn(
                "Extension Compatibility",
                `Extension "${extensionConfig.manifest.name}" (${extensionConfig.manifest.identifier}) is incompatible: ${compatResult.reason}`,
            );

            // Disable the incompatible extension
            await updateExtensionEnabledStatus(targetDir, key, false);
            TerminalLogger.info(
                "Extension Config",
                `Disabled incompatible extension: ${extensionConfig.manifest.identifier}`,
            );
            continue;
        }

        enabledIdentifiers.add(extensionConfig.manifest.identifier);
        TerminalLogger.log(
            "Extension Config",
            `Application "${extensionConfig.manifest.name}" (${extensionConfig.manifest.identifier}) is enabled and compatible`,
        );
    }

    // TODO: 暂时不加载 functionals 类型的插件
    // for (const [key, extensionConfig] of Object.entries(config.functionals || {})) {
    //     if (!extensionConfig.enabled) {
    //         continue;
    //     }
    //
    //     const extensionPath = join(targetDir, key);
    //     const manifest = await readExtensionManifest(extensionPath);
    //     const engine = manifest?.engine;
    //
    //     const compatResult = checkVersionCompatibility(platformVersion, engine);
    //
    //     if (!compatResult.compatible) {
    //         TerminalLogger.warn(
    //             "Extension Compatibility",
    //             `Extension "${extensionConfig.manifest.name}" is incompatible: ${compatResult.reason}`,
    //         );
    //         await updateExtensionEnabledStatus(targetDir, key, false);
    //         continue;
    //     }
    //
    //     enabledIdentifiers.add(extensionConfig.manifest.identifier);
    //     TerminalLogger.log(
    //         "Extension Config",
    //         `Functional "${extensionConfig.manifest.name}" (${extensionConfig.manifest.identifier}) is enabled`,
    //     );
    // }

    if (enabledIdentifiers.size === 0) {
        TerminalLogger.info("Extensions Config", "No enabled extensions found in config file");
    }

    return enabledIdentifiers;
}

/**
 * 根据配置文件中的启用状态过滤插件列表
 *
 * @param fileSystemExtensions 文件系统中扫描到的插件列表
 * @param enabledIdentifiers 配置文件中已启用的插件标识符集合
 * @returns 过滤后的插件列表
 */
export function filterExtensionsByConfig(
    fileSystemExtensions: ExtensionInfo[],
    enabledIdentifiers: Set<string>,
): ExtensionInfo[] {
    return fileSystemExtensions
        .map((ext) => ({
            ...ext,
            enabled: enabledIdentifiers.has(ext.identifier),
        }))
        .filter((ext) => ext.enabled);
}

/**
 * 初始化插件列表缓存
 * 应在应用启动时调用,加载所有插件信息到内存中
 *
 * @param extensionsDir 插件目录路径(可选)
 * @param enabledIdentifiers 配置文件中已启用的插件标识符集合(可选)
 */
export async function initExtensionCache(
    extensionsDir?: string,
    enabledIdentifiers?: Set<string>,
): Promise<ExtensionInfo[]> {
    const fileSystemExtensions = await getExtensionList(extensionsDir);

    // 如果没有启用的插件,返回空数组
    if (!enabledIdentifiers || enabledIdentifiers.size === 0) {
        extensionListCache = [];
        return extensionListCache;
    }

    extensionListCache = fileSystemExtensions.filter((ext) =>
        enabledIdentifiers.has(ext.identifier),
    );

    return extensionListCache;
}

/**
 * 获取缓存的插件列表
 *
 * @returns 插件列表,如果未初始化则返回空数组
 */
export function getCachedExtensionList(): ExtensionInfo[] {
    return extensionListCache || [];
}

/**
 * 清除插件列表缓存
 */
export function clearExtensionCache(): void {
    extensionListCache = null;
}

/**
 * 从文件路径中提取插件名称
 *
 * @param filePath 文件路径
 * @returns 插件名称,如果无法提取则返回 null
 */
function extractExtensionNameFromPath(filePath: string): string | null {
    // 标准化路径分隔符
    const normalizedPath = normalize(filePath);

    // 匹配 extensions/{extensionName} 模式
    const match = normalizedPath.match(/extensions[/\\]([^/\\]+)/);

    return match?.[1] ?? null;
}

/**
 * 加载插件模块
 * 动态导入插件的 AppModule
 *
 * @param extensionInfo 插件信息
 * @returns 插件的 DynamicModule
 */
export async function loadExtensionModule(
    extensionInfo: ExtensionInfo,
): Promise<DynamicModule | null> {
    try {
        const buildPath = join(extensionInfo.path, "build");
        const indexPath = join(buildPath, "index.js");

        // Convert to file:// URL for cross-platform compatibility (especially Windows)
        const fileUrl = pathToFileURL(indexPath).href;
        const extensionModule = await import(fileUrl);

        if (!extensionModule.AppModule) {
            TerminalLogger.warn(
                "Extension",
                `Extension "${extensionInfo.name}" does not export AppModule, skipping...`,
            );
            return null;
        }

        TerminalLogger.success("Extension", `Loaded extension: ${extensionInfo.name}`);
        return extensionModule.AppModule;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        TerminalLogger.error(
            "Extension",
            `Failed to load extension "${extensionInfo.name}": ${errorMessage}`,
        );
        return null;
    }
}

/**
 * 获取所有可用的插件列表
 * 扫描 extensions 目录下的所有插件包
 *
 * @param extensionsDir 插件目录路径(可选,默认从项目根目录查找)
 * @returns 插件信息列表
 */
export async function getExtensionList(extensionsDir?: string): Promise<ExtensionInfo[]> {
    // 如果没有指定插件目录,使用默认路径
    const targetDir = extensionsDir || join(process.cwd(), "..", "..", "extensions");
    const extensions: ExtensionInfo[] = [];

    try {
        // 检查 extensions 目录是否存在
        if (!existsSync(targetDir)) {
            TerminalLogger.warn("Extensions", `Extensions directory not found: ${targetDir}`);
            return extensions;
        }

        // 读取 extensions 目录下的所有文件夹
        const entries = await readdir(targetDir, { withFileTypes: true });

        for (const entry of entries) {
            // 跳过非目录项和隐藏文件
            if (!entry.isDirectory() || entry.name.startsWith(".")) {
                continue;
            }

            const extensionName = entry.name;
            const extensionPath = join(targetDir, extensionName);
            const buildPath = join(extensionPath, "build");
            const indexPath = join(buildPath, "index.js");

            if (!existsSync(indexPath)) {
                TerminalLogger.log(
                    "Extension",
                    `Extension "${extensionName}" build not found, skipping...`,
                );
                continue;
            }

            // Read package.json for metadata
            const packageJsonPath = join(extensionPath, "package.json");
            const manifestJsonPath = join(extensionPath, "manifest.json");
            let version = "0.0.0";
            let description: string | undefined;
            let author: { name: string; avatar?: string; homepage?: string } | undefined;
            let engine: string;
            let manifestJson = existsSync(manifestJsonPath)
                ? JSON.parse(await readFile(manifestJsonPath, "utf-8"))
                : undefined;

            if (existsSync(packageJsonPath)) {
                try {
                    const packageJson = JSON.parse(
                        await readFile(packageJsonPath, "utf-8"),
                    ) as Record<string, any>;

                    version = packageJson.version || "0.0.0";
                    description = packageJson.description;
                    engine = packageJson.engine?.buildingai || "<=25.0.4";

                    // Parse author field (can be string or object)
                    if (manifestJson && manifestJson.author) {
                        author = {
                            name: manifestJson.author.name || "Unknown",
                            avatar: manifestJson.author.avatar,
                            homepage: manifestJson.author.homepage,
                        };
                    } else {
                        if (packageJson.author) {
                            if (typeof packageJson.author === "string") {
                                author = { name: packageJson.author };
                            } else if (typeof packageJson.author === "object") {
                                author = {
                                    name: packageJson.author.name || "Unknown",
                                    avatar: packageJson.author.avatar,
                                    homepage: packageJson.author.homepage || packageJson.author.url,
                                };
                            }
                        }
                    }
                } catch (error) {
                    TerminalLogger.warn(
                        "Extension",
                        `Failed to read package.json for "${extensionName}": ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            }

            extensions.push({
                name: extensionName,
                identifier: extensionName, // 使用插件名称作为标识符
                path: extensionPath,
                enabled: true, // 默认启用,实际状态由数据库决定
                version,
                description,
                author,
                engine,
            });
        }

        return extensions;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        TerminalLogger.error("Extensions", `Failed to load extensions: ${errorMessage}`);
        return extensions;
    }
}

/**
 * 同步获取插件包名称
 * 通过分析调用栈和缓存的插件列表来确定当前代码所属的插件
 * 此方法适用于装饰器等需要同步执行的场景
 *
 * @returns 插件包名称
 * @throws 如果无法确定插件名称则抛出错误
 */
export function getExtensionPackNameFromControllerSync(): string {
    const extensions = getCachedExtensionList();

    // 如果只有一个插件,直接返回
    if (extensions.length === 1) {
        return extensions?.[0]!.name;
    }

    // 如果有多个插件,需要通过调用栈来确定
    if (!stackFinderFn) {
        throw new Error("Stack finder function is not set. Please call setStackFinderFn() first.");
    }

    // 查找调用栈中的文件
    const callerFiles = stackFinderFn([".ts", ".js"]) || [];

    if (callerFiles.length === 0) {
        throw new Error("No caller files found in stack trace.");
    }

    // 尝试从每个文件路径中提取插件名称
    for (const file of callerFiles) {
        const extensionName = extractExtensionNameFromPath(file);
        if (extensionName) {
            // 验证插件名称是否在缓存列表中
            const extension = extensions.find((p) => p.name === extensionName);
            if (extension) {
                return extension.name;
            }
        }
    }

    throw new Error("Unable to determine extension name from stack trace.");
}

/**
 * Get the database schema name for an extension
 *
 * @param identifier Extension identifier
 * @returns Sanitized schema name for PostgreSQL
 */
export function getExtensionSchemaName(identifier: string): string {
    // Replace invalid characters with underscores
    // PostgreSQL schema names must start with a letter or underscore
    // and can only contain letters, numbers, and underscores
    let sanitized = identifier.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    // Ensure it starts with a letter or underscore
    if (!/^[a-z_]/.test(sanitized)) {
        sanitized = `ext_${sanitized}`;
    }

    return sanitized;
}

/**
 * Restore the original extension identifier from a schema name
 *
 * @param schemaName Schema name to restore from
 * @returns Matched extension identifier, or the schema name when no mapping is found
 */
export function getExtensionIdentifierFromSchema(schemaName?: string | null): string | null {
    if (!schemaName) {
        return null;
    }

    const normalizedSchema = schemaName.toLowerCase();

    const cachedExtensions = getCachedExtensionList();
    const matchedExtension = cachedExtensions.find(
        (extension) => getExtensionSchemaName(extension.identifier) === normalizedSchema,
    );

    if (matchedExtension) {
        return matchedExtension.identifier;
    }

    return normalizedSchema;
}

/**
 * 获取插件包名称
 *
 * 通过分析模块文件路径获取插件目录,然后返回插件名称
 * 支持跨平台路径规则(Windows/Unix)
 *
 * @param extensionsDir 插件目录路径(可选)
 * @returns 插件包名称
 * @throws 如果无法确定插件名称则抛出错误
 */
export function getExtensionPackNameFromController(): string {
    try {
        // 获取插件列表
        const extensionList = getCachedExtensionList();

        // 如果没有插件
        if (!extensionList || extensionList.length === 0) {
            throw new Error("插件列表为空");
        }

        // 如果只有一个插件,直接返回其名称
        if (extensionList.length === 1) {
            return extensionList?.[0]!.name;
        }

        // 如果有多个插件,需要通过调用栈来确定
        if (!stackFinderFn) {
            throw new Error("未设置堆栈查找函数,请先调用 setStackFinderFn() 设置查找函数");
        }

        // 使用堆栈查找函数获取调用者文件路径
        const callerFiles = stackFinderFn([".controller.js", ".controller.ts"]) || [];

        if (callerFiles.length === 0) {
            throw new Error("无法从调用栈中找到控制器文件");
        }

        // 对每个插件进行检查,看是否在调用文件路径中出现
        for (const extension of extensionList) {
            // 使用 basename 获取插件目录名,适配跨平台路径
            const extensionDir = basename(extension.path);

            if (extensionDir) {
                // 构建跨平台的插件路径模式
                const extensionPathPattern = join("extensions", extensionDir);

                // 检查调用文件路径中是否包含该插件目录
                const isExtensionMatch = callerFiles.some((file) => {
                    // 将文件路径标准化为统一的分隔符进行比较
                    const normalizedFile = normalize(file);
                    const normalizedPattern = normalize(extensionPathPattern);

                    // 检查路径是否包含插件目录
                    return (
                        normalizedFile.includes(normalizedPattern) ||
                        normalizedFile.includes(extensionDir)
                    );
                });

                if (isExtensionMatch) {
                    return extension.name;
                }
            }
        }

        throw new Error("无法确定当前控制器所属的插件");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`获取插件包名称失败: ${errorMessage}`);
    }
}

/**
 * Extract extension identifier (directory name) from stack trace file path
 *
 * Analyzes the file path from stack trace to extract the extension directory name.
 * Supports both Unix (/) and Windows (\) path separators.
 *
 * @param stackFilePath - File path from stack trace
 * @returns Extension directory name, or null if not found or invalid
 *
 * @example
 * ```ts
 * const extensionDir = getExtensionIdentifierFromStack('/path/to/extensions/my-plugin/build/db/entities/user.entity.js');
 * // Returns: 'my-plugin'
 *
 * const extensionDir = getExtensionIdentifierFromStack('C:\\path\\extensions\\my-plugin\\build\\db\\entities\\user.entity.js');
 * // Returns: 'my-plugin'
 * ```
 */
export function getExtensionIdentifierFromStack(suffixes: string[]): string | null {
    // Normalize the path to use forward slashes for consistent processing
    suffixes = suffixes.map((item) => item.replaceAll("/", sep));
    const stackFilePath = findStackTargetFile(suffixes);

    if (stackFilePath.length < 1) {
        return null;
    }
    const normalizedPath = stackFilePath[0].replace(/\\/g, "/");
    const extensionsStr = "/extensions/";
    const extensionsIndex = normalizedPath.indexOf(extensionsStr);

    if (extensionsIndex === -1) {
        return null;
    }

    // Extract the extension directory name from the path
    const extensionPath = normalizedPath.substring(extensionsIndex + extensionsStr.length);
    const parts = extensionPath.split("/");
    const extensionDir = parts[0]; // Get the extension directory name

    // Validate that we got a non-empty directory name
    if (!extensionDir || extensionDir.trim() === "") {
        return null;
    }

    return extensionDir;
}

/**
 * Get extension enabled status from extensions.json
 *
 * @param identifier - Extension identifier (directory name)
 * @param extensionsDir - Extensions directory path (optional)
 * @returns Enabled status (true/false), or null if not found
 */
export async function getExtensionEnabledStatus(
    identifier: string,
    extensionsDir?: string,
): Promise<boolean | null> {
    try {
        const dir = extensionsDir || join(process.cwd(), "..", "..", "extensions");
        const config = await readExtensionsConfig(dir);

        if (!config) {
            return null;
        }

        // Search in applications
        if (config.applications?.[identifier]) {
            return config.applications[identifier].enabled;
        }

        return null;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        TerminalLogger.error(
            "Extension Utils",
            `Failed to get extension enabled status for ${identifier}: ${errorMessage}`,
        );
        return null;
    }
}

/**
 * Get extension name by identifier from extensions.json
 *
 * Searches for the extension in both applications and functionals sections
 * of the extensions.json configuration file.
 *
 * @param identifier - Extension identifier (directory name)
 * @param extensionsDir - Extensions directory path (defaults to process.cwd()/extensions)
 * @returns Extension name from manifest, or null if not found
 *
 * @example
 * ```ts
 * const name = await getExtensionName('buildingai-simple-blog');
 * // Returns: 'Simple Blog'
 *
 * const name = await getExtensionName('my-plugin', '/custom/path/extensions');
 * // Returns: 'My Plugin' or null if not found
 * ```
 */
export async function getExtensionNameFromConfig(
    identifier: string,
    extensionsDir?: string,
): Promise<string | null> {
    try {
        const dir = extensionsDir || join(process.cwd(), "..", "..", "extensions");

        const config = await readExtensionsConfig(dir);

        if (!config) {
            return null;
        }

        // Search in applications
        if (config.applications[identifier]) {
            return config.applications[identifier].manifest.name;
        }

        // Search in functionals
        if (config.functionals[identifier]) {
            return config.functionals[identifier].manifest.name;
        }

        return null;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        TerminalLogger.error(
            "Extension Utils",
            `Failed to get extension name for ${identifier}: ${errorMessage}`,
        );
        return null;
    }
}
