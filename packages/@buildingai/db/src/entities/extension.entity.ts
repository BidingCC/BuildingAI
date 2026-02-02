import { ExtensionSupportTerminal } from "@buildingai/constants";
import {
    ExtensionStatus,
    type ExtensionStatusType,
    type ExtensionSupportTerminalType,
    ExtensionType,
    type ExtensionTypeType,
} from "@buildingai/constants/shared/extension.constant";

import { AppEntity } from "../decorators/app-entity.decorator";
import { NormalizeFileUrl } from "../decorators/file-url.decorator";
import { BeforeInsert, Column } from "../typeorm";
import { BaseEntity } from "./base";

/**
 * 应用实体
 *
 * 管理系统中的各种应用，包括工具应用、服务应用、模型应用等
 */
@AppEntity({ name: "extension", comment: "应用管理" })
export class Extension extends BaseEntity {
    /**
     * 应用名称
     */
    @Column({ length: 100, comment: "应用名称" })
    name: string;

    /**
     * 应用别名（用于前台显示）
     */
    @Column({ length: 100, nullable: true, comment: "应用别名" })
    alias?: string;

    /**
     * 对外显示描述
     */
    @Column({ type: "text", nullable: true, comment: "对外显示描述" })
    aliasDescription?: string;

    /**
     * 对外显示图标
     */
    @Column({ type: "text", nullable: true, comment: "外显示图标" })
    @NormalizeFileUrl()
    aliasIcon?: string;

    /**
     * 是否对外显示
     */
    @Column({ type: "boolean", nullable: true, default: true, comment: "是否对外显示" })
    aliasShow?: boolean;

    /**
     * 应用标识符
     */
    @Column({ length: 100, unique: true, comment: "应用标识符" })
    identifier: string;

    /**
     * 应用版本
     */
    @Column({ length: 20, default: "1.0.0", comment: "应用版本" })
    version: string;

    /**
     * 应用描述
     */
    @Column({ type: "text", nullable: true, comment: "应用描述" })
    description?: string;

    /**
     * 应用图标
     */
    @Column({ type: "text", nullable: true, comment: "应用图标" })
    @NormalizeFileUrl()
    icon?: string;

    /**
     * 应用类型
     */
    @Column({
        type: "int",
        default: ExtensionType.APPLICATION,
        comment: "应用类型：1-应用应用，2-功能应用",
    })
    type: ExtensionTypeType;

    /**
     * 应用支持的终端类型
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "应用支持的终端类型数组：1-Web端，2-公众号，3-H5，4-小程序，5-API端",
    })
    supportTerminal?: ExtensionSupportTerminalType[];

    /**
     * 是否为开发应用
     */
    @Column({ type: "boolean", default: true, comment: "是否为本地开发应用" })
    isLocal: boolean;

    /**
     * 应用状态
     */
    @Column({
        type: "enum",
        enum: ExtensionStatus,
        default: ExtensionStatus.DISABLED,
        enumName: "plugin_status_enum",
        comment: "应用状态：0-禁用，1-启用",
    })
    status: ExtensionStatusType;

    /**
     * 应用作者
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "应用作者信息，包括头像、名称、主页",
    })
    author?: {
        avatar?: string;
        name?: string;
        homepage?: string;
    };

    /**
     * 应用官网或仓库地址
     */
    @Column({ type: "text", nullable: true, comment: "应用官网或仓库地址" })
    homepage?: string;

    /**
     * 应用文档地址
     */
    @Column({ type: "text", nullable: true, comment: "应用文档地址" })
    documentation?: string;

    /**
     * 应用配置参数
     *
     * JSON格式存储应用的配置信息
     */
    @Column({ type: "jsonb", nullable: true, comment: "应用配置参数" })
    config?: Record<string, any>;

    /**
     * 设置默认的支持终端类型
     *
     * 在插入前设置默认值
     */
    @BeforeInsert()
    private setDefaultSupportTerminal() {
        if (!this.supportTerminal || this.supportTerminal.length === 0) {
            this.supportTerminal = [ExtensionSupportTerminal.WEB];
        }
    }

    /**
     * 检查是否已启用
     *
     * @returns 是否已启用
     */
    isEnabled(): boolean {
        return this.status === ExtensionStatus.ENABLED;
    }

    /**
     * 检查应用是否可用
     *
     * 应用可用的条件：已启用且审核通过
     *
     * @returns 应用是否可用
     */
    isAvailable(): boolean {
        return this.isEnabled();
    }
}
