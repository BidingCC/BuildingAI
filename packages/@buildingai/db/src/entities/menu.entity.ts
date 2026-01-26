import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, JoinColumn, ManyToOne, OneToMany } from "../typeorm";
import { BaseEntity } from "./base";
import { Permission } from "./permission.entity";

/**
 * 菜单类型枚举
 */
export enum MenuType {
    /**
     * 分组
     */
    GROUP = 0,

    /**
     * 目录
     */
    DIRECTORY = 1,

    /**
     * 菜单
     */
    MENU = 2,

    /**
     * 按钮
     */
    BUTTON = 3,
}

/**
 * 菜单来源类型枚举
 */
export enum MenuSourceType {
    /**
     * 系统菜单
     */
    SYSTEM = 1,

    /**
     * 插件菜单
     */
    PLUGIN = 2,
}

/**
 * 菜单实体
 */
@AppEntity({ name: "menus", comment: "菜单管理" })
export class Menu extends BaseEntity {
    /**
     * 菜单名称
     */
    @Column({ length: 50 })
    name: string;

    /**
     * 唯一标识
     */
    @Column({ length: 50, unique: true, nullable: true })
    code: string;

    /**
     * 菜单路径
     */
    @Column({ length: 100, nullable: true })
    path: string;

    /**
     * 菜单图标
     */
    @Column({ length: 50, nullable: true })
    icon: string;

    /**
     * 组件路径
     */
    @Column({ length: 100, nullable: true })
    component: string;

    /**
     * 权限ID
     */
    @Column({ name: "permissionCode", nullable: true })
    permissionCode: string;

    /**
     * 父级菜单ID
     */
    @Column({ name: "parentId", nullable: true })
    parentId: string;

    /**
     * 排序
     */
    @Column({ default: 0 })
    sort: number;

    /**
     * 是否隐藏
     * 0: 显示
     * 1: 隐藏
     */
    @Column({ name: "isHidden", default: 0 })
    isHidden: number;

    /**
     * 菜单类型
     * 1: 目录
     * 2: 菜单
     * 3: 按钮
     */
    @Column({ default: MenuType.MENU })
    type: MenuType;

    /**
     * 菜单来源类型
     * 1: 系统菜单
     * 2: 插件菜单
     */
    @Column({ name: "sourceType", default: MenuSourceType.SYSTEM })
    sourceType: MenuSourceType;

    /**
     * 父级菜单
     */
    @ManyToOne(() => Menu, (menu) => menu.children, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "parentId" })
    parent: Menu;

    /**
     * 子菜单
     */
    @OneToMany(() => Menu, (menu) => menu.parent)
    children: Menu[];

    /**
     * 权限
     */
    @ManyToOne(() => Permission, {
        nullable: true,
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    })
    @JoinColumn({ name: "permissionCode", referencedColumnName: "code" })
    permission: Permission;
}
