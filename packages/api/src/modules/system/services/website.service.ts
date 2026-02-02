import { BaseService } from "@buildingai/base";
import { AppConfig } from "@buildingai/config/app.config";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

import { UpdateWebsiteDto } from "../dto/update-website.dto";

@Injectable()
export class WebsiteService extends BaseService<Dict> {
    constructor(
        private readonly dictService: DictService,
        @InjectRepository(Dict) repository: Repository<Dict>,
    ) {
        super(repository);
    }

    /**
     * 获取网站配置
     * @returns 网站配置信息
     */
    async getConfig() {
        // 获取各组配置
        const webinfo = await this.getGroupConfig("webinfo", {
            name: "BuildingAI",
            description: "BuildingAI",
            icon: "",
            logo: "",
            spaLoadingIcon: "",
            version: "",
            isDemo: false,
        });
        const agreement = await this.getGroupConfig("agreement", {
            serviceTitle: "",
            serviceContent: "",
            privacyTitle: "",
            privacyContent: "",
            paymentTitle: "",
            paymentContent: "",
            updateAt: "",
        });
        const copyright = await this.getGroupConfig("copyright", [
            {
                displayName: "",
                iconUrl: "",
                url: "",
                copyrightText: "",
                copyrightBrand: "",
                copyrightUrl: "",
            },
        ]);
        const statistics = await this.getGroupConfig("statistics", {
            appid: "",
        });

        webinfo.version = AppConfig.version;
        webinfo.isDemo = process.env.SERVER_IS_DEMO_ENV === "true";
        return {
            webinfo,
            agreement,
            copyright,
            statistics,
        };
    }

    /**
     * 获取指定分组的配置
     * @param group 配置分组
     * @param defaultConfig 默认配置对象
     * @returns 配置对象
     */
    private async getGroupConfig<T = any>(group: string, defaultConfig: T): Promise<T> {
        try {
            const configs = await this.dictService.findAll({
                where: { group },
                order: { sort: "ASC" },
            });

            if (configs.length === 0) {
                return defaultConfig;
            }

            // 将配置转换为对象格式
            const result = {};
            for (const config of configs) {
                result[config.key] = this.parseValue(config.value);
            }

            // 合并默认配置和实际配置，确保返回完整的配置对象
            return { ...defaultConfig, ...result } as T;
        } catch (error) {
            this.logger.error(`获取分组 ${group} 的配置失败: ${error.message}`);
            return defaultConfig;
        }
    }

    /**
     * 将存储的字符串解析为适当的类型
     * @param value 存储的字符串值
     * @returns 解析后的值
     */
    private parseValue<T = any>(value: string): T {
        if (!value) {
            return null as unknown as T;
        }

        // 尝试解析为JSON
        try {
            // 判断是否可能是JSON
            if (
                (value.startsWith("{") && value.endsWith("}")) ||
                (value.startsWith("[") && value.endsWith("]")) ||
                value === "true" ||
                value === "false" ||
                value === "null" ||
                !isNaN(Number(value))
            ) {
                return JSON.parse(value) as T;
            }
        } catch {
            // 解析失败，忽略错误
        }

        // 如果不是JSON，返回原始字符串
        return value as unknown as T;
    }

    /**
     * 设置网站配置
     * @param updateWebsiteDto 更新网站配置DTO
     * @returns 更新结果
     */
    async setConfig(updateWebsiteDto: UpdateWebsiteDto) {
        const { webinfo, agreement, copyright, statistics } = updateWebsiteDto;

        // 只更新传递的配置组
        if (webinfo) {
            // 处理SPA加载图标
            if (webinfo.spaLoadingIcon) {
                await this.processSpaLoadingIcon(webinfo.spaLoadingIcon);
            }
            await this.updateGroupConfig("webinfo", webinfo);
        }
        if (agreement) {
            await this.updateGroupConfig("agreement", agreement);
        }
        if (copyright) {
            await this.updateGroupConfig("copyright", copyright);
        }
        if (statistics) {
            await this.updateGroupConfig("statistics", statistics);
        }

        return { success: true };
    }

