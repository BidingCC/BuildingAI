import { BaseService } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent } from "@buildingai/db/entities";
import { AgentChatMessage } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import { AgentChatDto } from "../dto/agent";
import { AiAgentService } from "./ai-agent.service";

/**
 * 公开访问智能体聊天服务
 * 处理无需认证的智能体对话功能
 */
@Injectable()
export class AiAgentPublicChatService {
    private readonly logger = new Logger(AiAgentPublicChatService.name);
    private readonly chatRecordService: BaseService<AgentChatRecord>;
    private readonly ChatsMessageService: BaseService<AgentChatMessage>;

    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(AgentChatRecord)
        private readonly chatRecordRepository: Repository<AgentChatRecord>,
        @InjectRepository(AgentChatMessage)
        private readonly chatMessageRepository: Repository<AgentChatMessage>,
        private readonly AiAgentService: AiAgentService,
    ) {
        this.chatRecordService = new BaseService<AgentChatRecord>(chatRecordRepository);
        this.ChatsMessageService = new BaseService<AgentChatMessage>(chatMessageRepository);
    }

    /**
     * 生成访问令牌
     * @param publishToken 发布令牌
     */
    async generateAccessToken(publishToken: string) {
        const agent = await this.getAgentByPublishToken(publishToken);

        const crypto = require("crypto");
        const accessToken = crypto.randomBytes(32).toString("hex");

        this.logger.log(`[+] 生成访问令牌: ${agent.id} - ${accessToken.substring(0, 8)}...`);

        return {
            accessToken,
            agentId: agent.id,
            agentName: agent.name,
            description: "访问令牌永不过期，请妥善保管",
        };
    }

    /**
     * API认证方式获取对话记录列表
     * @param apiKey API密钥
     * @param query 分页查询参数
     */
    async getConversationsByApiKey(apiKey: string, query: PaginationDto) {
        if (!apiKey) {
            throw HttpErrorFactory.unauthorized("API密钥不能为空");
        }

        const agent = await this.AiAgentService.getAgentByApiKey(apiKey);
        const anonymousIdentifier = this.generateApiKeyIdentifier(apiKey);

        const options = {
            where: { agentId: agent.id, anonymousIdentifier, isDeleted: false },
            order: { updatedAt: "DESC" as const, createdAt: "DESC" as const },
        };

        return await this.chatRecordService.paginate(query, options);
    }

    /**
     * API认证方式获取对话消息
     * @param apiKey API密钥
     * @param conversationId 对话记录ID
     * @param query 分页查询参数
     */
    async getMessagesByApiKey(apiKey: string, conversationId: string, query: PaginationDto) {
        if (!apiKey) {
            throw HttpErrorFactory.unauthorized("API密钥不能为空");
        }

        const agent = await this.AiAgentService.getAgentByApiKey(apiKey);
        const anonymousIdentifier = this.generateApiKeyIdentifier(apiKey);

        // 先验证该对话记录是否属于该API Key
        const chatRecord = await this.chatRecordRepository.findOne({
            where: {
                id: conversationId,
                agentId: agent.id,
                anonymousIdentifier,
                isDeleted: false,
            },
        });

        if (!chatRecord) {
            throw HttpErrorFactory.notFound("对话记录不存在或无权访问");
        }

        const messageOptions = {
            where: { conversationId, agentId: agent.id, anonymousIdentifier },
            order: { createdAt: "ASC" as const },
        };

        return await this.ChatsMessageService.paginate(query, messageOptions);
    }

    /**
     * API认证方式删除对话记录
     * @param apiKey API密钥
     * @param conversationId 对话记录ID
     */
    async deleteConversationByApiKey(apiKey: string, conversationId: string) {
        if (!apiKey) {
            throw HttpErrorFactory.unauthorized("API密钥不能为空");
        }

        const agent = await this.AiAgentService.getAgentByApiKey(apiKey);
        const anonymousIdentifier = this.generateApiKeyIdentifier(apiKey);

        // 验证对话记录是否属于该API Key
        const chatRecord = await this.chatRecordRepository.findOne({
            where: {
                id: conversationId,
                agentId: agent.id,
                anonymousIdentifier,
                isDeleted: false,
            },
        });

        if (!chatRecord) {
            throw HttpErrorFactory.notFound("对话记录不存在或无权访问");
        }

        // 软删除对话记录
        await this.chatRecordRepository.update(conversationId, {
            isDeleted: true,
        });
        // 删除对话消息
        await this.chatMessageRepository.delete({
            conversationId,
            anonymousIdentifier,
        });

        this.logger.log(`[+] API删除对话记录: ${agent.id} - ${conversationId}`);
        return { message: "对话记录删除成功" };
    }

    /**
     * API认证方式更新对话记录
     * @param apiKey API密钥
     * @param conversationId 对话记录ID
     * @param updateData 更新数据
     */
    async updateConversationByApiKey(
        apiKey: string,
        conversationId: string,
        updateData: { title?: string },
    ) {
        if (!apiKey) {
            throw HttpErrorFactory.unauthorized("API密钥不能为空");
        }

        const agent = await this.AiAgentService.getAgentByApiKey(apiKey);
        const anonymousIdentifier = this.generateApiKeyIdentifier(apiKey);

        // 验证对话记录是否属于该API Key
        const chatRecord = await this.chatRecordRepository.findOne({
            where: {
                id: conversationId,
                agentId: agent.id,
                anonymousIdentifier,
                isDeleted: false,
            },
        });

        if (!chatRecord) {
            throw HttpErrorFactory.notFound("对话记录不存在或无权访问");
        }

        // 更新对话记录
        if (updateData.title !== undefined) {
            await this.chatRecordRepository.update(conversationId, {
                title: updateData.title,
            });
        }

        this.logger.log(
            `[+] API更新对话记录: ${agent.id} - ${conversationId} - 标题: ${updateData.title}`,
        );
        return { message: "对话记录更新成功" };
    }

    /**
     * 获取公开智能体对话记录列表
     * @param publishToken 发布令牌
     * @param accessToken 访问令牌
     * @param query 分页查询参数
     * @param loggedInUser 可选的登录用户信息
     */
    async getConversationsByAccessToken(
        publishToken: string,
        accessToken: string,
        query: { page?: number; pageSize?: number },
        loggedInUser?: UserPlayground,
    ) {
        const agent = await this.getAgentByPublishToken(publishToken);
        const whereConditions = this.buildConversationWhereConditions(
            agent.id,
            accessToken,
            loggedInUser,
        );

        const options = {
            where: whereConditions,
            order: { updatedAt: "DESC" as const, createdAt: "DESC" as const },
        };

        return await this.chatRecordService.paginate(query, options);
    }

    /**
     * 获取公开智能体对话消息
     * @param publishToken 发布令牌
     * @param conversationId 对话记录ID
     * @param query 分页查询参数
     */
    async getMessagesByAccessToken(
        publishToken: string,
        conversationId: string,
        query: PaginationDto,
    ) {
        const agent = await this.getAgentByPublishToken(publishToken);
        const messageOptions = {
            where: { conversationId, agentId: agent.id },
            order: { createdAt: "ASC" as const },
        };

        return await this.ChatsMessageService.paginate(query, messageOptions);
    }

    /**
     * 删除公开智能体对话记录
     * @param publishToken 发布令牌
     * @param accessToken 访问令牌
     * @param conversationId 对话记录ID
     * @param loggedInUser 可选的登录用户信息
     */
    async deleteConversationByAccessToken(
        publishToken: string,
        accessToken: string,
        conversationId: string,
        loggedInUser?: UserPlayground,
    ) {
        const agent = await this.getAgentByPublishToken(publishToken);
        await this.validateConversationAccess(agent.id, conversationId, accessToken, loggedInUser);

        // 软删除对话记录
        await this.chatRecordRepository.update(conversationId, {
            isDeleted: true,
        });
        // 删除对话消息
        await this.chatMessageRepository.delete({ conversationId });

        return { message: "对话记录删除成功" };
    }

    /**
     * 更新公开智能体对话记录
     * @param publishToken 发布令牌
     * @param accessToken 访问令牌
     * @param conversationId 对话记录ID
     * @param updateData 更新数据
     * @param loggedInUser 可选的登录用户信息
     */
    async updateConversationByAccessToken(
        publishToken: string,
        accessToken: string,
        conversationId: string,
        updateData: { title?: string },
        loggedInUser?: UserPlayground,
    ) {
        const agent = await this.getAgentByPublishToken(publishToken);
        await this.validateConversationAccess(agent.id, conversationId, accessToken, loggedInUser);

        // 更新对话记录
        if (updateData.title !== undefined) {
            await this.chatRecordRepository.update(conversationId, {
                title: updateData.title,
            });
        }

        return { message: "对话记录更新成功" };
    }

    /**
     * 从访问令牌生成用户ID
     * @param accessToken 访问令牌
     * @returns 生成的用户ID
     */
    private generateUserIdFromAccessToken(accessToken: string): string {
        const crypto = require("crypto");
        const hash = crypto.createHash("sha256").update(accessToken).digest("hex");

        // 从哈希中提取UUID格式的字符串
        const uuid = [
            hash.substring(0, 8),
            hash.substring(8, 12),
            "4" + hash.substring(13, 16),
            "8" + hash.substring(17, 20),
            hash.substring(20, 32),
        ].join("-");

        return uuid;
    }

    /**
     * 创建基于访问令牌的匿名用户上下文
     * @param accessToken 访问令牌
     * @returns 匿名用户对象
     */
    private createAnonymousUserWithAccessToken(accessToken: string): UserPlayground {
        const anonymousIdentifier = this.generateUserIdFromAccessToken(accessToken);

        return {
            id: anonymousIdentifier,
            username: `access_${accessToken.substring(0, 8)}`,
            isRoot: 0,
            role: {} as any,
            permissions: [],
        };
    }

    /**
     * 转换公开DTO为内部DTO
     */
    public convertToAgentChatDto(dto: AgentChatDto, agent: Agent): AgentChatDto {
        const userFormFieldsInputs = dto.formFieldsInputs;

        const result = Object.assign(dto, agent);

        if (userFormFieldsInputs && Object.keys(userFormFieldsInputs).length > 0) {
            result.formFieldsInputs = userFormFieldsInputs;
        }

        return result;
    }

    /**
     * 通过发布令牌获取完整智能体信息
     */
    public async getAgentByPublishToken(publishToken: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { publishToken, isPublished: true },
        });

        if (!agent) {
            throw HttpErrorFactory.notFound("智能体不存在或未发布");
        }

        return agent;
    }

    /**
     * 检查频率限制
     */
    public async checkRateLimit(agent: Agent): Promise<void> {
        const rateLimitPerMinute = agent.publishConfig?.rateLimitPerMinute;

        if (!rateLimitPerMinute || rateLimitPerMinute <= 0) {
            return; // 未设置限制
        }

        // TODO: 实现基于Redis的频率限制
        this.logger.debug(
            `[频率限制] 智能体 ${agent.id} 设置了 ${rateLimitPerMinute} 次/分钟的限制`,
        );
    }

    /**
     * 为API Key生成固定的匿名标识符
     * 用于区分不同API Key的对话记录
     */
    private generateApiKeyIdentifier(apiKey: string): string {
        return `api_${apiKey}`;
    }

    /**
     * 创建基于API Key的匿名用户上下文
     */
    public createApiKeyUser(apiKey: string): UserPlayground {
        const anonymousIdentifier = this.generateApiKeyIdentifier(apiKey);

        return {
            id: anonymousIdentifier,
            username: `anonymous_api_${apiKey.substring(3, 11)}`,
            isRoot: 0,
            role: {} as any,
            permissions: [],
        };
    }

    // ==================== 辅助方法 ====================

    /**
     * 创建增强的用户对象
     */
    public createEnhancedUser(accessToken: string, loggedInUser?: UserPlayground): UserPlayground {
        const anonymousIdentifier = this.generateUserIdFromAccessToken(accessToken);
        return loggedInUser
            ? ({ ...loggedInUser, anonymousIdentifier } as UserPlayground)
            : this.createAnonymousUserWithAccessToken(accessToken);
    }

    /**
     * 构建对话查询条件
     */
    private buildConversationWhereConditions(
        agentId: string,
        accessToken: string,
        loggedInUser?: UserPlayground,
        conversationId?: string,
    ) {
        const anonymousIdentifier = this.generateUserIdFromAccessToken(accessToken);
        const baseCondition = { agentId, isDeleted: false };
        const whereConditions = [];

        if (conversationId) {
            Object.assign(baseCondition, { id: conversationId });
        }

        if (loggedInUser) {
            whereConditions.push(
                { ...baseCondition, userId: loggedInUser.id },
                { ...baseCondition, anonymousIdentifier },
            );
        } else {
            whereConditions.push({ ...baseCondition, anonymousIdentifier });
        }

        return whereConditions;
    }

    /**
     * 验证对话访问权限
     */
    private async validateConversationAccess(
        agentId: string,
        conversationId: string,
        accessToken: string,
        loggedInUser?: UserPlayground,
    ) {
        const whereConditions = this.buildConversationWhereConditions(
            agentId,
            accessToken,
            loggedInUser,
            conversationId,
        );
        const chatRecord = await this.chatRecordRepository.findOne({
            where: whereConditions,
        });

        if (!chatRecord) {
            throw HttpErrorFactory.notFound("对话记录不存在或无权访问");
        }

        return chatRecord;
    }
}
