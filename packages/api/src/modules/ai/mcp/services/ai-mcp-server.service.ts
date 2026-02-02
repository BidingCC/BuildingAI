import { McpServerHttp } from "@buildingai/ai-sdk";
import { McpServerSSE } from "@buildingai/ai-sdk";
import { BaseService, PaginationResult } from "@buildingai/base";
import { AI_MCP_IS_QUICK_MENU } from "@buildingai/constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpServer, McpCommunicationType, McpServerType } from "@buildingai/db/entities";
import { AiUserMcpServer } from "@buildingai/db/entities";
import { Like, Not, Repository } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { buildWhere } from "@buildingai/utils";
import { isEnabled } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";

import {
    CreateAiMcpServerDto,
    ImportAiMcpServerDto,
    QueryAiMcpServerDto,
    UpdateAiMcpServerDto,
} from "../dto/ai-mcp-server.dto";
import { AiMcpToolService } from "./ai-mcp-tool.service";

/**
 * MCP服务配置服务
 *
 * 提供MCP服务的增删改查等业务逻辑
 */
@Injectable()
export class AiMcpServerService extends BaseService<AiMcpServer> {
    constructor(
        @InjectRepository(AiMcpServer)
        private readonly aiMcpServerRepository: Repository<AiMcpServer>,
        @InjectRepository(AiUserMcpServer)
        private readonly aiUserMcpServerRepository: Repository<AiUserMcpServer>,
        private readonly aiMcpToolService: AiMcpToolService,
        private readonly dictService: DictService,
    ) {
        super(aiMcpServerRepository);
    }

    /**
     * 创建MCP服务
     *
     * @param createDto 创建MCP服务的DTO
     * @returns 创建的MCP服务实体
     */
    async createMcpServer(createDto: CreateAiMcpServerDto): Promise<AiMcpServer> {
        const existServer = await this.findOne({
            where: { name: createDto.name },
        });

        if (existServer) {
            throw HttpErrorFactory.badRequest(`名为 ${createDto.name} 的MCP服务已存在`);
        }

        const { isQuickMenu, ...rest } = createDto;
        const result = await this.create({
            ...rest,
            type: McpServerType.SYSTEM,
            creatorId: createDto.userId,
        });

        if (isQuickMenu !== undefined && isQuickMenu) {
            await this.dictService.set(AI_MCP_IS_QUICK_MENU, result.id);
        }
        return result;
    }

    /**
     * 更新MCP服务
     *
     * @param id 服务ID
     * @param updateDto 更新MCP服务的DTO
     * @returns 更新后的MCP服务实体
     */
    async updateMcpServer(id: string, updateDto: UpdateAiMcpServerDto): Promise<AiMcpServer> {
        // 检查服务是否存在
        const mcpServer = await this.findOneById(id);

        if (!mcpServer) {
            throw HttpErrorFactory.notFound(`ID为 ${id} 的MCP服务不存在`);
        }

        // 如果更新了名称，检查新名称是否与其他服务冲突
        if (updateDto.name && updateDto.name !== mcpServer.name) {
            const existServer = await this.findOne({
                where: {
                    name: updateDto.name,
                    id: Not(id),
                },
            });

            if (existServer) {
                throw HttpErrorFactory.badRequest(`名为 ${updateDto.name} 的MCP服务已存在`);
            }
        }

        const { isQuickMenu, ...rest } = updateDto;
        const result = await this.updateById(id, rest);
        if (isQuickMenu !== undefined && isQuickMenu) {
            await this.dictService.set(AI_MCP_IS_QUICK_MENU, id);
        }

        if (isQuickMenu === false && (await this.dictService.get(AI_MCP_IS_QUICK_MENU)) === id) {
            await this.dictService.deleteByKey(AI_MCP_IS_QUICK_MENU);
        }

        return result;
    }

    /**
     * 分页查询MCP服务列表
     *
     * @param queryDto 查询条件
     * @returns 分页结果
     */
    async list(queryDto: QueryAiMcpServerDto) {
        const { name, isDisabled } = queryDto;

        // 构建查询条件
        const where = buildWhere<AiMcpServer>({
            type: McpServerType.SYSTEM,
            name: name ? Like(`%${name}%`) : undefined,
            isDisabled: isDisabled === undefined ? undefined : isEnabled(isDisabled),
        });

        const quickMenuId = await this.dictService.get(AI_MCP_IS_QUICK_MENU);

        // 使用基础服务的分页方法
        const result = (await this.paginate(queryDto, {
            where,
            relations: ["tools"],
            order: {
                sortOrder: "ASC",
                createdAt: "DESC",
            },
        })) as PaginationResult<AiMcpServer & { isQuickMenu: boolean; toolsCount: number }>;

        result.items.forEach((item) => {
            item.isQuickMenu = item.id === quickMenuId;
            item.toolsCount = item.tools?.length || 0;
        });

        return result;
    }

