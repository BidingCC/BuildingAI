import { TEAM_ROLE } from "@buildingai/constants/shared/team-role.constants";
import { TEAM_ROLE_PERMISSIONS } from "@buildingai/constants/shared/team-role.constants";
import { getContextPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsDocument, DatasetsSegments } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { isEnabled } from "@buildingai/utils";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { DatasetMemberService } from "../services/datasets-member.service";

/**
 * 知识库权限装饰器元数据键
 */
export const DATASET_PERMISSION_KEY = "dataset_permission";

/**
 * 资源类型枚举
 */
export enum ResourceType {
    DOCUMENT = "document",
    SEGMENT = "segment",
}

/**
 * 知识库权限选项
 */
export interface DatasetPermissionOptions {
    /**
     * 权限代码
     */
    permission: keyof (typeof TEAM_ROLE_PERMISSIONS)[keyof typeof TEAM_ROLE_PERMISSIONS];

    /**
     * 数据集ID参数名（默认为 'datasetId'）
     */
    datasetIdParam?: string;

    /**
     * 是否检查资源所有权（编辑者只能操作自己创建的资源）
     */
    checkOwnership?: boolean;

    /**
     * 资源类型（用于检查所有权）
     */
    resourceType?: ResourceType;

    /**
     * 资源ID参数名（用于所有权检查，默认为 'documentId'）
     */
    resourceIdParam?: string;
}

/**
 * 知识库权限装饰器
 */
export const DatasetPermission = (options: DatasetPermissionOptions) => {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        Reflect.defineMetadata(DATASET_PERMISSION_KEY, options, descriptor.value);
        return descriptor;
    };
};

/**
 * 知识库权限守卫
 *
 * 验证用户是否具有在特定知识库中执行操作的权限；未加 @DatasetPermission 的接口不校验。
 */
@Injectable()
export class DatasetPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly datasetMemberService: DatasetMemberService,
        @InjectRepository(DatasetsDocument)
        private readonly documentRepository: Repository<DatasetsDocument>,
        @InjectRepository(DatasetsSegments)
        private readonly segmentsRepository: Repository<DatasetsSegments>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const permissionOptions = this.reflector.get<DatasetPermissionOptions>(
            DATASET_PERMISSION_KEY,
            context.getHandler(),
        );

        if (!permissionOptions) {
            return true;
        }

        const { request, user } = getContextPlayground(context);
        if (!user) {
            throw HttpErrorFactory.unauthorized("未授权访问");
        }

        if (isEnabled(user.isRoot)) {
            return true;
        }

        const {
            permission,
            datasetIdParam = "datasetId",
            checkOwnership = false,
            resourceType,
            resourceIdParam = "documentId",
        } = permissionOptions;
        const datasetId = this.getParamFromRequest(request, datasetIdParam);

        if (!datasetId) {
            throw HttpErrorFactory.badRequest(`缺少参数: ${datasetIdParam}`);
        }

        try {
            await this.datasetMemberService.checkPermission(datasetId, user, permission);

            if (checkOwnership && resourceType) {
                await this.checkResourceOwnership(
                    request,
                    datasetId,
                    user.id,
                    resourceType,
                    resourceIdParam,
                );
            }

            return true;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw HttpErrorFactory.forbidden("没有权限执行此操作");
        }
    }

    private async checkResourceOwnership(
        request: Request,
        datasetId: string,
        userId: string,
        resourceType: ResourceType,
        resourceIdParam: string,
    ): Promise<void> {
        const role = await this.datasetMemberService.getMemberRole(datasetId, userId);
        if (role === TEAM_ROLE.OWNER || role === TEAM_ROLE.MANAGER) {
            return;
        }
        if (role === TEAM_ROLE.EDITOR) {
            const resourceId = this.getParamFromRequest(request, resourceIdParam);
            if (!resourceId) {
                throw HttpErrorFactory.badRequest(
                    `缺少${this.getResourceName(resourceType)}ID参数: ${resourceIdParam}`,
                );
            }
            const isOwner = await this.checkResourceOwner(resourceId, userId, resourceType);
            if (!isOwner) {
                throw HttpErrorFactory.forbidden(
                    `编辑者只能操作自己创建的${this.getResourceName(resourceType)}`,
                );
            }
        }
    }

    private getResourceName(resourceType: ResourceType): string {
        return resourceType === ResourceType.DOCUMENT ? "文档" : "分段";
    }

    private async checkResourceOwner(
        resourceId: string,
        userId: string,
        resourceType: ResourceType,
    ): Promise<boolean> {
        if (resourceType === ResourceType.DOCUMENT) {
            const document = await this.documentRepository.findOne({
                where: { id: resourceId },
                select: ["createdBy"],
            });
            return document?.createdBy === userId;
        }
        const segment = await this.segmentsRepository.findOne({
            where: { id: resourceId },
            select: ["documentId"],
        });
        if (!segment) return false;
        const document = await this.documentRepository.findOne({
            where: { id: segment.documentId },
            select: ["createdBy"],
        });
        return document?.createdBy === userId;
    }

    private getParamFromRequest(request: Request, paramName: string): string | undefined {
        return (
            request.params?.[paramName] ||
            (request.query?.[paramName] as string) ||
            request.body?.[paramName]
        );
    }
}
