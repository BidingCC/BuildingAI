import { AI_MCP_IS_QUICK_MENU } from "@buildingai/constants";
import { type UserPlayground } from "@buildingai/db";
import { McpCommunicationType, McpServerType } from "@buildingai/db/entities";
import { AiMcpServer } from "@buildingai/db/entities";
import { Like } from "@buildingai/db/typeorm";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { buildWhere } from "@buildingai/utils";
import { isEnabled } from "@buildingai/utils";
import { WebController } from "@common/decorators/controller.decorator";
import {
    BatchCheckMcpConnectionDto,
    CreateWebAiMcpServerDto,
    ImportWebAiMcpServerDto,
    ImportWebAiMcpServerJsonDto,
    QueryAiMcpServerDto,
    ToggleAiMcpServerStatusDto,
    UpdateWebAiMcpServerDto,
} from "@modules/ai/mcp/dto/web/ai-mcp-server.dto";
import { WebAiMcpServerWebService } from "@modules/ai/mcp/services/web/ai-mcp-server.service";
import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import Ajv from "ajv";

/**
 * MCP服务前台控制器
 *
 * 提供用户管理自己的MCP服务的接口
 */
@WebController("ai-mcp-servers")
export class WebAiMcpServerWebController {
    constructor(
        private readonly webAiMcpServerService: WebAiMcpServerWebService,
        private readonly dictService: DictService,
    ) {}

    /**
     * 获取当前用户的MCP服务列表
     *
     * @param user 当前用户信息
     * @param queryDto 查询参数，包含分页信息
     * @param name 服务名称（模糊搜索）
     * @param isShow 是否显示
     */
    @Get()
    @BuildFileUrl(["**.icon"])
    async list(@Playground() user: UserPlayground, @Query() queryDto: QueryAiMcpServerDto) {
        const { isDisabled, type = McpServerType.SYSTEM, name } = queryDto;
        const whereBase = buildWhere<AiMcpServer>({
            creatorId: type === McpServerType.USER ? user.id : undefined,
            isDisabled: isDisabled !== undefined ? isEnabled(isDisabled) : undefined,
            type: type,
        });

        const where = [
            buildWhere<AiMcpServer>({
                ...whereBase,
                name: name ? Like(`%${name}%`) : undefined,
            }),
            buildWhere<AiMcpServer>({
                ...whereBase,
                alias: name ? Like(`%${name}%`) : undefined,
            }),
        ];

        const result = await this.webAiMcpServerService.paginate(queryDto, {
            where,
            relations: ["userMcpServer"],
        });

        result.items.forEach((item: AiMcpServer) => {
            if (item.userMcpServer?.length > 0) {
                item.isDisabled = item.userMcpServer[0].isDisabled;
            }
            // 只有用户类型的服务才返回真实的url，系统类型的服务url设置为null
            if (item.type !== McpServerType.USER) {
                item.url = null;
            }
        });

        return result;
    }

    /**
     * 获取当前用户的MCP服务列表
     *
     * @param user 当前用户信息
     * @param queryDto 查询参数，包含分页信息
     * @param name 服务名称（模糊搜索）
     * @param isShow 是否显示
     */
    @Get("all")
    @BuildFileUrl(["**.icon"])
    async all(@Playground() user: UserPlayground) {
        const where = buildWhere<AiMcpServer>({
            isDisabled: false,
        });

        const result = await this.webAiMcpServerService.findAll({
            where,
            relations: ["userMcpServer", "tools"],
        });
        const isQuickMenuId = await this.dictService.get(AI_MCP_IS_QUICK_MENU);

        if (user) {
            const filtered = result.filter((item) => {
                return !(
                    (item.type === McpServerType.USER && item.creatorId !== user.id) ||
                    item.id === isQuickMenuId
                );
            });

            // 只有用户类型的服务才返回真实的url，系统类型的服务url设置为null
            filtered.forEach((item) => {
                if (item.type !== McpServerType.USER) {
                    item.url = null;
                }
            });

            return filtered;
        } else {
            const filtered = result.filter((item) => {
                return item.type === McpServerType.SYSTEM && item.id !== isQuickMenuId;
            });

            // 只有用户类型的服务才返回真实的url，系统类型的服务url设置为null
            filtered.forEach((item) => {
                if (item.type !== McpServerType.USER) {
                    item.url = null;
                }
            });

            return filtered;
        }
    }

    /**
     * 获取默认快捷菜单
     */
    @Get("quick-menu")
    @BuildFileUrl(["**.icon"])
    @Public()
    async getDefaultModel() {
        const id = await this.dictService.get(AI_MCP_IS_QUICK_MENU);

        if (id) {
            const mcpServer = await this.webAiMcpServerService.findOneById(id);
            if (mcpServer && !mcpServer.isDisabled) {
                // 只有用户类型的服务才返回真实的url，系统类型的服务url设置为null
                if (mcpServer.type !== McpServerType.USER) {
                    mcpServer.url = null;
                }
                return mcpServer;
            }
        }

        return null;
    }

