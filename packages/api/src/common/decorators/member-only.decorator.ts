import { DECORATOR_KEYS } from "@buildingai/constants";
import { applyDecorators, SetMetadata } from "@nestjs/common";

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
 * 会员专属功能装饰器
 *
 * 用于标记需要特定会员等级才能访问的路由或控制器
 * 功能的会员等级配置从 extension_feature 表中读取
 *
 * @param options 功能配置选项
 * @returns 装饰器
 *
 * @example
 * ```typescript
 * // 在方法上使用
 * @Get('advanced-feature')
 * @MemberOnly({
 *     code: 'blog:advanced-feature',
 *     name: '高级功能',
 *     description: '高级功能描述'
 * })
 * getAdvancedFeature() {
 *   return this.service.getAdvancedFeature();
 * }
 *
 * // 在控制器上使用，对整个控制器的所有路由生效
 * @Controller('premium')
 * @MemberOnly({
 *     code: 'blog:premium-module',
 *     name: '高级模块',
 *     description: '高级模块描述'
 * })
 * export class PremiumController {
 *   // 所有路由都需要对应会员等级
 * }
 * ```
 *
 * @remarks
 * - 如果 extension_feature 表中没有配置该功能，则所有用户都可以访问
 * - 如果配置了功能但没有关联任何会员等级，则所有用户都可以访问
 * - 用户需要拥有配置的任意一个会员等级即可访问
 * - 超级管理员（isRoot）不受此限制
 */
export const MemberOnly = (...options: MemberOnlyOptions[]) => {
    const decorators = [SetMetadata(DECORATOR_KEYS.MEMBER_ONLY_KEY, options)];

    return applyDecorators(...decorators);
};
