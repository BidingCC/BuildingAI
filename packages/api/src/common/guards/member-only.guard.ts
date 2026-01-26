import { BusinessCode, DECORATOR_KEYS } from "@buildingai/constants";
import { getContextPlayground } from "@buildingai/db";
import { HttpErrorFactory } from "@buildingai/errors";
import { getOverrideMetadata, isEnabled } from "@buildingai/utils";
import { ExtensionFeatureService } from "@common/modules/auth/services/extension-feature.service";
import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

/**
 * 会员专属功能选项接口
 */
export interface MemberOnlyOptions {
    /**
     * 功能编码
     */
    code: string;

    /**
     * 功能名称
     */
    name: string;

    /**
     * 功能描述
     */
    description?: string;
}

/**
 * 会员专属功能守卫
 *
 * 验证用户是否具有访问特定功能所需的会员等级
 *
 * @remarks
 * - 如果功能未配置会员等级限制，允许所有用户访问
 * - 如果功能配置了会员等级，用户需要拥有其中任意一个等级才能访问
 * - 超级管理员（isRoot）不受此限制
 */
@Injectable()
export class MemberOnlyGuard implements CanActivate {
    private readonly logger = new Logger(MemberOnlyGuard.name);

    constructor(
        private reflector: Reflector,
        private extensionFeatureService: ExtensionFeatureService,
    ) {}

    /**
     * 验证用户是否具有所需的会员等级
     *
     * @param context 执行上下文
     * @returns 是否允许访问
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 获取路由所需的功能配置
        const memberOnlyMetadata = getOverrideMetadata<MemberOnlyOptions[]>(
            this.reflector,
            DECORATOR_KEYS.MEMBER_ONLY_KEY,
            context,
        );

        // 如果没有设置 @MemberOnly 装饰器，则允许访问
        if (!memberOnlyMetadata || memberOnlyMetadata.length === 0) {
            return true;
        }

        const { request, user } = getContextPlayground(context);

        // 确保用户已认证
        if (!user) {
            this.logger.warn(
                `尝试访问需要会员权限的路由，但用户未认证: ${request.method} ${request.url}`,
            );
            throw HttpErrorFactory.unauthorized("未授权访问");
        }

        // 超级管理员不受限制
        if (isEnabled(user.isRoot)) {
            return true;
        }

        // 提取所有功能编码
        const featureCodes = memberOnlyMetadata.map((item) => item.code);

        // 检查用户是否有权限访问所有功能（需要满足所有功能的会员等级要求）
        for (const featureCode of featureCodes) {
            const canAccess = await this.extensionFeatureService.checkUserCanAccessFeature(
                user.id,
                featureCode,
            );

            if (!canAccess) {
                // 获取所需的会员等级名称，用于错误提示
                const requiredLevelNames =
                    await this.extensionFeatureService.getFeatureRequiredLevelNames(featureCode);

                // 获取功能名称用于日志
                const featureOption = memberOnlyMetadata.find((item) => item.code === featureCode);
                const featureName = featureOption?.name || featureCode;

                this.logger.warn(
                    `用户 ${user.username} (ID: ${user.id}) 尝试访问功能 [${featureName}]，` +
                        `需要会员等级 [${requiredLevelNames.join(", ")}]，但用户会员等级不足`,
                );

                throw HttpErrorFactory.forbidden(
                    `该功能需要 ${requiredLevelNames.join(" 或 ")} 会员才能使用`,
                    BusinessCode.MEMBERSHIP_LEVEL_INSUFFICIENT,
                );
            }
        }

        return true;
    }
}
