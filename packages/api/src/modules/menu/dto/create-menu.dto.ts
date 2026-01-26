import { MenuSourceType, MenuType } from "@buildingai/db/entities";
import { Transform } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, Length, Max, Min } from "class-validator";

/**
 * 创建菜单DTO
 */
export class CreateMenuDto {
    /**
     * 菜单名称
     */
    @IsString({ message: "菜单名称必须是字符串" })
    @Length(1, 50, { message: "菜单名称长度必须在1-50个字符之间" })
    name: string;

    /**
     * 菜单路径
     */
    @IsString({ message: "菜单路径必须是字符串" })
    @IsOptional()
    @Length(0, 100, { message: "菜单路径长度不能超过100个字符" })
    path?: string;

    /**
     * 唯一标识
     */
    @IsString({ message: "唯一标识必须是字符串" })
    @IsOptional()
    @Length(1, 50, { message: "唯一标识长度必须在1-50个字符之间" })
    code?: string;

    /**
     * 菜单图标
     */
    @IsString({ message: "菜单图标必须是字符串" })
    @IsOptional()
    @Length(0, 50, { message: "菜单图标长度不能超过50个字符" })
    icon?: string;

    /**
     * 组件路径
     */
    @IsString({ message: "组件路径必须是字符串" })
    @IsOptional()
    @Length(0, 100, { message: "组件路径长度不能超过100个字符" })
    component?: string;

    /**
     * 权限编码
     */
    @IsString({ message: "权限编码必须是字符串" })
    @IsOptional()
    @Length(0, 100, { message: "权限编码长度不能超过100个字符" })
    @Transform(({ value }) => (value === "" ? null : value))
    permissionCode?: string;

    /**
     * 父级菜单ID
     */
    @IsString({ message: "父级菜单ID必须是字符串" })
    @IsOptional()
    parentId?: string;

    /**
     * 排序
     */
    @IsNumber({}, { message: "排序值必须是数字" })
    @IsOptional()
    @Min(0, { message: "排序值不能小于0" })
    @Max(9999, { message: "排序值不能大于9999" })
    sort?: number = 0;

    /**
     * 是否隐藏
     * 0: 显示
     * 1: 隐藏
     */
    @IsNumber({}, { message: "隐藏状态必须是数字" })
    @IsOptional()
    @Min(0, { message: "隐藏状态值必须为0或1" })
    @Max(1, { message: "隐藏状态值必须为0或1" })
    isHidden?: number = 0;

    /**
     * 菜单类型
     * 1: 目录
     * 2: 菜单
     * 3: 按钮
     */
    @IsEnum(MenuType, { message: "菜单类型必须是有效的枚举值" })
    @IsOptional()
    type?: MenuType = MenuType.MENU;

    /**
     * 菜单来源类型
     * 1: 系统菜单
     * 2: 插件菜单
     */
    @IsEnum(MenuSourceType, { message: "菜单来源类型必须是有效的枚举值" })
    sourceType: MenuSourceType;
}
