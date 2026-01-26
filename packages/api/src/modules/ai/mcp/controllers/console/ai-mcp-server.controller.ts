import { BaseController } from "@buildingai/base";
import { AI_MCP_IS_QUICK_MENU } from "@buildingai/constants";
import { type UserPlayground } from "@buildingai/db";
import { AiMcpServer, McpCommunicationType } from "@buildingai/db/entities";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import Ajv from "ajv";

import {
    BatchCheckMcpConnectionDto,
    BatchDeleteAiMcpServerDto,
    CreateAiMcpServerDto,
    ImportAiMcpServerDto,
    ImportAiMcpServerJsonDto,
    QueryAiMcpServerDto,
    UpdateAiMcpServerDto,
} from "../../dto/ai-mcp-server.dto";
import { AiMcpServerService } from "../../services/ai-mcp-server.service";
import { AiMcpToolService } from "../../services/ai-mcp-tool.service";

/**
 * MCP服务配置后台管理控制器
 *
 * 提供MCP服务的完整管理功能
 */
@ConsoleController("ai-mcp-servers", "MCP服务配置")
export class AiMcpServerConsoleController extends BaseController {
    constructor(
        private readonly aiMcpServerService: AiMcpServerService,
        private readonly aiMcpToolService: AiMcpToolService,
        private readonly dictService: DictService,
    ) {
        super();
    }

