import { getCachedExtensionList } from "@buildingai/core/modules";
import { HttpErrorFactory } from "@buildingai/errors";
import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import type { Request } from "express";

/**
 * 插件名称守卫
 *
 * 用于验证请求中的插件名称参数是否对应一个真实存在的插件
 */
@Injectable()
export class ExtensionGuard implements CanActivate {
    private readonly logger = new Logger(ExtensionGuard.name);

    // 静态属性，用于在其他地方访问插件映射关系
    private static instance: ExtensionGuard;

    constructor() {
        // 保存实例引用，用于静态方法访问
        if (!ExtensionGuard.instance) {
            ExtensionGuard.instance = this;
        }
    }

    /**
     * 验证请求中的插件包名是否有效
     *
     * @param context 执行上下文
     * @returns 是否允许访问
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();

        // 允许访问主应用的 API 路由
        if (
            request.path.startsWith(process.env.VITE_APP_CONSOLE_API_PREFIX || "/console") ||
            request.path.startsWith(process.env.VITE_APP_WEB_API_PREFIX || "/web")
        ) {
            return true;
        }

        if (request.path.startsWith("/extensions/")) {
            return true;
        }

        // 获取插件列表
        const extensionList = await getCachedExtensionList();
        const enabledExtensions = extensionList.filter((extension) => extension.enabled);

        const extensionPackName = request.path.split("/")[1];

        if (enabledExtensions.some((extension) => extension.name === extensionPackName)) {
            return true;
        } else {
            this.logger.warn(`路由不存在或者尝试访问无效的插件，插件包名为: ${extensionPackName}`);
            throw HttpErrorFactory.notFound("The requested path does not exist.");
        }
    }
}
