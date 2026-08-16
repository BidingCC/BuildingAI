import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent } from "@buildingai/db/entities";
import { Not, Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

import { CozeApiService } from "./coze-api.service";

export interface CozeAgentSyncResult {
    agent: Agent;
    status: "skipped" | "success" | "failed";
    errorMessage?: string;
}

/**
 * Coze 智能体信息同步服务。
 */
@Injectable()
export class CozeAgentSyncService {
    private readonly logger = new Logger(CozeAgentSyncService.name);

    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        private readonly cozeApiService: CozeApiService,
    ) {}

    private async shouldSyncName(agent: Agent, name?: string): Promise<boolean> {
        const nextName = name?.trim();
        if (!nextName) return false;

        const existingAgent = await this.agentRepository.findOne({
            where: {
                createBy: agent.createBy,
                name: nextName,
                id: Not(agent.id),
            },
        });

        return !existingAgent;
    }

    /**
     * 规范化并写回 Coze 基础配置。
     */
    normalizeConfig(agent: Agent): Agent {
        const normalized = this.cozeApiService.normalizeConfig(agent.thirdPartyIntegration);
        agent.thirdPartyIntegration = {
            ...normalized,
            extendedConfig: {
                ...(normalized.extendedConfig ?? {}),
                cozeSyncStatus: this.cozeApiService.hasValidConfig(normalized)
                    ? "pending"
                    : "skipped",
            },
        };
        return agent;
    }

    /**
     * 同步 Coze 智能体基础信息到本地 Agent。
     */
    async syncAgentInfo(agentId: string): Promise<CozeAgentSyncResult> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent || agent.createMode !== "coze") {
            return {
                agent: agent as Agent,
                status: "skipped",
            };
        }

        const apiVersion = agent.thirdPartyIntegration?.apiVersion || "v1";

        // 新版 API (stream_run) 暂不支持自动同步智能体信息
        if (apiVersion === "v2") {
            const normalized = this.cozeApiService.normalizeConfig(agent.thirdPartyIntegration);
            const nextIntegration = {
                ...normalized,
                extendedConfig: {
                    ...(normalized.extendedConfig ?? {}),
                    cozeSyncStatus: "skipped_v2",
                    cozeSyncError: "新版 API (stream_run) 暂不支持自动同步智能体信息，请手动配置",
                    cozeSyncedAt: new Date().toISOString(),
                },
            };
            await this.agentRepository.save({
                ...agent,
                thirdPartyIntegration: nextIntegration,
            });
            const latest = await this.agentRepository.findOne({ where: { id: agentId } });
            return {
                agent: latest as Agent,
                status: "skipped",
                errorMessage: "新版 API (stream_run) 暂不支持自动同步智能体信息，请手动配置",
            };
        }

        const normalized = this.cozeApiService.normalizeConfig(agent.thirdPartyIntegration);
        if (!this.cozeApiService.hasValidConfig(normalized)) {
            const nextIntegration = {
                ...normalized,
                extendedConfig: {
                    ...(normalized.extendedConfig ?? {}),
                    cozeSyncStatus: "skipped",
                    cozeSyncError: "Coze Bot ID 或 API Key 未配置完整，已跳过同步",
                },
            };
            await this.agentRepository.save({
                ...agent,
                thirdPartyIntegration: nextIntegration,
            });
            const latest = await this.agentRepository.findOne({ where: { id: agentId } });
            return {
                agent: latest as Agent,
                status: "skipped",
                errorMessage: "Coze Bot ID 或 API Key 未配置完整，已跳过同步",
            };
        }

        try {
            const bot = await this.cozeApiService.getBotInfo(normalized);
            const shouldSyncName = await this.shouldSyncName(agent, bot.name);
            const supportedUploadTypes = ["file", "image", "audio", "video"];
            const nextIntegration = {
                ...normalized,
                extendedConfig: {
                    ...(normalized.extendedConfig ?? {}),
                    botId: this.cozeApiService.resolveBotId(normalized),
                    cozeBotInfo: bot.raw,
                    cozeSyncStatus: "success",
                    cozeSyncError: undefined,
                    cozeSyncedAt: new Date().toISOString(),
                    supportedUploadTypes,
                },
            };

            const payload: Partial<Agent> = {
                thirdPartyIntegration: nextIntegration,
            };

            if (shouldSyncName) payload.name = bot.name;
            if (shouldSyncName) payload.description = bot.description;
            if (bot.iconUrl) payload.avatar = bot.iconUrl;
            if (bot.openingStatement) payload.openingStatement = bot.openingStatement;
            if (bot.openingQuestions.length > 0) payload.openingQuestions = bot.openingQuestions;

            await this.agentRepository.save({
                ...agent,
                ...payload,
            });
            const latest = await this.agentRepository.findOne({ where: { id: agentId } });
            return {
                agent: latest as Agent,
                status: "success",
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(
                `Sync Coze bot info failed: agentId=${agentId}, error=${errorMessage}`,
            );

            const nextIntegration = {
                ...normalized,
                extendedConfig: {
                    ...(normalized.extendedConfig ?? {}),
                    botId: this.cozeApiService.resolveBotId(normalized),
                    cozeSyncStatus: "failed",
                    cozeSyncError: errorMessage,
                    cozeSyncedAt: new Date().toISOString(),
                },
            };
            await this.agentRepository.save({
                ...agent,
                thirdPartyIntegration: nextIntegration,
            });
            const latest = await this.agentRepository.findOne({ where: { id: agentId } });
            return {
                agent: latest as Agent,
                status: "failed",
                errorMessage,
            };
        }
    }
}
