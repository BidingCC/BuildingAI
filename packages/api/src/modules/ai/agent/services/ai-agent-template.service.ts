import type { UserPlayground } from "@buildingai/db";
import { FileUrlService } from "@buildingai/db";
import { HttpErrorFactory } from "@buildingai/errors";
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { existsSync, readFileSync } from "fs";
import * as yaml from "js-yaml";
import { join } from "path";
import { firstValueFrom } from "rxjs";

// 不再需要 ImportAgentDto，使用通用的对象类型
import {
    AgentTemplateDto,
    BatchImportAgentDslDto,
    CreateAgentFromTemplateDto,
    ImportAgentDslDto,
    QueryTemplateDto,
} from "../dto/template";
import { AiAgentService } from "./ai-agent.service";

@Injectable()
export class AiAgentTemplateService {
    private readonly logger = new Logger(AiAgentTemplateService.name);
    private readonly templates: AgentTemplateDto[] = [];

    constructor(
        private readonly aiAgentService: AiAgentService,
        private readonly httpService: HttpService,
        private readonly fileUrlService: FileUrlService,
    ) {
        this.loadTemplates();
    }

    /**
     * 从 JSON 文件加载模板数据
     */
    private loadTemplates(): void {
        try {
            // 从当前工作目录构建路径，加载 agent/data 目录下的模板文件
            const templatePath = join(
                process.cwd(),
                "src/modules/ai/agent/data/agent-templates.json",
            );
            const templateData = readFileSync(templatePath, "utf-8");
            const parsedData = JSON.parse(templateData);

            if (parsedData.templates && Array.isArray(parsedData.templates)) {
                this.templates.push(...parsedData.templates);
                this.logger.log(`成功加载 ${parsedData.templates.length} 个模板`);
            } else {
                throw new Error("模板数据格式错误");
            }
        } catch (error) {
            this.logger.error(`加载模板数据失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取模板列表
     */
    async getTemplateList(query: QueryTemplateDto): Promise<AgentTemplateDto[]> {
        let filteredTemplates = [...this.templates];

        // 关键词搜索
        if (query.keyword) {
            const keyword = query.keyword.toLowerCase();
            filteredTemplates = filteredTemplates.filter(
                (template) =>
                    template.name.toLowerCase().includes(keyword) ||
                    template.description?.toLowerCase().includes(keyword) ||
                    template.tags?.some((tag) => tag.toLowerCase().includes(keyword)),
            );
        }

        // 分类筛选
        if (query.categories) {
            filteredTemplates = filteredTemplates.filter(
                (template) => template.categories === query.categories,
            );
        }

        // 标签筛选
        if (query.tags && query.tags.length > 0) {
            filteredTemplates = filteredTemplates.filter((template) =>
                template.tags?.some((tag) => query.tags!.includes(tag)),
            );
        }

        // 推荐筛选
        if (query.recommended) {
            filteredTemplates = filteredTemplates.filter((template) => template.isRecommended);
        }

        // 排序
        if (query.sortBy) {
            this.sortTemplates(filteredTemplates, query.sortBy, query.sortOrder);
        }

        return filteredTemplates;
    }

    /**
     * 排序模板列表
     */
    private sortTemplates(
        templates: AgentTemplateDto[],
        sortBy: string,
        sortOrder?: "asc" | "desc",
    ): void {
        templates.sort((a, b) => {
            let aValue = a[sortBy as keyof AgentTemplateDto];
            let bValue = b[sortBy as keyof AgentTemplateDto];

            // 字符串比较时转换为小写
            if (typeof aValue === "string" && typeof bValue === "string") {
                aValue = aValue.toLowerCase() as any;
                bValue = bValue.toLowerCase() as any;
            }

            // 比较逻辑
            if (aValue === bValue) return 0;
            const isAscending = sortOrder !== "desc";

            return (aValue < bValue ? -1 : 1) * (isAscending ? 1 : -1);
        });
    }

    /**
     * 根据ID获取模板详情
     */
    async getTemplateById(templateId: string): Promise<AgentTemplateDto | null> {
        return this.templates.find((t) => t.id === templateId) || null;
    }

    /**
     * 从模板创建智能体
     * @param dto 创建参数，包含模板ID及可覆盖的字段
     * @returns 新的智能体配置对象（不会修改原始模板）
     */
    async createAgentFromTemplate(dto: CreateAgentFromTemplateDto) {
        const template = await this.getTemplateById(dto.templateId);
        if (!template) {
            throw new Error(`模板不存在: ${dto.templateId}`);
        }

        // 使用解构排除不需要从模板继承的字段，避免修改原始模板对象
        const { id: _omitId, datasetIds: _omitDatasetIds, ...templateForCreate } = template;

        return {
            ...templateForCreate,
            ...dto,
        };
    }

    async getTemplateCategories(): Promise<string[]> {
        const categories = [...new Set(this.templates.map((t) => t.categories).filter(Boolean))];
        return categories.sort();
    }

    async getRecommendedTemplates(): Promise<AgentTemplateDto[]> {
        return this.templates.filter((template) => template.isRecommended);
    }

    /**
     * 导出智能体 DSL 配置
     * 将智能体配置导出为 YAML 或 JSON 格式的 DSL 文件
     *
     * @param agentId 智能体ID
     * @param format 导出格式（yaml 或 json）
     * @returns DSL 格式字符串
     */
    async exportAgentDsl(agentId: string, format: "yaml" | "json" = "yaml"): Promise<string> {
        try {
            // 获取智能体详情
            const agent = await this.aiAgentService.getAgentDetail(agentId);

            // 拼接头像的完整 URL（包含域名或 OSS 地址）
            const avatar = agent.avatar ? await this.fileUrlService.get(agent.avatar) : undefined;
            const chatAvatar = agent.chatAvatar
                ? await this.fileUrlService.get(agent.chatAvatar)
                : undefined;

            // 构建 DSL 配置对象
            const dslConfig = {
                name: agent.name,
                description: agent.description,
                avatar,
                chatAvatar,
                rolePrompt: agent.rolePrompt,
                openingStatement: agent.openingStatement,
                openingQuestions: agent.openingQuestions,
                showContext: agent.showContext,
                showReference: agent.showReference,
                enableFeedback: agent.enableFeedback,
                enableWebSearch: agent.enableWebSearch,
                modelConfig: agent.modelConfig,
                billingConfig: agent.billingConfig,
                datasetIds: agent.datasetIds,
                mcpServerIds: agent.mcpServerIds,
                quickCommands: agent.quickCommands,
                autoQuestions: agent.autoQuestions,
                formFields: agent.formFields,
                thirdPartyIntegration: agent.thirdPartyIntegration,
                publishConfig: agent.publishConfig,
            };

            // 根据格式导出
            if (format === "yaml") {
                return yaml.dump(dslConfig, {
                    indent: 2,
                    lineWidth: -1,
                    noRefs: true,
                    sortKeys: false,
                });
            } else {
                return JSON.stringify(dslConfig, null, 2);
            }
        } catch (error) {
            this.logger.error(`导出 DSL 失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.business("导出 DSL 配置失败");
        }
    }

    /**
     * 导入智能体 DSL 配置
     * 从 YAML 或 JSON 格式的 DSL 文件导入智能体配置
     *
     * @param dto 导入 DSL 配置DTO
     * @returns 导入的智能体信息
     */
    async importAgentDsl(dto: ImportAgentDslDto) {
        try {
            // 处理 content，如果是 URL 则读取文件内容
            let content = dto.content;
            console.log("content", content);

            // 检测是否为 URL
            if (content.startsWith("http://") || content.startsWith("https://")) {
                content = await this.readFileFromUrl(content);
            }

            // 解析 DSL 内容
            const format = dto.format || this.detectFormat(content);
            let agentData: any;

            if (format === "yaml") {
                agentData = yaml.load(content);
            } else {
                agentData = JSON.parse(content);
            }

            if (!agentData || typeof agentData !== "object") {
                throw new Error("DSL 配置格式错误");
            }
            // 构建导入数据对象，允许通过参数覆盖 DSL 中的值
            let agentName = dto.name || agentData.name;

            // 检查名称是否已存在，如果存在则自动添加后缀
            agentName = await this.generateUniqueName(agentName);

            const importData = {
                name: agentName,
                description: dto.description || agentData.description,
                avatar: dto.avatar || agentData.avatar,
                chatAvatar: agentData.chatAvatar,
                rolePrompt: agentData.rolePrompt,
                openingStatement: agentData.openingStatement,
                openingQuestions: agentData.openingQuestions || [],
                showContext: agentData.showContext,
                showReference: agentData.showReference,
                enableFeedback: agentData.enableFeedback,
                enableWebSearch: agentData.enableWebSearch,
                createMode: agentData.createMode,
                thirdPartyIntegration: agentData.thirdPartyIntegration,
                // 快捷指令、自动问题、表单字段
                quickCommands: agentData.quickCommands || [],
                autoQuestions: agentData.autoQuestions || [],
                formFields: agentData.formFields || [],
                // 计费配置
                billingConfig: agentData.billingConfig || null,
                // 导入时清空这些关联配置
                datasetIds: [],
                mcpServerIds: [],
                modelConfig: agentData.modelConfig
                    ? {
                          ...agentData.modelConfig,
                          id: null,
                          options: agentData.modelConfig.options || {},
                      }
                    : null,
                createBy: dto.createBy,
            };

            this.logger.log(`导入 DSL 配置: ${importData.name}`);

            return importData;
        } catch (error) {
            this.logger.error(`导入 DSL 失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.business("导入 DSL 配置失败: " + error.message);
        }
    }

    /**
     * 批量导入智能体 DSL 配置
     * 从多个 DSL 格式文件批量导入智能体配置
     *
     * @param dto 批量导入 DSL 配置DTO
     * @param user 当前用户信息
     * @returns 批量导入结果
     */
    async batchImportAgentDsl(dto: BatchImportAgentDslDto, user: UserPlayground) {
        const results = {
            total: dto.contents.length,
            success: 0,
            failed: 0,
            agents: [] as any[],
            errors: [] as Array<{ file: string; error: string }>,
        };

        for (const content of dto.contents) {
            try {
                const importDto: ImportAgentDslDto = {
                    content,
                    format: dto.format,
                    createBy: dto.createBy || user.id,
                };

                const importData = await this.importAgentDsl(importDto);

                // 创建智能体
                const agent = await this.aiAgentService.createAgentFromTemplate(importData, user);

                // 自动发布智能体
                await this.aiAgentService.publishAgent(agent.id, {
                    publishConfig: {
                        allowOrigins: [],
                        rateLimitPerMinute: 60,
                        showBranding: true,
                        allowDownloadHistory: false,
                    },
                });

                results.success++;
                results.agents.push(agent);
            } catch (error) {
                results.failed++;
                results.errors.push({
                    file: content,
                    error: error.message || "未知错误",
                });
                this.logger.error(`批量导入 DSL 失败 [${content}]: ${error.message}`, error.stack);
            }
        }

        this.logger.log(
            `批量导入 DSL 完成: 总计 ${results.total}，成功 ${results.success}，失败 ${results.failed}`,
        );

        return results;
    }

    /**
     * 检测 DSL 文件格式
     * @param content DSL 内容
     * @returns 格式类型
     */
    private detectFormat(content: string): "yaml" | "json" {
        content = content.trim();
        // 如果以 { 开头，判断为 JSON
        if (content.startsWith("{")) {
            return "json";
        }
        // 默认判断为 YAML
        return "yaml";
    }

    /**
     * 从 URL 读取文件内容
     * 支持本地文件系统和外部 URL（OSS、CDN 等）
     *
     * @param url 文件 URL
     * @returns 文件内容
     */
    private async readFileFromUrl(url: string): Promise<string> {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;

            // 判断是否是外部 URL（OSS、CDN 等）
            const isExternalUrl =
                hostname.includes("oss") ||
                hostname.includes("aliyuncs.com") ||
                hostname.includes("qcloud.com") ||
                hostname.includes("qiniucdn.com") ||
                hostname.includes("amazonaws.com") ||
                (!hostname.includes("localhost") &&
                    !hostname.includes("127.0.0.1") &&
                    !hostname.match(/^\d+\.\d+\.\d+\.\d+$/));

            // 如果是外部 URL，使用 HTTP 请求下载
            if (isExternalUrl) {
                this.logger.log(`从外部 URL 下载 DSL: ${url}`);
                try {
                    const response = await firstValueFrom(
                        this.httpService.get(url, {
                            responseType: "text",
                            timeout: 30000,
                        }),
                    );
                    return response.data;
                } catch (httpError: any) {
                    this.logger.error(`从外部 URL 下载文件失败: ${url}`, httpError);
                    throw new Error(`无法从外部 URL 下载文件: ${httpError.message}`);
                }
            }

            // 尝试从本地文件系统读取
            // 例如: http://localhost:4090/uploads/other/2025/10/xxx.yaml
            // 转换为: ../../storage/uploads/other/2025/10/xxx.yaml
            let filePath = urlObj.pathname;

            if (filePath.startsWith("/uploads/")) {
                filePath = filePath.substring("/uploads".length);
            }

            // 移除开头的斜杠，确保路径是相对路径
            if (filePath.startsWith("/")) {
                filePath = filePath.substring(1);
            }

            const fullPath = join(process.cwd(), "../../storage/uploads", filePath);

            this.logger.log(`从文件路径读取 DSL: ${fullPath}`);

            // 检查文件是否存在
            if (!existsSync(fullPath)) {
                // 如果本地文件不存在，尝试使用 HTTP 请求作为兜底方案
                this.logger.warn(`本地文件不存在，尝试从 URL 下载: ${url}`);
                try {
                    const response = await firstValueFrom(
                        this.httpService.get(url, {
                            responseType: "text",
                            timeout: 30000,
                        }),
                    );
                    return response.data;
                } catch (httpError: any) {
                    this.logger.error(`从 URL 下载文件失败: ${url}`, httpError);
                    throw new Error(`无法读取文件: 本地文件不存在且无法从 URL 下载`);
                }
            }

            // 读取文件内容
            const content = readFileSync(fullPath, "utf-8");
            return content;
        } catch (error) {
            this.logger.error(`从 URL 读取文件失败: ${url}`, error);
            throw new Error(`无法读取文件: ${error.message}`);
        }
    }

    /**
     * 生成唯一的智能体名称
     * 如果名称已存在，自动添加数字后缀
     *
     * @param name 原始名称
     * @returns 唯一的名称
     */
    private async generateUniqueName(name: string): Promise<string> {
        let uniqueName = name;
        let counter = 1;

        // 检查名称是否已存在
        while (true) {
            const existing = await this.aiAgentService.findOne({ where: { name: uniqueName } });

            if (!existing) {
                // 名称唯一，返回
                if (uniqueName !== name) {
                    this.logger.log(`名称已存在，自动重命名为: ${uniqueName}`);
                }
                return uniqueName;
            }

            // 名称已存在，添加后缀
            uniqueName = `${name} (${counter})`;
            counter++;

            // 防止无限循环
            if (counter > 100) {
                // 超过 100 次，使用时间戳后缀
                uniqueName = `${name} (${Date.now()})`;
                break;
            }
        }

        return uniqueName;
    }
}
