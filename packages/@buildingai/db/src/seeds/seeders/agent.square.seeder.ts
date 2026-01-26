import type {
    AutoQuestionsConfig,
    FormFieldConfig,
    ModelBillingConfig,
    ModelConfig,
    QuickCommandConfig,
    ThirdPartyIntegrationConfig,
} from "@buildingai/types/ai/agent-config.interface";
import { randomBytes } from "crypto";

import { DataSource } from "../../typeorm";
import { Agent } from "./../../entities/ai-agent.entity";
import { BaseSeeder } from "./base.seeder";

/**
 * 智能体广场配置结构
 */
interface AgentConfig {
    /** 智能体名称 */
    name: string;
    /** 智能体描述 */
    description?: string;
    /** 创建模式（默认 direct） */
    createMode?: string;
    /** 智能体头像 */
    avatar?: string;
    /** 对话头像 */
    chatAvatar?: string;
    /** 角色设定 */
    rolePrompt?: string;
    /** 开场白 */
    openingStatement?: string;
    /** 开场问题 */
    openingQuestions?: string[];
    /** 是否显示上下文 */
    showContext?: boolean;
    /** 是否显示引用 */
    showReference?: boolean;
    /** 是否允许反馈 */
    enableFeedback?: boolean;
    /** 是否开启联网搜索 */
    enableWebSearch?: boolean;
    /** 模型配置 */
    modelConfig?: ModelConfig;
    /** 计费配置 */
    billingConfig?: ModelBillingConfig;
    /** 关联知识库ID列表 */
    datasetIds?: string[];
    /** MCP服务器ID列表 */
    mcpServerIds?: string[];
    /** 快捷指令 */
    quickCommands?: QuickCommandConfig[];
    /** 自动追问配置 */
    autoQuestions?: AutoQuestionsConfig;
    /** 表单字段配置 */
    formFields?: FormFieldConfig[];
    /** 表单字段输入值 */
    formFieldsInputs?: Record<string, any>;
    /** 第三方集成配置 */
    thirdPartyIntegration?: ThirdPartyIntegrationConfig;
    /** 发布配置 */
    publishConfig?: Agent["publishConfig"];
    /** 是否公开 */
    isPublic?: boolean;
    /** 是否已发布 */
    isPublished?: boolean;
    /** 公开访问令牌（可选，若未提供将自动生成） */
    publishToken?: string;
    /** API 调用密钥（可选，若未提供将自动生成） */
    apiKey?: string;
}

/**
 * 智能体广场 Seeder
 *
+ * 从配置文件初始化智能体广场数据
 */
export class AgentSquareSeeder extends BaseSeeder {
    readonly name = "AgentSquareSeeder";
    readonly priority = 90;

    /**
     * 执行智能体广场数据种子
     *
     * @param dataSource TypeORM 数据源
     */
    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(Agent);

        try {
            const agentConfigs = await this.loadConfig<AgentConfig[]>("agent.json");

            if (!Array.isArray(agentConfigs)) {
                throw new Error("Invalid agent.json format, expected an array");
            }

            this.logInfo(`Loaded ${agentConfigs.length} agent configurations from file`);

            let createdCount = 0;
            let updatedCount = 0;

            for (const config of agentConfigs) {
                if (!config?.name) {
                    this.logWarn("Skipped agent config without name");
                    continue;
                }

                // 查找同名智能体
                let agent = await repository.findOne({
                    where: { name: config.name },
                });

                // 构建持久化数据
                const agentData: Partial<Agent> = {
                    name: config.name,
                    description: config.description ?? "",
                    createMode: config.createMode ?? "direct",
                    avatar: config.avatar,
                    chatAvatar: config.chatAvatar,
                    rolePrompt: config.rolePrompt,
                    openingStatement: config.openingStatement,
                    openingQuestions: config.openingQuestions ?? [],
                    showContext: config.showContext ?? true,
                    showReference: config.showReference ?? true,
                    enableFeedback: config.enableFeedback ?? false,
                    enableWebSearch: config.enableWebSearch ?? false,
                    modelConfig: config.modelConfig,
                    billingConfig: config.billingConfig ?? { price: 0 },
                    datasetIds: config.datasetIds ?? [],
                    mcpServerIds: config.mcpServerIds ?? [],
                    quickCommands: config.quickCommands ?? [],
                    autoQuestions: config.autoQuestions,
                    formFields: config.formFields ?? [],
                    formFieldsInputs: config.formFieldsInputs ?? {},
                    thirdPartyIntegration: config.thirdPartyIntegration,
                    publishConfig: config.publishConfig,
                    isPublic: config.isPublic ?? false,
                    isPublished: config.isPublished ?? false,
                };

                if (agentData.isPublished) {
                    agentData.publishToken =
                        agent?.publishToken ?? config.publishToken ?? this.generateToken("pub");
                    agentData.apiKey = agent?.apiKey ?? config.apiKey ?? this.generateToken("ak");
                }

                if (!agent) {
                    agent = repository.create(agentData);
                    await repository.save(agent);
                    this.logInfo(`Created agent: ${agent.name}`);
                    createdCount++;
                } else {
                    await repository.update(agent.id, agentData);
                    this.logInfo(`Updated agent: ${agent.name}`);
                    updatedCount++;
                }
            }

            this.logSuccess(
                `Agent square initialized: created ${createdCount}, updated ${updatedCount}`,
            );
        } catch (error) {
            this.logError(`Agent square initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * 生成唯一令牌
     *
     * @param prefix 令牌前缀
     * @returns 带前缀的唯一令牌
     */
    private generateToken(prefix = ""): string {
        const token = randomBytes(16).toString("hex");
        return prefix ? `${prefix}_${token}` : token;
    }
}
