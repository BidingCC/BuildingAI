import { TEAM_ROLE, type TeamRoleType } from "@buildingai/constants/shared/team-role.constants";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";

export class ApplyToDatasetDto {
    @IsOptional()
    @IsEnum(TEAM_ROLE, { message: "角色必须是 owner | manager | editor | viewer 之一" })
    appliedRole?: TeamRoleType = TEAM_ROLE.VIEWER;

    @IsOptional()
    @IsString()
    message?: string;
}

export class RejectApplicationDto {
    @IsOptional()
    @IsString()
    rejectReason?: string;
}

export class UpdateMemberRoleDto {
    @IsEnum(TEAM_ROLE, { message: "角色必须是 owner | manager | editor | viewer 之一" })
    role!: TeamRoleType;
}

export class ListApplicationsDto {
    @IsOptional()
    @IsIn(["pending", "approved", "rejected"], {
        message: "status 必须是 pending | approved | rejected",
    })
    status?: "pending" | "approved" | "rejected";
}

export class ListMembersDto extends PaginationDto {}