    /**
     * Import MCP server configurations from JSON
     *
     * @param importDto Import MCP server DTO
     * @returns Import result
     */
    async importMcpServers(importDto: ImportAiMcpServerDto) {
        const { mcpServers, creatorId } = importDto;
        const results = [];
        const errors = [];
        let createdCount = 0;

        // Iterate through all MCP server configurations
        for (const [name, config] of Object.entries(mcpServers)) {
            try {
                // Use the full URL directly
                const url = config.url;

                // Communication type
                const communicationType = config.type;

                // Check if a server with the same name already exists
                const existServer = await this.findOne({
                    where: { name },
                });

                if (existServer) {
                    // If exists, skip and count as failed
                    errors.push({
                        name,
                        error: `MCP server with name "${name}" already exists`,
                    });
                } else {
                    // If not exists, create new server
                    const created = await this.create({
                        name,
                        communicationType,
                        type: McpServerType.SYSTEM,
                        url,
                        creatorId,
                        headers: config.headers,
                        description: `MCP server imported from JSON: ${name}`,
                        icon: "",
                        sortOrder: 0,
                        isDisabled: false,
                    });
                    // Add status marker
                    results.push({
                        ...created,
                        status: "created",
                    });
                    createdCount++;
                }
            } catch (error) {
                errors.push({
                    name,
                    error: error.message,
                });
            }
        }

        return {
            success: errors.length === 0,
            total: Object.keys(mcpServers).length,
            created: createdCount,
            failed: errors.length,
            results,
            errors,
        };
    }

    /**
     * 删除MCP服务
     *
     * 根据服务类型执行不同的删除逻辑：
     * - 系统服务：直接删除服务及其关联记录
     * - 用户服务：删除服务及其关联记录
     *
     * @param id 服务ID
     * @returns 删除结果
     */
    async deleteMcpServer(id: string): Promise<void> {
        // 检查服务是否存在
        const mcpServer = await this.findOneById(id);
        if (!mcpServer) {
            throw HttpErrorFactory.notFound(`ID为 ${id} 的MCP服务不存在`);
        }

        // 删除用户与该MCP服务的所有关联记录
        await this.aiUserMcpServerRepository.delete({ mcpServerId: id });

        // 删除MCP服务本身
        await this.delete(id);
    }

    /**
     * 检测MCP服务连接状态并更新工具列表
     *
     * @param id MCP服务ID
     * @returns 连接检测结果
     */
    async checkConnectionAndUpdateTools(id: string): Promise<{
        success: boolean;
        connectable: boolean;
        message: string;
        toolsInfo?: {
            created: number;
            updated: number;
            deleted: number;
            total: number;
        };
        error?: string;
    }> {
        // 检查服务是否存在
        const mcpServer = await this.findOneById(id);
        if (!mcpServer) {
            throw HttpErrorFactory.notFound(`ID为 ${id} 的MCP服务不存在`);
        }

        let mcpClient: McpServerSSE | McpServerHttp | null = null;

        let connectable = false;
        let toolsInfo = undefined;
        let errorMessage = "";

        try {
            // 创建MCP客户端实例
            if (mcpServer.communicationType == McpCommunicationType.SSE) {
                mcpClient = new McpServerSSE({
                    url: mcpServer.url,
                    name: mcpServer.name,
                    description: mcpServer.description,
                    headers: mcpServer.headers,
                });
            } else {
                mcpClient = new McpServerHttp({
                    url: mcpServer.url,
                    name: mcpServer.name,
                    description: mcpServer.description,
                    headers: mcpServer.headers,
                });
            }

            // 尝试连接
            await mcpClient.connect();
            connectable = true;

            // 连接成功，获取工具列表
            const tools = await mcpClient.getToolsList();

            // 更新工具列表
            toolsInfo = await this.aiMcpToolService.updateToolsForMcpServer(id, tools);

            console.log(`✅ MCP服务 ${mcpServer.name} 连接成功，更新了 ${toolsInfo.total} 个工具`);
        } catch (error) {
            connectable = false;
            errorMessage = error.message || "连接失败";
            console.error(`❌ MCP服务 ${mcpServer.name} 连接失败:`, error);

            // 连接失败时清空工具列表
            const deletedCount = await this.aiMcpToolService.deleteToolsForMcpServer(id);
            if (deletedCount > 0) {
                console.log(`🗑️  已清空 ${deletedCount} 个失效的工具`);
            }
        } finally {
            // 确保断开连接
            if (mcpClient) {
                try {
                    await mcpClient.disconnect();
                } catch (disconnectError) {
                    console.warn("断开MCP连接时出现警告:", disconnectError);
                }
            }
        }

        // 更新连接状态和错误信息
        await this.updateById(id, {
            connectable,
            connectError: connectable ? "" : errorMessage,
        });

        return {
            success: true,
            connectable,
            message: connectable
                ? `MCP服务连接成功，${toolsInfo ? `更新了 ${toolsInfo.total} 个工具` : "无工具更新"}`
                : `MCP服务连接失败: ${errorMessage}`,
            toolsInfo,
            error: connectable ? undefined : errorMessage,
        };
    }
}
