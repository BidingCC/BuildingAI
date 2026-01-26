import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpTool } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

/**
 * MCP工具服务
 *
 * 提供MCP工具的增删改查等业务逻辑
 */
@Injectable()
export class AiMcpToolService extends BaseService<AiMcpTool> {
    constructor(
        @InjectRepository(AiMcpTool)
        private readonly aiMcpToolRepository: Repository<AiMcpTool>,
    ) {
        super(aiMcpToolRepository);
    }

    /**
     * 批量更新MCP服务的工具列表
     *
     * @param mcpServerId MCP服务ID
     * @param tools 工具列表
     * @returns 更新结果
     */
    async updateToolsForMcpServer(
        mcpServerId: string,
        tools: Array<{
            name: string;
            description?: string;
            inputSchema?: Record<string, any>;
        }>,
    ): Promise<{
        created: number;
        updated: number;
        deleted: number;
        total: number;
    }> {
        // 获取当前MCP服务的所有工具
        const existingTools = await this.aiMcpToolRepository.find({
            where: { mcpServerId },
        });

        const existingToolsMap = new Map(existingTools.map((tool) => [tool.name, tool]));
        const newToolNames = new Set(tools.map((tool) => tool.name));

        let created = 0;
        let updated = 0;
        let deleted = 0;

        // 创建或更新工具
        for (const tool of tools) {
            const existingTool = existingToolsMap.get(tool.name);

            if (existingTool) {
                // 更新现有工具
                await this.aiMcpToolRepository.update(existingTool.id, {
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                });
                updated++;
            } else {
                // 创建新工具
                await this.aiMcpToolRepository.save({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                    mcpServerId,
                });
                created++;
            }
        }

        // 删除不再存在的工具
        for (const existingTool of existingTools) {
            if (!newToolNames.has(existingTool.name)) {
                await this.aiMcpToolRepository.delete(existingTool.id);
                deleted++;
            }
        }

        return {
            created,
            updated,
            deleted,
            total: tools.length,
        };
    }

    /**
     * 删除MCP服务的所有工具
     *
     * @param mcpServerId MCP服务ID
     * @returns 删除的工具数量
     */
    async deleteToolsForMcpServer(mcpServerId: string): Promise<number> {
        const result = await this.aiMcpToolRepository.delete({ mcpServerId });
        return result.affected || 0;
    }

    /**
     * 获取MCP服务的工具列表
     *
     * @param mcpServerId MCP服务ID
     * @returns 工具列表
     */
    async getToolsForMcpServer(mcpServerId: string): Promise<AiMcpTool[]> {
        return await this.aiMcpToolRepository.find({
            where: { mcpServerId },
            order: { name: "ASC" },
        });
    }
}
