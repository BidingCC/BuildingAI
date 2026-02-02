import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Extension, ExtensionFeature, MembershipLevels } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { TerminalLogger } from "@buildingai/utils";
import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import * as fs from "fs-extra";
import * as path from "path";

import { ExtensionFeatureService } from "./extension-feature.service";

/**
 * 扫描到的会员功能项
 */
export interface ScannedFeatureItem {
    /**
     * 功能编码
     */
    code: string;

    /**
     * 功能名称
     */
    name: string;

    /**
     * 功能描述
     */
    description?: string;

    /**
     * 插件标识符
     */
    extensionIdentifier: string;
}

/**
 * 同步结果
 */
export interface SyncResult {
    /**
     * 新增数量
     */
    added: number;

    /**
     * 更新数量
     */
    updated: number;

    /**
     * 移除数量
     */
    removed: number;

    /**
     * 总数量
     */
    total: number;
}

/**
 * 插件功能扫描服务
 *
 * 扫描插件构建产物中的 @MemberOnly 装饰器元数据，收集会员功能配置
 * 并在插件安装时自动写入 extension_feature 表
 */
@Injectable()
export class ExtensionFeatureScanService {
    private readonly logger = new Logger(ExtensionFeatureScanService.name);
    private readonly rootDir: string;
    private readonly extensionsDir: string;

    constructor(
        @InjectRepository(ExtensionFeature)
        private readonly extensionFeatureRepository: Repository<ExtensionFeature>,
        @InjectRepository(Extension)
        private readonly extensionRepository: Repository<Extension>,
        @InjectRepository(MembershipLevels)
        private readonly membershipLevelsRepository: Repository<MembershipLevels>,
        @Inject(forwardRef(() => ExtensionFeatureService))
        private readonly extensionFeatureService: ExtensionFeatureService,
    ) {
        this.rootDir = path.join(process.cwd(), "..", "..");
        this.extensionsDir = path.join(this.rootDir, "extensions");
    }

    /**
     * 扫描指定插件的会员功能并同步到数据库
     *
     * 在插件安装时调用此方法
     *
     * @param identifier 插件标识符
     * @param extensionId 插件ID
     * @returns 同步结果
     */
    async scanAndSyncExtensionFeatures(
        identifier: string,
        extensionId: string,
    ): Promise<SyncResult> {
        this.logger.log(`开始扫描插件 ${identifier} 的功能...`);

        const result: SyncResult = { added: 0, updated: 0, removed: 0, total: 0 };

        try {
            const features = await this.scanExtensionFeatures(identifier);

            this.logger.log(`扫描到 ${features.length} 个功能`);

            // 同步到数据库（即使 features 为空也要执行，以便删除数据库中已不存在的功能）
            const syncResult = await this.syncFeaturesToDatabase(extensionId, features);
            Object.assign(result, syncResult);

            if (result.added > 0 || result.updated > 0 || result.removed > 0) {
                this.logger.log(
                    `插件 ${identifier} 功能同步完成: 新增 ${result.added}, 更新 ${result.updated}, 删除 ${result.removed}`,
                );
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`扫描插件 ${identifier} 功能失败: ${errorMessage}`);
            // 不抛出错误，避免影响插件安装流程
        }

        return result;
    }

    /**
     * 扫描插件的会员功能配置
     *
     * 通过解析插件构建产物中的 JS 文件，提取 @MemberOnly 装饰器的元数据
     *
     * @param identifier 插件标识符
     * @returns 扫描到的功能列表
     */
    private async scanExtensionFeatures(identifier: string): Promise<ScannedFeatureItem[]> {
        const safeIdentifier = this.toSafeName(identifier);
        const extensionPath = path.join(this.extensionsDir, safeIdentifier);
        const controllersPath = path.join(extensionPath, "build", "modules");

        // 检查构建目录是否存在
        if (!(await fs.pathExists(controllersPath))) {
            this.logger.debug(`插件 ${identifier} 没有 API 构建目录`);
            return [];
        }

        const features: ScannedFeatureItem[] = [];
        const featuresMap = new Map<string, ScannedFeatureItem>();

        // 递归查找所有 JS 文件
        const jsFiles = await this.findJsFiles(controllersPath);

        for (const jsFile of jsFiles) {
            try {
                const fileFeatures = await this.extractFeaturesFromFile(jsFile, identifier);
                fileFeatures.forEach((feature) => {
                    featuresMap.set(feature.code, feature);
                });
            } catch (error) {
                this.logger.debug(`解析文件 ${jsFile} 失败: ${error}`);
            }
        }

        features.push(...featuresMap.values());
        return features;
    }