    /**
     * 处理SPA加载图标
     * @param iconPath 图标路径（可能是URL或相对路径）
     */
    private async processSpaLoadingIcon(iconPath: string): Promise<void> {
        try {
            // 确保路径存在且有效
            if (!iconPath) return;

            // 获取项目根目录路径
            const rootDir = path.resolve(process.cwd());
            const projectRoot = path.join(rootDir, "..", "..");
            const targetDir = path.join(projectRoot, "public/web");
            const targetPath = path.join(targetDir, "spa-loading.png");

            let sourcePath: string;

            // 判断iconPath是URL还是相对路径
            if (iconPath.startsWith("http://") || iconPath.startsWith("https://")) {
                // 如果是URL，需要转换为本地文件路径
                try {
                    const url = new URL(iconPath);
                    // 假设URL路径对应的本地路径在项目根目录下
                    // 例如: http://localhost:4090/uploads/image/xxx.png -> projectRoot/storage/uploads/image/xxx.png
                    sourcePath = path.join(
                        projectRoot,
                        "storage",
                        decodeURIComponent(url.pathname),
                    );
                    this.logger.debug(`源文件路径: ${sourcePath}`);
                } catch (urlError) {
                    console.error(urlError);
                    this.logger.error(`无效的URL格式: ${iconPath}`);
                    return;
                }
            } else {
                // 如果是相对路径，直接拼接到项目根目录
                sourcePath = path.join(projectRoot, iconPath);
            }

            // 检查源文件是否存在
            if (!fs.existsSync(sourcePath)) {
                this.logger.error(`源文件不存在: ${sourcePath}`);
                return;
            }

            // 检查源文件是否可读
            try {
                await promisify(fs.access)(sourcePath, fs.constants.R_OK);
            } catch (accessError) {
                console.error(accessError);
                this.logger.error(`没有源文件的读取权限: ${sourcePath}`);
                // 存储原始图标路径，不进行物理复制
                return;
            }

            // 确保目标目录存在
            try {
                if (!fs.existsSync(targetDir)) {
                    await promisify(fs.mkdir)(targetDir, {
                        recursive: true,
                        mode: 0o755,
                    });
                }
            } catch (mkdirError) {
                this.logger.error(`无法创建目标目录: ${targetDir}, 错误: ${mkdirError.message}`);
                // 存储原始图标路径，不进行物理复制
                return;
            }

            // 检查目标目录是否可写
            try {
                await promisify(fs.access)(targetDir, fs.constants.W_OK);
            } catch {
                this.logger.error(`没有目标目录的写入权限: ${targetDir}`);
                // 存储原始图标路径，不进行物理复制
                return;
            }

            // 如果目标文件已存在，先尝试删除
            try {
                if (fs.existsSync(targetPath)) {
                    await promisify(fs.unlink)(targetPath);
                }
            } catch (unlinkError) {
                this.logger.error(
                    `无法删除已存在的目标文件: ${targetPath}, 错误: ${unlinkError.message}`,
                );
                // 如果无法删除，可能是权限问题，尝试继续复制（可能会失败）
            }

            // 复制文件到目标位置
            try {
                await promisify(fs.copyFile)(sourcePath, targetPath);
                this.logger.debug(`成功将SPA加载图标复制到: ${targetPath}`);

                // 更新spa-loading-template.html中的图片源路径
                await this.updateSpaLoadingTemplate(targetDir);
            } catch (copyError) {
                this.logger.error(`复制文件失败: ${copyError.message}`);
                this.logger.warn(`将使用原始图标路径而不是物理复制`);
                // 存储原始图标路径，不进行物理复制
            }
        } catch (error) {
            this.logger.error(`处理SPA加载图标失败: ${error.message}`);
            // 不抛出错误，允许流程继续，仅记录错误
        }
    }

    /**
     * 更新SPA加载模板中的图片源路径
     * @param targetDir 目标目录
     */
    private async updateSpaLoadingTemplate(targetDir: string): Promise<void> {
        try {
            const templatePath = path.join(targetDir, "index.html");

            // 检查模板文件是否存在
            if (!fs.existsSync(templatePath)) {
                this.logger.warn(`SPA加载模板文件不存在: ${templatePath}`);
                return;
            }

            // 读取模板文件内容
            const templateContent = await promisify(fs.readFile)(templatePath, "utf8");

            // 生成带时间戳的图片路径
            const timestamp = new Date().getTime();
            const imagePath = `/spa-loading.png?v=${timestamp}`;

            // 使用正则表达式替换img标签的src属性
            // 匹配 <img ... src="任意路径" ... /> 并替换为 src="/spa-loading.png?v=timestamp"
            const updatedContent = templateContent.replace(
                /(<img[^>]*\s+src=")[^"]*(")/gi,
                `$1${imagePath}$2`,
            );

            // 写回文件
            await promisify(fs.writeFile)(templatePath, updatedContent, "utf8");
            this.logger.debug(`成功更新SPA加载模板: ${templatePath}`);
        } catch (error) {
            this.logger.error(`更新SPA加载模板失败: ${error.message}`);
            // 这里不抛出错误，因为模板更新失败不应该影响主流程
        }
    }

    /**
     * File URL fields that need normalization for each config group
     */
    private readonly FILE_URL_FIELDS_MAP: Record<string, string[]> = {
        webinfo: ["icon", "logo", "spaLoadingIcon"],
        copyright: ["**.iconUrl"],
    };

    private async updateGroupConfig(group: string, data: Record<string, any>) {
        if (!data) return;

        try {
            // 如果是协议配置，添加更新时间
            if (group === "agreement") {
                data.updateAt = new Date().toISOString();
            }

            // Get file URL fields for this group
            const fileUrlFields = this.FILE_URL_FIELDS_MAP[group];

            // 遍历对象的每个属性
            for (const [key, value] of Object.entries(data)) {
                // Check if this key needs file URL normalization
                const needsNormalization = fileUrlFields?.some(
                    (field) => field === key || field.startsWith("**."),
                );

                // 使用 dictService 的 set 方法更新或创建配置
                await this.dictService.set(key, value, {
                    group,
                    description: `网站${group}配置 - ${key}`,
                    sort: 0,
                    isEnabled: true,
                    ...(needsNormalization && {
                        normalizeFileUrlFields: fileUrlFields.includes(key)
                            ? ["**"]
                            : fileUrlFields,
                    }),
                });
            }
        } catch (error) {
            this.logger.error(`更新分组 ${group} 的配置失败: ${error.message}`);
            throw error; // 将错误向上抛出，便于控制器处理
        }
    }
}
