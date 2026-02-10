import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    ApplyToDatasetDto,
    ListApplicationsDto,
    ListMembersDto,
    RejectApplicationDto,
    UpdateMemberRoleDto,
} from "../../dto/member.dto";
import { DatasetPermission } from "../../guards/datasets-permission.guard";
import { DatasetMemberService } from "../../services/datasets-member.service";

/**
 * 知识库成员 Web 控制器
 *
 * - 成员列表、申请列表：成员可见；仅创建者可操作申请（同意/拒绝）、修改成员角色、移除成员
 * - 权限：管理员(manager)=预览+提问+编辑；普通成员(viewer)=预览+提问
 */
@WebController("ai-datasets")
export class DatasetsMembersWebController {
    constructor(private readonly memberService: DatasetMemberService) {}

    /**
     * 已加入的成员列表（分页）
     */
    @Get(":datasetId/members")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async listMembers(
        @Param("datasetId") datasetId: string,
        @Query() query: ListMembersDto,
        @Playground() user: UserPlayground,
    ) {
        return this.memberService.listMembers(datasetId, user.id, query);
    }

    /**
     * 申请列表（待审核/已通过/已拒绝）- 成员可见，仅创建者可操作
     */
    @Get(":datasetId/applications")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async listApplications(
        @Param("datasetId") datasetId: string,
        @Query() query: ListApplicationsDto,
        @Playground() user: UserPlayground,
    ) {
        return this.memberService.listApplications(datasetId, user.id, query);
    }

    /**
     * 申请加入知识库
     */
    @Post(":datasetId/apply")
    async apply(
        @Param("datasetId") datasetId: string,
        @Body() dto: ApplyToDatasetDto,
        @Playground() user: UserPlayground,
    ) {
        return this.memberService.applyToJoin(datasetId, user, dto);
    }

    /**
     * 同意申请（仅创建者可操作）
     */
    @Post(":datasetId/applications/:applicationId/approve")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async approve(
        @Param("datasetId") datasetId: string,
        @Param("applicationId") applicationId: string,
        @Playground() user: UserPlayground,
    ) {
        return this.memberService.approveApplication(datasetId, applicationId, user.id);
    }

    /**
     * 拒绝申请（仅创建者可操作）
     */
    @Post(":datasetId/applications/:applicationId/reject")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async reject(
        @Param("datasetId") datasetId: string,
        @Param("applicationId") applicationId: string,
        @Body() dto: RejectApplicationDto,
        @Playground() user: UserPlayground,
    ) {
        await this.memberService.rejectApplication(datasetId, applicationId, user.id, dto);
        return { success: true };
    }

    /**
     * 修改成员角色（仅创建者可操作）
     */
    @Patch(":datasetId/members/:memberId/role")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async updateRole(
        @Param("datasetId") datasetId: string,
        @Param("memberId") memberId: string,
        @Body() dto: UpdateMemberRoleDto,
        @Playground() user: UserPlayground,
    ) {
        return this.memberService.updateMemberRole(datasetId, memberId, dto, user.id);
    }

    /**
     * 移除成员（仅创建者可操作）
     */
    @Delete(":datasetId/members/:memberId")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async removeMember(
        @Param("datasetId") datasetId: string,
        @Param("memberId") memberId: string,
        @Playground() user: UserPlayground,
    ) {
        await this.memberService.removeMember(datasetId, memberId, user.id);
        return { success: true };
    }

    /**
     * 退出知识库（当前用户主动退出，创建者不可用）
     */
    @Post(":datasetId/leave")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async leave(@Param("datasetId") datasetId: string, @Playground() user: UserPlayground) {
        await this.memberService.leaveDataset(datasetId, user.id);
        return { success: true };
    }
}