    /**
     * 获取单个MCP服务详情
     */
    @Get(":id")
    @BuildFileUrl(["**.icon"])
    async findOne(@Param("id") id: string, @Playground() user: UserPlayground) {
        const result = await this.webAiMcpServerService.findOneById(id, {
            relations: ["tools"],
        });

        if (result.type === McpServerType.USER) {
            if (result.creatorId !== user.id) {
                throw HttpErrorFactory.notFound("MCP服务不存在");
            }
        }

        // 只有用户类型的服务才返回真实的url，系统类型的服务url设置为null
        if (result.type !== McpServerType.USER) {
            result.url = null;
        }

        return result;
    }

    /**
     * 创建新的MCP服务
     */
    @Post()
    @BuildFileUrl(["**.icon"])
    async create(@Body() createDto: CreateWebAiMcpServerDto, @Playground() user: UserPlayground) {
        const result = await this.webAiMcpServerService.createMcpServer(createDto, user.id);

        // 只有用户类型的服务才返回真实的url，系统类型的服务url设置为null
        if (result.type !== McpServerType.USER) {
            result.url = null;
        }

        return result;
    }

    /**
     * 更新MCP服务
     */
    @Put(":id")
    @BuildFileUrl(["**.icon"])
    async update(
        @Param("id") id: string,
        @Body() updateDto: UpdateWebAiMcpServerDto,
        @Playground() user: UserPlayground,
    ) {
        const result = await this.webAiMcpServerService.updateMcpServer(id, updateDto, user.id);

        // 只有用户类型的服务才返回真实的url，系统类型的服务url设置为null
        if (result.type !== McpServerType.USER) {
            result.url = null;
        }

        return result;
    }

    /**
     * 删除MCP服务
     */
    @Delete(":id")
    async remove(@Param("id") id: string) {
        await this.webAiMcpServerService.delete(id);
        return null;
    }

    /**
     * 切换MCP服务禁用状态
     */
    @Put(":id/toggle-disabled")
    async toggleDisabled(
        @Param("id") id: string,
        @Body() toggleDto: ToggleAiMcpServerStatusDto,
        @Playground() user: UserPlayground,
    ) {
        const updated = await this.webAiMcpServerService.toggleMcpServerStatus(
            id,
            toggleDto.status,
            user.id,
        );

        return updated;
    }

    /**
     * 从JSON字符串导入MCP服务配置并自动与当前用户建立关联
     *
     * 导入的MCP服务会被创建为系统服务，并自动与当前用户建立关联
     */
    @Post("import-json-string")
    @BuildFileUrl(["**.icon"])
    async importFromJsonString(
        @Body() importJsonDto: ImportWebAiMcpServerJsonDto,
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
                // 将 headers 转换为 customHeaders
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
            const importDto: ImportWebAiMcpServerDto = {
                mcpServers: parsedData.mcpServers,
                creatorId: user.id,
            };

            const result = await this.webAiMcpServerService.importMcpServers(importDto);

            return result;
        } catch (error) {
            // 如果是已经处理过的 HTTP 异常，直接抛出
            if (error.status) {
                throw error;
            }
            // 其他未处理的错误
            throw HttpErrorFactory.badRequest(`导入失败: ${error.message}`);
        }
    }

    /**
     * 检测MCP服务连接状态并更新工具列表
     */
    @Post(":id/check-connection")
    @BuildFileUrl(["**.icon"])
    async checkConnection(@Param("id") id: string, @Playground() user: UserPlayground) {
        return await this.webAiMcpServerService.checkConnectionAndUpdateTools(id, user.id);
    }

    /**
     * 批量检测多个MCP服务的连接状态并更新工具列表
     *
     * @param batchCheckDto 包含MCP服务ID列表的DTO
     * @param user 当前用户信息
     * @returns 每个MCP服务的连接检测结果
     */
    @Post("batch-check-connection")
    @BuildFileUrl(["**.icon"])
    async batchCheckConnection(
        @Body() batchCheckDto: BatchCheckMcpConnectionDto,
        @Playground() user: UserPlayground,
    ) {
        const results = [];
        const { mcpServerIds } = batchCheckDto;

        // 循环检测每个MCP服务的连接状态
        for (const mcpServerId of mcpServerIds) {
            try {
                const result = await this.webAiMcpServerService.checkConnectionAndUpdateTools(
                    mcpServerId,
                    user.id,
                );
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
}
