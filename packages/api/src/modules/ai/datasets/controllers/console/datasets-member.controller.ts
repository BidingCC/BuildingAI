import { TEAM_ROLE } from "@buildingai/constants/shared/team-role.constants";
import { type UserPlayground } from "@buildingai/db";
import { MemberApplicationStatus } from "@buildingai/db/entities";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    ListApplicationsDto,
    ListMembersDto,
    RejectApplicationDto,
    UpdateMemberRoleDto,
} from "../../dto/member.dto";
import { DatasetsService } from "../../services/datasets.service";
import { DatasetMemberService } from "../../services/datasets-member.service";
import { DatasetMemberApplicationService } from "../../services/datasets-member-application.service";

@ConsoleController("datasets-members", "知识库成员")
export class DatasetsMemberConsoleController {
    constructor(
        private readonly datasetsService: DatasetsService,
        private readonly memberService: DatasetMemberService,
        private readonly applicationService: DatasetMemberApplicationService,
    ) {}

    @Get(":datasetId/members")
    @Permissions({ code: "list", name: "成员列表", description: "分页查询知识库成员" })
    async listMembers(@Param("datasetId") datasetId: string, @Query() query: ListMembersDto) {
        const dataset = await this.datasetsService.findOneById(datasetId);
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        return this.memberService.paginate(query, {
            where: { datasetId, isActive: true },
            relations: ["user"],
            order: { createdAt: "ASC" },
        });
    }

    @Get(":datasetId/applications")
    @Permissions({ code: "list", name: "申请列表", description: "查询知识库加入申请" })
    async listApplications(
        @Param("datasetId") datasetId: string,
        @Query() query: ListApplicationsDto,
    ) {
        const dataset = await this.datasetsService.findOneById(datasetId);
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        const status =
            query.status === "pending"
                ? MemberApplicationStatus.PENDING
                : query.status === "approved"
                  ? MemberApplicationStatus.APPROVED
                  : query.status === "rejected"
                    ? MemberApplicationStatus.REJECTED
                    : undefined;
        const result = await this.applicationService.paginate(
            { page: 1, pageSize: 500 },
            {
                where: { datasetId, ...(status && { status }) },
                relations: ["user"],
                order: { createdAt: "DESC" },
            },
        );
        return { items: result.items };
    }

    @Patch(":datasetId/members/:memberId/role")
    @Permissions({ code: "list", name: "修改角色", description: "后台修改成员角色" })
    async updateMemberRole(
        @Param("datasetId") datasetId: string,
        @Param("memberId") memberId: string,
        @Body() dto: UpdateMemberRoleDto,
    ) {
        const dataset = await this.datasetsService.findOneById(datasetId);
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        const member = await this.memberService.findOne({
            where: { id: memberId, datasetId, isActive: true },
        });
        if (!member) throw HttpErrorFactory.notFound("成员不存在");
        if (member.role === TEAM_ROLE.OWNER)
            throw HttpErrorFactory.badRequest("不能修改创建者的角色");
        if (dto.role === TEAM_ROLE.OWNER)
            throw HttpErrorFactory.badRequest("不能将成员设置为所有者");
        await this.memberService.updateById(memberId, { role: dto.role });
        return this.memberService.findOneById(memberId);
    }

    @Delete(":datasetId/members/:memberId")
    @Permissions({ code: "list", name: "移除成员", description: "后台移除知识库成员" })
    async removeMember(@Param("datasetId") datasetId: string, @Param("memberId") memberId: string) {
        const dataset = await this.datasetsService.findOneById(datasetId);
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        const member = await this.memberService.findOne({
            where: { id: memberId, datasetId, isActive: true },
        });
        if (!member) throw HttpErrorFactory.notFound("成员不存在");
        if (member.role === TEAM_ROLE.OWNER)
            throw HttpErrorFactory.badRequest("不能移除知识库创建者");
        await this.memberService.updateById(memberId, { isActive: false });
        return { success: true };
    }

    @Post(":datasetId/applications/:applicationId/approve")
    @Permissions({ code: "list", name: "通过申请", description: "后台通过加入申请" })
    async approveApplication(
        @Param("datasetId") datasetId: string,
        @Param("applicationId") applicationId: string,
        @Playground() user: UserPlayground,
    ) {
        const dataset = await this.datasetsService.findOneById(datasetId);
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        const application = await this.applicationService.findOne({
            where: { id: applicationId, datasetId },
            relations: ["user"],
        });
        if (!application) throw HttpErrorFactory.notFound("申请记录不存在");
        if (application.status !== MemberApplicationStatus.PENDING)
            throw HttpErrorFactory.badRequest("该申请已处理，无法重复操作");
        const existingMember = await this.memberService.findOne({
            where: { datasetId, userId: application.userId, isActive: true },
        });
        if (existingMember) {
            await this.applicationService.updateById(applicationId, {
                status: MemberApplicationStatus.APPROVED,
                reviewedBy: user.id,
                reviewedAt: new Date(),
            });
            return existingMember;
        }
        const newMember = await this.memberService.create({
            datasetId,
            userId: application.userId,
            role: application.appliedRole,
            isActive: true,
            invitedBy: user.id,
        });
        await this.applicationService.updateById(applicationId, {
            status: MemberApplicationStatus.APPROVED,
            reviewedBy: user.id,
            reviewedAt: new Date(),
        });
        return newMember;
    }

    @Post(":datasetId/applications/:applicationId/reject")
    @Permissions({ code: "list", name: "拒绝申请", description: "后台拒绝加入申请" })
    async rejectApplication(
        @Param("datasetId") datasetId: string,
        @Param("applicationId") applicationId: string,
        @Body() dto: RejectApplicationDto,
        @Playground() user: UserPlayground,
    ) {
        const dataset = await this.datasetsService.findOneById(datasetId);
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        const application = await this.applicationService.findOne({
            where: { id: applicationId, datasetId },
        });
        if (!application) throw HttpErrorFactory.notFound("申请记录不存在");
        if (application.status !== MemberApplicationStatus.PENDING)
            throw HttpErrorFactory.badRequest("该申请已处理，无法重复操作");
        await this.applicationService.updateById(applicationId, {
            status: MemberApplicationStatus.REJECTED,
            reviewedBy: user.id,
            reviewedAt: new Date(),
            rejectReason: dto.rejectReason ?? null,
        });
        return { success: true };
    }
}