    /**
     * 分页查询MCP服务列表
     */
    @Get()
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "list",
        name: "查询MCP服务列表",
    })
    async findAll(@Query() queryDto: QueryAiMcpServerDto) {
        return await this.aiMcpServerService.list(queryDto);
    }

    /**
     * 获取默认快捷菜单
     */
    @Get("quick-menu")
    @Permissions({
        code: "quick-menu-get",
        name: "获取默认快捷菜单",
    })
    async getDefaultModel() {
        const id = await this.dictService.get(AI_MCP_IS_QUICK_MENU);

        if (id) {
            const mcpServer = await this.aiMcpServerService.findOneById(id);
            if (mcpServer && !mcpServer.isDisabled) {
                return mcpServer;
            }
        }

        return null;
    }

    /**
     * 根据ID查询MCP服务详情
     */
    @Get(":id")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "detail",
        name: "查询MCP服务详情",
    })
    async findOne(@Param("id") id: string) {
        const mcpServer = (await this.aiMcpServerService.findOneById(id)) as AiMcpServer & {
            isQuickMenu: boolean;
        };

        if (!mcpServer) {
            throw HttpErrorFactory.notFound(`ID为 ${id} 的MCP服务不存在`);
        }

        mcpServer.isQuickMenu = mcpServer.id === (await this.dictService.get(AI_MCP_IS_QUICK_MENU));

        // 手动查询关联的工具列表
        const tools = await this.aiMcpToolService.findAll({
            where: { mcpServerId: id },
            order: { createdAt: "ASC" },
        });

        return {
            ...mcpServer,
            tools,
        };
    }

    /**
     * 创建MCP服务
     */
    @Post()
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "create",
        name: "创建MCP服务",
    })
    async create(@Body() createDto: CreateAiMcpServerDto, @Playground() user: UserPlayground) {
        // 如果没有指定用户ID，则使用当前用户ID
        if (!createDto.userId) {
            createDto.userId = user.id;
        }
        return await this.aiMcpServerService.createMcpServer(createDto);
    }

    /**
     * 更新MCP服务
     */
    @Put(":id")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "update",
        name: "更新MCP服务",
    })
    async update(@Param("id") id: string, @Body() updateDto: UpdateAiMcpServerDto) {
        return await this.aiMcpServerService.updateMcpServer(id, updateDto);
    }

    /**
     * 删除MCP服务
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除MCP服务",
    })
    async remove(@Param("id") id: string) {
        // 检查是否是默认模型
        const defaultModelId = await this.dictService.get(AI_MCP_IS_QUICK_MENU);
        if (defaultModelId === id) {
            await this.dictService.deleteByKey(AI_MCP_IS_QUICK_MENU);
        }
        await this.aiMcpServerService.deleteMcpServer(id);
        return null;
    }

    /**
     * 批量删除MCP服务
     */
    @Post("batch-delete")
    @Permissions({
        code: "batch-delete",
        name: "批量删除MCP服务",
    })
    async batchRemove(@Body() batchDeleteDto: BatchDeleteAiMcpServerDto) {
        await this.aiMcpServerService.deleteMany(batchDeleteDto.ids);
        const defaultModelId = await this.dictService.get(AI_MCP_IS_QUICK_MENU);

        if (defaultModelId && batchDeleteDto.ids.includes(defaultModelId)) {
            await this.dictService.deleteByKey(AI_MCP_IS_QUICK_MENU);
        }
        return null;
    }

    /**
     * 切换MCP服务启用状态
     */
    @Put(":id/toggle-active")
    @Permissions({
        code: "toggle-active",
        name: "切换MCP服务启用状态",
    })
    async toggleActive(@Param("id") id: string, @Body() body: { isDisabled: boolean }) {
        const server = await this.aiMcpServerService.updateById(id, {
            isDisabled: body.isDisabled,
        });
        return {
            message: body.isDisabled ? "MCP服务已禁用" : "MCP服务已启用",
            server,
        };
    }

    /**
     * 设置默认快捷菜单
     */
    @Post("quick-menu/:id")
    @Permissions({
        code: "quick-menu-set",
        name: "设置默认快捷菜单",
    })
    async setDefault(@Param("id") id: string) {
        await this.dictService.set(AI_MCP_IS_QUICK_MENU, id);
        return { message: "quick menu set successfully" };
    }

    /**
     * 检测MCP服务连接状态并更新工具列表
     */
    @Post(":id/check-connection")
    @Permissions({
        code: "check-connection",
        name: "检测MCP服务连接",
    })
    async checkConnection(@Param("id") id: string) {
        return await this.aiMcpServerService.checkConnectionAndUpdateTools(id);
    }

    /**
     * 批量检测多个MCP服务的连接状态并更新工具列表
     *
     * @param batchCheckDto 包含MCP服务ID列表的DTO
     * @returns 每个MCP服务的连接检测结果
     */
    @Post("batch-check-connection")
    @Permissions({
        code: "batch-check-connection",
        name: "批量检测MCP服务连接",
    })
    async batchCheckConnection(@Body() batchCheckDto: BatchCheckMcpConnectionDto) {
        const results = [];
        const { mcpServerIds } = batchCheckDto;

        // 循环检测每个MCP服务的连接状态
        for (const mcpServerId of mcpServerIds) {
            try {
                const result =
                    await this.aiMcpServerService.checkConnectionAndUpdateTools(mcpServerId);
                results.push({
                    mcpServerId,
                    ...result,
                });
            } catch (error) {
                // 如果某个服务检测失败，记录错误但继续检测其他服务
                results.push({
                    mcpServerId,
                    success: false,
                    connectable: false,
                    message: `检测失败: ${error.message}`,
                    error: error.message,
                });
            }
        }

        // 统计批量检测结果
        const summary = {
            total: mcpServerIds.length,
            success: results.filter((r) => r.success && r.connectable).length,
            failed: results.filter((r) => !r.success || !r.connectable).length,
            errors: results.filter((r) => !r.success).length,
        };

        return {
            summary,
            results,
            message: `批量检测完成，共检测 ${summary.total} 个服务，成功 ${summary.success} 个，失败 ${summary.failed} 个`,
        };
    }

    /**
     * 从JSON字符串导入MCP服务配置
     * ```
     */
    @Post("import-json-string")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "import",
        name: "导入MCP服务",
    })
    async importFromJsonString(
        @Body() importJsonDto: ImportAiMcpServerJsonDto,
        @Playground() user: UserPlayground,
    ) {
        try {
            // 创建 Ajv 实例
            const ajv = new Ajv({
                allErrors: true, // 收集所有错误而不是在第一个错误时停止
                verbose: true, // 在错误中包含更多信息
            });

            // 定义 MCP 服务配置的 JSON Schema
            const mcpServerUrlConfigSchema = {
                type: "object",
                properties: {
                    url: { type: "string", minLength: 1 },
                    type: {
                        type: "string",
                        enum: Object.values(McpCommunicationType),
                    },
                    headers: {
                        type: "object",
                        patternProperties: {
                            "^.*$": { type: "string" },
                        },
                        additionalProperties: false,
                    },
                    customHeaders: {
                        type: "object",
                        patternProperties: {
                            "^.*$": { type: "string" },
                        },
                        additionalProperties: false,
                    },
                },
                required: ["url", "type"],
                additionalProperties: false,
            };

            // 定义导入数据的 JSON Schema
            const importSchema = {
                type: "object",
                properties: {
                    mcpServers: {
                        type: "object",
                        patternProperties: {
                            "^.*$": mcpServerUrlConfigSchema,
                        },
                        minProperties: 1,
                        additionalProperties: false,
                    },
                },
                required: ["mcpServers"],
                additionalProperties: false,
            };

            // 编译 Schema
            const validate = ajv.compile(importSchema);

            // 解析 JSON 字符串
            let parsedData;
            try {
                parsedData = JSON.parse(importJsonDto.jsonString);
                if (parsedData.mcpServers) {
                    for (const key in parsedData.mcpServers) {
                        const server = parsedData.mcpServers[key];
                        if (server.headers) {
                            server.customHeaders = server.headers;
                            delete server.headers;
                        }
                    }
                }
            } catch (parseError) {
                throw HttpErrorFactory.badRequest(
                    "JSON格式不正确，无法解析：" + parseError.message,
                );
            }

            // 验证解析后的数据
            const valid = validate(parsedData);
            if (!valid) {
                // 格式化验证错误信息
                const errorMessages = validate.errors
                    ?.map((err) => {
                        const path = err.instancePath || "";
                        const property =
                            err.params.missingProperty || err.params.additionalProperty || "";
                        const fullPath = path + (property ? `/${property}` : "");
                        return `${fullPath.replace(/^\//, "")}: ${err.message}`;
                    })
                    .join("; ");

                throw HttpErrorFactory.badRequest(
                    `JSON格式验证失败: ${errorMessages || "未知错误"}`,
                );
            }

            // 创建导入DTO
            const importDto: ImportAiMcpServerDto = {
                mcpServers: parsedData.mcpServers,
                creatorId: user.id,
            };

            return await this.aiMcpServerService.importMcpServers(importDto);
        } catch (error) {
            // 如果是已经处理过的 HTTP 异常，直接抛出
            if (error.status) {
                throw error;
            }
            // 其他未处理的错误
            throw HttpErrorFactory.badRequest(`导入失败: ${error.message}`);
        }
    }
}
