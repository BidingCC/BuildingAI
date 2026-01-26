import { MenuSourceType, MenuType } from "@buildingai/db/entities";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsEnum, IsOptional, IsString } from "class-validator";

/**
 * 查询菜单DTO
 */
export class QueryMenuDto extends PaginationDto {
    /**
     * 菜单名称
     */
    @IsString()
    @IsOptional()
    name?: string;

    /**
     * 菜单类型
     */
    @IsEnum(MenuType)
    @IsOptional()
    type?: MenuType;

    /**
     * 父级菜单ID
     */
    @IsString()
    @IsOptional()
    parentId?: string;

    /**
     * 菜单来源类型
     */
    @IsEnum(MenuSourceType)
    @IsOptional()
    sourceType?: MenuSourceType;
}
