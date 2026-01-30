import { TEAM_ROLE, type TeamRoleType } from "@buildingai/constants/shared/team-role.constants";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

/**
 * Add team member DTO
 */
export class AddTeamMemberDto {
    /**
     * Dataset ID
     */
    @IsUUID(4, { message: "Dataset ID must be a valid UUID format" })
    datasetId: string;

    /**
     * User ID
     */
    @IsUUID(4, { message: "User ID must be a valid UUID format" })
    userId: string;

    /**
     * Team role
     */
    @IsEnum(TEAM_ROLE, { message: "Role must be a valid team role" })
    role: TeamRoleType;

    /**
     * Note information
     */
    @IsOptional()
    @IsString({ message: "Note information must be a string" })
    note?: string;
}

/**
 * Update team member role DTO
 */
export class UpdateTeamMemberRoleDto {
    /**
     * Member ID
     */
    @IsUUID(4, { message: "Member ID必须是有效的UUID格式" })
    memberId: string;

    /**
     * New team role
     */
    @IsEnum(TEAM_ROLE, { message: "Role must be a valid team role" })
    role: TeamRoleType;

    /**
     * Note information
     */
    @IsOptional()
    @IsString({ message: "Note information must be a string" })
    note?: string;
}

/**
 * Remove team member DTO
 */
export class RemoveTeamMemberDto {
    /**
     * Member ID
     */
    @IsUUID(4, { message: "Member ID必须是有效的UUID格式" })
    memberId: string;
}

/**
 * Query team member DTO
 */
export class QueryTeamMemberDto extends PaginationDto {
    /**
     * Dataset ID
     */
    @IsUUID(4, { message: "Dataset ID must be a valid UUID format" })
    datasetId: string;

    /**
     * Role filter
     */
    @IsOptional()
    @IsEnum(TEAM_ROLE, { message: "Role must be a valid team role" })
    role?: TeamRoleType;

    /**
     * Username search
     */
    @IsOptional()
    @IsString({ message: "Username must be a string" })
    username?: string;

    /**
     * 是否启用筛选
     */
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean({ message: "启用状态必须是布尔值" })
    isActive?: boolean;
}

/**
 * 转移所有权DTO
 */
export class TransferOwnershipDto {
    /**
     * Dataset ID
     */
    @IsUUID(4, { message: "Dataset ID must be a valid UUID format" })
    datasetId: string;

    /**
     * 新所有者User ID
     */
    @IsUUID(4, { message: "新所有者ID必须是有效的UUID格式" })
    newOwnerId: string;
}

/**
 * 批量操作团队成员DTO
 */
export class BatchTeamMemberOperationDto {
    /**
     * Member ID列表
     */
    @IsUUID(4, { each: true, message: "每个Member ID必须是有效的UUID格式" })
    memberIds: string[];

    /**
     * 操作类型：remove-移除, update_role-更新角色, toggle_active-切换启用状态
     */
    @IsEnum(["remove", "update_role", "toggle_active"], {
        message: "操作类型无效",
    })
    operation: "remove" | "update_role" | "toggle_active";

    /**
     * 新角色（仅当操作类型为update_role时需要）
     */
    @IsOptional()
    @IsEnum(TEAM_ROLE, { message: "Role must be a valid team role" })
    newRole?: TeamRoleType;
}

/**
 * 批量Add team member DTO
 */
export class BatchAddTeamMemberDto {
    /**
     * Dataset ID
     */
    @IsUUID(4, { message: "Dataset ID must be a valid UUID format" })
    datasetId: string;

    /**
     * 成员列表
     */
    @IsArray({ message: "成员列表必须是数组" })
    @Type(() => BatchAddTeamMemberItemDto)
    members: BatchAddTeamMemberItemDto[];
}

/**
 * 批量添加团队成员项DTO
 */
export class BatchAddTeamMemberItemDto {
    /**
     * User ID
     */
    @IsUUID(4, { message: "User ID must be a valid UUID format" })
    userId: string;

    /**
     * Team role
     */
    @IsEnum(TEAM_ROLE, { message: "Role must be a valid team role" })
    role: TeamRoleType;

    /**
     * Note information
     */
    @IsOptional()
    @IsString({ message: "Note information must be a string" })
    note?: string;
}