    /**
     * 递归查找目录下的所有 JS 文件
     *
     * @param dir 目录路径
     * @returns JS 文件路径列表
     */
    private async findJsFiles(dir: string): Promise<string[]> {
        const files: string[] = [];

        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await this.findJsFiles(fullPath);
                files.push(...subFiles);
            } else if (entry.isFile() && entry.name.endsWith(".js")) {
                files.push(fullPath);
            }
        }

        return files;
    }

    /**
     * 从 JS 文件中提取 @MemberOnly 装饰器的功能配置
     *
     * 通过正则表达式匹配编译后的装饰器调用来提取元数据
     * 编译后的格式: decorators.MemberOnly({ code: "xxx", name: "xxx", description: "xxx" })
     *
     * @param filePath JS 文件路径
     * @param identifier 插件标识符
     * @returns 提取到的功能列表
     */
    private async extractFeaturesFromFile(
        filePath: string,
        identifier: string,
    ): Promise<ScannedFeatureItem[]> {
        const content = await fs.readFile(filePath, "utf-8");
        const features: ScannedFeatureItem[] = [];

        // 匹配编译后的 MemberOnly 装饰器调用
        // 格式: decorators.MemberOnly({ code: "xxx", name: "xxx", description: "xxx" })
        // 或: MemberOnly({ code: "xxx", name: "xxx" })
        const patterns = [
            // 匹配 decorators.MemberOnly({...}) 格式
            /(?:decorators\.)?MemberOnly\s*\(\s*\{([^}]+)\}\s*\)/g,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                try {
                    const objContent = match[1];
                    const feature = this.parseObjectContent(objContent, identifier);
                    if (feature) {
                        features.push(feature);
                    }
                } catch (error) {
                    this.logger.debug(`解析 MemberOnly 装饰器失败: ${error}`);
                }
            }
        }

        return features;
    }

    /**
     * 解析对象内容字符串，提取 code、name、description 属性
     *
     * @param objContent 对象内容字符串，如: code: "xxx", name: "xxx", description: "xxx"
     * @param identifier 插件标识符
     * @returns 解析后的功能项，如果解析失败返回 null
     */
    private parseObjectContent(objContent: string, identifier: string): ScannedFeatureItem | null {
        // 提取 code 属性
        const codeMatch = objContent.match(/code\s*:\s*["']([^"']+)["']/);
        // 提取 name 属性（可能包含 Unicode 转义）
        const nameMatch = objContent.match(/name\s*:\s*["']([^"']+)["']/);
        // 提取 description 属性（可选）
        const descMatch = objContent.match(/description\s*:\s*["']([^"']+)["']/);

        if (!codeMatch || !nameMatch) {
            return null;
        }

        return {
            code: codeMatch[1],
            name: this.decodeUnicode(nameMatch[1]),
            description: descMatch ? this.decodeUnicode(descMatch[1]) : undefined,
            extensionIdentifier: identifier,
        };
    }

    /**
     * 解码 Unicode 转义字符串
     *
     * @param str 可能包含 Unicode 转义的字符串
     * @returns 解码后的字符串
     */
    private decodeUnicode(str: string): string {
        return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
            String.fromCharCode(parseInt(code, 16)),
        );
    }

    /**
     * 将功能同步到数据库
     *
     * @param extensionId 插件ID
     * @param features 功能列表
     * @returns 同步结果
     */
    private async syncFeaturesToDatabase(
        extensionId: string,
        features: ScannedFeatureItem[],
    ): Promise<SyncResult> {
        const result: SyncResult = { added: 0, updated: 0, removed: 0, total: features.length };

        // 获取当前插件已存在的功能
        const existingFeatures = await this.extensionFeatureRepository.find({
            where: { extensionId },
        });
        const scannedFeatureCodes = new Set(features.map((f) => f.code));

        // 同步扫描到的功能
        for (const feature of features) {
            // 检查功能是否已存在
            const existingFeature = await this.extensionFeatureRepository.findOne({
                where: { featureCode: feature.code },
            });

            if (existingFeature) {
                // 更新已存在的功能（只更新名称和描述，不影响会员等级配置）
                await this.extensionFeatureRepository.update(existingFeature.id, {
                    name: feature.name,
                    description: feature.description,
                });
                TerminalLogger.info("更新功能", `${feature.code}`);
                result.updated++;
            } else {
                // 创建新功能
                const newFeature = this.extensionFeatureRepository.create({
                    featureCode: feature.code,
                    name: feature.name,
                    description: feature.description,
                    extensionId,
                    status: true,
                });
                await this.extensionFeatureRepository.save(newFeature);
                TerminalLogger.info("创建功能", `${feature.code} (${feature.name})`);
                result.added++;
            }
        }

        // 删除数据库中存在但扫描不到的功能（硬删除）
        for (const existingFeature of existingFeatures) {
            if (!scannedFeatureCodes.has(existingFeature.featureCode)) {
                await this.extensionFeatureRepository.delete(existingFeature.id);
                this.logger.log(`删除功能: ${existingFeature.featureCode}`);
                result.removed++;
            }
        }

        return result;
    }

    /**
     * 转换标识符为安全的目录名
     *
     * @param identifier 插件标识符
     * @returns 安全的目录名
     */
    private toSafeName(identifier: string): string {
        return identifier.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
    }

    /**
     * 获取插件的功能列表
     *
     * @param extensionId 插件ID
     * @returns 功能列表，包含关联的会员等级
     */
    async getExtensionFeatures(extensionId: string): Promise<ExtensionFeature[]> {
        return await this.extensionFeatureRepository.find({
            where: { extensionId, status: true },
            relations: ["membershipLevels"],
            order: { createdAt: "ASC" },
        });
    }

    /**
     * 更新功能的会员等级配置
     *
     * @param featureId 功能ID
     * @param levelIds 会员等级ID列表
     * @returns 更新后的功能
     */
    async updateFeatureMembershipLevels(
        featureId: string,
        levelIds: string[],
    ): Promise<ExtensionFeature> {
        const feature = await this.extensionFeatureRepository.findOne({
            where: { id: featureId },
            relations: ["membershipLevels"],
        });

        if (!feature) {
            throw HttpErrorFactory.notFound("功能不存在");
        }

        // 获取会员等级实体
        let levels: MembershipLevels[] = [];
        if (levelIds && levelIds.length > 0) {
            levels = await this.membershipLevelsRepository.find({
                where: { id: In(levelIds) },
            });
        }

        // 更新关联关系
        feature.membershipLevels = levels;
        await this.extensionFeatureRepository.save(feature);

        // 清除功能缓存，使配置立即生效
        await this.extensionFeatureService.clearFeatureCache(feature.featureCode);

        this.logger.log(
            `更新功能 ${feature.featureCode} 的会员等级: ${levels.map((l) => l.name).join(", ") || "无限制"}`,
        );

        return feature;
    }
}
