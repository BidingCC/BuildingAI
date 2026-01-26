import { AppEntity } from "../decorators/app-entity.decorator";
import { NormalizeFileUrl } from "../decorators/file-url.decorator";
import { Column, JoinColumn, ManyToOne, OneToMany, type Relation } from "../typeorm";
import { AiMcpTool } from "./ai-mcp-tool.entity";
import { AiUserMcpServer } from "./ai-user-mcp-server.entity";
import { BaseEntity } from "./base";
import { User } from "./user.entity";

/**
 * MCP服务类型枚举
 */
export enum McpServerType {
    /**
     * 用户自定义服务
     */
    USER = "user",

    /**
     * 系统内置服务
     */
    SYSTEM = "system",
}

/**
 * MCP服务通信的传输方式
 */
export enum McpCommunicationType {
    /**
     * SSE
     */
    SSE = "sse",

    /**
     * StreamableHTTP
     */
    STREAMABLEHTTP = "streamable-http",
}

/**
 * MCP服务配置实体
 *
 * 用于存储具体MCP服务的配置信息
 */
@AppEntity({ name: "ai_mcp_servers", comment: "MCP服务配置" })
export class AiMcpServer extends BaseEntity {
    /**
     * 服务名称
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "服务名称",
    })
    name: string;

    /**
     * 服务别名
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "服务别名",
        nullable: true,
    })
    alias?: string;

    /**
     * 服务描述
     */
    @Column({
        type: "text",
        nullable: true,
        comment: "服务描述",
    })
    description?: string;

    /**
     * 图标
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "图标",
        nullable: true,
    })
    @NormalizeFileUrl()
    icon?: string;

    /**
     * 服务类型
     */
    @Column({
        type: "enum",
        enum: McpServerType,
        default: McpServerType.USER,
        comment: "服务类型，只能是 user 或 system",
    })
    type: McpServerType;

    /**
     * 服务SSE URL
     */
    @Column({
        type: "varchar",
        length: 1024,
        comment: "服务SSE URL",
        nullable: true,
    })
    url: string;

    /**
     * 超时时间
     */
    @Column({
        type: "integer",
        comment: "超时时间",
        nullable: true,
        default: 60,
    })

    /**
     * 通信传输方式
     */
    @Column({
        type: "enum",
        enum: McpCommunicationType,
        default: McpCommunicationType.SSE,
        comment: "通信传输方式: sse 或 streamable-http",
    })
    communicationType: McpCommunicationType;

    /**
     * 自定义请求头
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "自定义请求头，JSON格式存储",
    })
    customHeaders?: Record<string, string>;

    /**
     * 供应商图标
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "供应商图标",
        nullable: true,
    })
    providerIcon?: string;

    /**
     * 供应商名称
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "供应商名称",
        nullable: true,
    })
    providerName?: string;

    /**
     * 供应商URL
     */
    @Column({
        type: "varchar",
        length: 100,
        comment: "供应商URL",
        nullable: true,
    })
    providerUrl?: string;

    /**
     * 排序权重
     */
    @Column({
        type: "integer",
        default: 0,
        comment: "排序权重，数字越小越靠前",
    })
    sortOrder: number;

    /**
     * 是否可连接
     */
    @Column({
        type: "boolean",
        default: false,
        comment: "是否可连接",
    })
    connectable: boolean;

    /**
     * 连接失败信息
     */
    @Column({
        type: "varchar",
        length: 255,
        default: "",
        comment: "连接失败信息",
    })
    connectError: string;

    /**
     * 是否禁用该服务
     */
    @Column({
        type: "boolean",
        default: false,
        comment: "是否禁用该服务",
    })
    isDisabled: boolean;

    /**
     * 关联的创建者用户
     *
     * 多对一关系，一个MCP服务只能属于一个创建者，一个创建者可以创建多个MCP服务
     */
    @ManyToOne(() => User)
    @JoinColumn({ name: "creator_id" })
    creator: User;

    /**
     * 用户关联记录
     */
    @OneToMany(() => AiUserMcpServer, (userMcpServer) => userMcpServer.mcpServer)
    userMcpServer: Relation<AiUserMcpServer[]>;

    /**
     * 工具关联记录
     */
    @OneToMany(() => AiMcpTool, (tool) => tool.mcpServer)
    tools: Relation<AiMcpTool[]>;

    /**
     * 创建者用户ID
     */
    @Column({
        type: "uuid",
        nullable: true,
        comment: "创建者用户ID",
    })
    creatorId: string;
}
