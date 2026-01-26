import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Dict } from "../entities/dict.entity";

/**
 * 存储引擎类型常量
 */
export const STORAGE_ENGINE = {
    /** 本地存储 */
    LOCAL: "local",
    OSS: "oss",
    COS: "cos",
    KODO: "kodo",
} as const;

/**
 * 存储配置接口
 */
export interface StorageConfig {
    /** 存储引擎类型 */
    engine: (typeof STORAGE_ENGINE)[keyof typeof STORAGE_ENGINE];
    /** 域名 */
    domain?: string;
    // 后续可扩展其他配置项，如：
    // accessKey?: string;
    // secretKey?: string;
    // bucket?: string;
    // region?: string;
}

/**
 * 文件服务
 *
 * 用于处理文件路径的存储和获取，支持多种存储引擎
 */
@Injectable()
export class FileUrlService {
    private readonly logger = new Logger(FileUrlService.name);

    constructor(
        @InjectRepository(Dict)
        private readonly dictRepository: Repository<Dict>,
    ) {}

    /**
     * 设置文件路径，去除域名部分，只保留相对路径
     *
     * @param url 完整的文件URL
     * @param requestDomain 请求域名(可选),用于在没有配置APP_DOMAIN时作为兜底方案
     * @returns 处理后的相对路径
     */
    async set(url: string, requestDomain?: string): Promise<string> {
        if (!url) {
            return "";
        }

        try {
            const config = await this.getStorageConfig();

            // 根据不同的存储引擎处理URL
            const baseDomain = this.getBaseDomain(config, requestDomain);

            switch (config.engine) {
                case STORAGE_ENGINE.LOCAL:
                    return this.removeBaseDomain(url, baseDomain);
                // 后续可扩展其他存储引擎的处理逻辑
                // case STORAGE_ENGINE.OSS:
                //     return this.removeBaseDomain(url, config.domain);
                default:
                    return this.removeBaseDomain(url, baseDomain);
            }
        } catch (error) {
            this.logger.error(`处理文件路径失败: ${url}`, error);
            return url; // 出错时返回原始URL
        }
    }

    /**
     * 获取完整的文件URL，在相对路径前添加当前存储引擎的域名
     *
     * @param path 文件相对路径
     * @param requestDomain 请求域名(可选),用于在没有配置APP_DOMAIN时作为兜底方案
     * @returns 完整的文件URL
     */
    async get(path: string, requestDomain?: string): Promise<string> {
        if (!path) {
            return "";
        }

        // 如果已经是完整URL，直接返回
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }

        try {
            const config = await this.getStorageConfig();
            const baseDomain = this.getBaseDomain(config, requestDomain);

            // 根据不同的存储引擎处理路径
            switch (config.engine) {
                case STORAGE_ENGINE.LOCAL:
                    return this.joinPaths(baseDomain, path);
                // 后续可扩展其他存储引擎的处理逻辑
                // case STORAGE_ENGINE.OSS:
                //     return this.joinPaths(config.domain, path);
                default:
                    return this.joinPaths(baseDomain, path);
            }
        } catch (error) {
            this.logger.error(`获取文件URL失败: ${path}`, error);
            return path; // 出错时返回原始路径
        }
    }

    /**
     * 获取存储配置
     *
     * @returns 存储配置对象
     */
    private async getStorageConfig(): Promise<StorageConfig> {
        try {
            // Query storage configuration from dict table
            const configs = await this.dictRepository.find({
                where: {
                    group: "storage_config",
                    isEnabled: true,
                },
            });

            // Parse configuration values
            const configMap = configs.reduce(
                (acc, item) => {
                    try {
                        acc[item.key] = JSON.parse(item.value);
                    } catch {
                        acc[item.key] = item.value;
                    }
                    return acc;
                },
                {} as Record<string, any>,
            );

            return {
                engine: configMap.engine || STORAGE_ENGINE.LOCAL,
                domain:
                    configMap.domain ||
                    process.env.APP_DOMAIN ||
                    `http://localhost:${process.env.SERVER_PORT}`,
            };
        } catch (error) {
            this.logger.warn("Failed to load storage config from database, using defaults", error);
            // Fallback to default configuration
            return {
                engine: STORAGE_ENGINE.LOCAL,
                domain: process.env.APP_DOMAIN || `http://localhost:${process.env.SERVER_PORT}`,
            };
        }
    }

    /**
     * 从URL中移除基础域名，只保留相对路径
     *
     * @param url 完整URL
     * @param baseDomain 基础域名
     * @returns 相对路径
     */
    private removeBaseDomain(url: string, baseDomain?: string): string {
        if (!url) return "";
        if (!baseDomain) return url;

        // 如果已经是相对路径(不包含协议),直接返回
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return url.replace(/^\//, "");
        }

        try {
            // 尝试创建URL对象
            const urlObj = new URL(url);
            const baseDomainObj = new URL(baseDomain);

            // Compare origin (protocol + hostname + port) to ensure exact domain match
            if (urlObj.origin === baseDomainObj.origin) {
                // 移除开头的斜杠，确保返回的是相对路径
                return urlObj.pathname.replace(/^\//, "");
            }

            // 如果域名不匹配，可能是外部资源，返回完整URL
            return url;
        } catch (error) {
            console.error(error);
            // 如果URL解析失败，可能是相对路径，直接返回
            if (url.startsWith(baseDomain)) {
                return url.substring(baseDomain.length).replace(/^\//, "");
            }
            return url;
        }
    }

    /**
     * 获取基础域名
     *
     * 优先级策略:
     * - 本地存储(LOCAL): requestDomain > config.domain > APP_DOMAIN > localhost
     *   优先使用请求域名,确保静态资源与前端访问域名一致,避免跨域问题
     * - 其他存储引擎: config.domain > APP_DOMAIN > requestDomain > localhost
     *   使用配置的CDN域名或对象存储域名
     *
     * @param config 存储配置
     * @param requestDomain 请求域名
     * @returns 基础域名
     */
    private getBaseDomain(config: StorageConfig, requestDomain?: string): string {
        // 对于本地存储,优先使用请求域名,确保与前端访问域名一致
        if (config.engine === STORAGE_ENGINE.LOCAL) {
            return (
                requestDomain ||
                config.domain ||
                process.env.APP_DOMAIN ||
                `http://localhost:${process.env.SERVER_PORT}`
            );
        }

        // 对于其他存储引擎(如OSS、S3等),优先使用配置的域名
        return (
            config.domain ||
            process.env.APP_DOMAIN ||
            requestDomain ||
            `http://localhost:${process.env.SERVER_PORT}`
        );
    }

    private joinPaths(...segments: string[]): string {
        // 过滤掉空字符串
        const filteredSegments = segments.filter((segment) => segment !== "");

        if (filteredSegments.length === 0) {
            return "";
        }

        // 处理每个片段，移除前后多余的斜杠
        const normalizedSegments = filteredSegments.map((segment, index) => {
            // 移除开头的斜杠（第一个片段除外）
            let normalized = index === 0 ? segment : segment.replace(/^\/+/, "");
            // 移除结尾的斜杠（最后一个片段除外）
            normalized =
                index === filteredSegments.length - 1 ? normalized : normalized.replace(/\/+$/, "");
            return normalized;
        });

        // 使用单个斜杠连接所有片段
        return normalizedSegments.join("/");
    }
}
