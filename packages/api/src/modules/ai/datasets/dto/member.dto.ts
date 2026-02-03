import { TEAM_ROLE, type TeamRoleType } from "@buildingai/constants/shared/team-role.constants";
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * 申请加入知识库 DTO
 */
export class ApplyToDatasetDto {
    /** 申请成为的角色，默认 viewer（普通成员） */
    @IsOptional()
    @IsEnum(TEAM_ROLE, { message: "角色必须是 owner | manager | editor | viewer 之一" })
    appliedRole?: TeamRoleType = TEAM_ROLE.VIEWER;

    /** 申请留言 */
    @IsOptional()
    @IsString()
    message?: string;
}

/**
 * 同意/拒绝申请 - 仅创建者操作，无需额外 body，拒绝时用 RejectApplicationDto
 */
export class RejectApplicationDto {
    /** 拒绝原因 */
    @IsOptional()
    @IsString()
    rejectReason?: string;
}

/**
 * 修改成员角色 DTO - 仅创建者可操作
 */
export class UpdateMemberRoleDto {
    @IsEnum(TEAM_ROLE, { message: "角色必须是 owner | manager | editor | viewer 之一" })
    role!: TeamRoleType;
}

/**
 * 申请列表查询（支持按状态筛选）
 */
export class ListApplicationsDto {
    @IsOptional()
    @IsIn(["pending", "approved", "rejected"], {
        message: "status 必须是 pending | approved | rejected",
    })
    status?: "pending" | "approved" | "rejected";

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    pageSize?: number = 20;
}

/**
 * 成员列表查询
 */
export class ListMembersDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    pageSize?: number = 20;
}
