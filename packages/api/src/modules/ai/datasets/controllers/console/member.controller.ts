import { type UserPlayground } from "@buildingai/db";
import { DatasetMember } from "@buildingai/db/entities";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Post, Put, Query } from "@nestjs/common";

import {
    AddTeamMemberDto,
    BatchAddTeamMemberDto,
    BatchTeamMemberOperationDto,
    QueryTeamMemberDto,
    RemoveTeamMemberDto,
    TransferOwnershipDto,
    UpdateTeamMemberRoleDto,
} from "../../dto/members.dto";
import { TeamMemberDetailDto } from "../../interfaces/member.interface";
import { DatasetMemberService } from "../../services/datasets-member.service";

@ConsoleController("ai-datasets-team-members", "数据集团队成员")
export class TeamMemberController {
    /**
     * Creates a new TeamMemberController instance
     *
     * @param datasetMemberService - Service for handling dataset member operations
     */
    constructor(private readonly datasetMemberService: DatasetMemberService) {}

    /**
     * Add Team Member
     *
     * Adds a new member to the dataset team with specified role
     *
     * @param addMemberDto - Team member addition parameters
     * @param user - Current user information
     * @returns Created team member information
     */
    @Post("")
    @Permissions({
        code: "add-member",
        name: "添加团队成员",
    })
    async addMember(
        @Body() addMemberDto: AddTeamMemberDto,
        @Playground() user: UserPlayground,
    ): Promise<DatasetMember> {
        return this.datasetMemberService.addMember(addMemberDto, user.id);
    }

    /**
     * Batch Add Team Members
     *
     * Adds multiple members to the dataset team in a single operation
     *
     * @param batchAddDto - Batch addition parameters containing multiple members
     * @param user - Current user information
     * @returns Array of created team member information
     */
    @Post("batch")
    @Permissions({
        code: "batch-add-members",
        name: "批量添加团队成员",
    })
    async batchAddMembers(
        @Body() batchAddDto: BatchAddTeamMemberDto,
        @Playground() user: UserPlayground,
    ): Promise<DatasetMember[]> {
        return this.datasetMemberService.batchAddMembers(batchAddDto, user.id);
    }

    /**
     * Update Team Member Role
     *
     * Updates the role of an existing team member
     *
     * @param updateRoleDto - Role update parameters
     * @param user - Current user information
     * @returns Updated team member information
     */
    @Put("role")
    @Permissions({
        code: "update-member-role",
        name: "更新成员角色",
    })
    async updateMemberRole(
        @Body() updateRoleDto: UpdateTeamMemberRoleDto,
        @Playground() user: UserPlayground,
    ): Promise<DatasetMember> {
        return this.datasetMemberService.updateMemberRole(updateRoleDto, user.id);
    }

    /**
     * Remove Team Member
     *
     * Removes a member from the dataset team
     *
     * @param removeMemberDto - Member removal parameters
     * @param user - Current user information
     * @returns Success message
     */
    @Delete("")
    @Permissions({
        code: "remove-member",
        name: "移除团队成员",
    })
    async removeMember(
        @Body() removeMemberDto: RemoveTeamMemberDto,
        @Playground() user: UserPlayground,
    ): Promise<{ message: string }> {
        await this.datasetMemberService.removeMember(removeMemberDto, user.id);
        return { message: "团队成员已成功移除" };
    }

    /**
     * Get Team Members List
     *
     * Returns team members list and marks whether current user can operate each member
     *
     * @param queryDto - Query parameters for filtering members
     * @param user - Current user information
     * @returns Team members list with operation permissions
     */
    @Get("")
    @BuildFileUrl(["**.avatar"])
    @Permissions({
        code: "list",
        name: "查询团队成员列表",
    })
    async getMembers(@Query() queryDto: QueryTeamMemberDto, @Playground() user: UserPlayground) {
        return this.datasetMemberService.getMembers(queryDto, user.id);
    }

    /**
     * Get Team Member Details
     *
     * Retrieves detailed information about a specific team member
     *
     * @param memberId - Team member ID
     * @returns Team member detailed information
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查看成员详情",
    })
    async getMemberDetail(@Query("id") memberId: string): Promise<TeamMemberDetailDto> {
        return this.datasetMemberService.getMemberDetail(memberId);
    }

    /**
     * Transfer Dataset Ownership
     *
     * Transfers ownership of the dataset to another team member
     *
     * @param transferDto - Ownership transfer parameters
     * @param user - Current user information
     * @returns Success message
     */
    @Put("ownership/transfer")
    @Permissions({
        code: "transfer-ownership",
        name: "转移所有权",
    })
    async transferOwnership(
        @Body() transferDto: TransferOwnershipDto,
        @Playground() user: UserPlayground,
    ): Promise<{ message: string }> {
        await this.datasetMemberService.transferOwnership(transferDto, user.id);
        return { message: "所有权转移成功" };
    }

    /**
     * Batch Operation on Team Members
     *
     * Performs batch operations on multiple team members (e.g., bulk role updates, removals)
     *
     * @param batchDto - Batch operation parameters
     * @param user - Current user information
     * @returns Success message
     */
    @Put("batch")
    @Permissions({
        code: "batch-operation",
        name: "批量操作成员",
    })
    async batchOperation(
        @Body() batchDto: BatchTeamMemberOperationDto,
        @Playground() user: UserPlayground,
    ): Promise<{ message: string }> {
        await this.datasetMemberService.batchOperation(batchDto, user.id);
        return { message: "批量操作完成" };
    }

    /**
     * Get User Role in Dataset
     *
     * Retrieves the current user's role and active status in the specified dataset
     *
     * @param datasetId - Dataset ID
     * @param user - Current user information
     * @returns User role and active status information
     */
    @Get("role/:datasetId")
    @Permissions({
        code: "get-user-role",
        name: "查询用户角色",
    })
    async getUserRole(
        @Query("datasetId") datasetId: string,
        @Playground() user: UserPlayground,
    ): Promise<{ role: string | null; isActive: boolean }> {
        const member = await this.datasetMemberService.getUserMemberInDataset(datasetId, user.id);
        return {
            role: member?.role || null,
            isActive: !!member?.isActive,
        };
    }

    /**
     * Check Dataset Membership
     *
     * Checks if the current user is a member of the specified dataset and returns their role
     *
     * @param datasetId - Dataset ID
     * @param user - Current user information
     * @returns Membership status and role information
     */
    @Get("check/:datasetId")
    @Permissions({
        code: "check-membership",
        name: "检查成员身份",
    })
    async checkMembership(
        @Query("datasetId") datasetId: string,
        @Playground() user: UserPlayground,
    ): Promise<{ isMember: boolean; role?: string }> {
        const isMember = await this.datasetMemberService.isDatasetMember(datasetId, user.id);
        let role: string | undefined;

        if (isMember) {
            role = await this.datasetMemberService.getUserRoleInDataset(datasetId, user.id);
        }

        return {
            isMember,
            role,
        };
    }
}
