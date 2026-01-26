import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { HttpErrorFactory } from "@buildingai/errors";
import { getOverrideMetadata } from "@buildingai/utils";
import { DECORATOR_KEYS } from "@common/constants/decorators-key.constant";
import { AuthService } from "@common/modules/auth/services/auth.service";
import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";

/**
 * Custom response header for new token after sliding refresh
 */
const NEW_TOKEN_HEADER = "x-new-token";

/**
 * 统一认证守卫
 *
 * 根据请求路径自动选择合适的认证服务，验证请求中的JWT令牌，确保用户已登录
 * 并将客户端类型信息添加到用户对象中，与客户端类型守卫配合使用
 * 支持 token 滑动刷新：当 token 接近过期时自动续签并通过响应头返回新 token
 */
@Injectable()
export class AuthGuard implements CanActivate {
    private readonly logger = new Logger(AuthGuard.name);

    constructor(
        private AuthService: AuthService,
        private reflector: Reflector,
    ) {}

    /**
     * 验证用户是否有权限访问路由
     *
     * @param context 执行上下文
     * @returns 是否允许访问
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        const isPublic = getOverrideMetadata<boolean>(
            this.reflector,
            DECORATOR_KEYS.IS_PUBLIC_KEY,
            context,
        );

        const validateTokenRes = await this.AuthService.validateToken(token);

        if (isPublic) {
            if (validateTokenRes.user) {
                request["user"] = validateTokenRes.user;
            }
            return true;
        }

        if (!token) {
            this.logger.warn(`No authentication token provided: ${request.method} ${request.url}`);
            throw HttpErrorFactory.unauthorized("Please login first");
        }

        if (!validateTokenRes.isValid) {
            this.logger.warn(
                `Invalid authentication token: ${request.method} ${request.url}`,
                validateTokenRes.error,
            );

            switch (validateTokenRes.errorType) {
                case "TokenExpiredError":
                    throw HttpErrorFactory.unauthorized(
                        "Login session has expired",
                        null,
                        BusinessCode.TOKEN_EXPIRED,
                    );
                case "JsonWebTokenError":
                    throw HttpErrorFactory.unauthorized(
                        "Invalid authentication token",
                        null,
                        BusinessCode.TOKEN_INVALID,
                    );
                case "NotBeforeError":
                    throw HttpErrorFactory.unauthorized(
                        "Authentication token not yet valid",
                        null,
                        BusinessCode.TOKEN_INVALID,
                    );
                default:
                    throw HttpErrorFactory.unauthorized(
                        validateTokenRes.error || "Invalid authentication token",
                        null,
                        BusinessCode.TOKEN_INVALID,
                    );
            }
        }

        request["user"] = validateTokenRes.user;

        // Sliding refresh: check if token needs refresh and set new token in response header
        if (validateTokenRes.tokenRecord && validateTokenRes.user) {
            const response = context.switchToHttp().getResponse<Response>();
            await this.handleTokenRefresh(
                token,
                validateTokenRes.tokenRecord,
                validateTokenRes.user,
                response,
            );
        }

        this.logger.log(
            `用户 ${validateTokenRes.user?.username || validateTokenRes.user?.id} 已登录`,
        );

        return true;
    }

    /**
     * 从请求头中提取令牌
     *
     * @param request 请求对象
     * @returns 提取的令牌
     */
    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : undefined;
    }

    /**
     * Handle token sliding refresh
     */
    private async handleTokenRefresh(
        token: string,
        tokenRecord: NonNullable<
            Awaited<ReturnType<typeof this.AuthService.validateToken>>["tokenRecord"]
        >,
        user: NonNullable<Awaited<ReturnType<typeof this.AuthService.validateToken>>["user"]>,
        response: Response,
    ): Promise<void> {
        try {
            const refreshResult = await this.AuthService.userTokenService.refreshTokenIfNeeded(
                token,
                tokenRecord,
                {
                    id: user.id,
                    username: user.username,
                    isRoot: user.isRoot,
                    terminal: user.terminal,
                },
            );

            if (refreshResult) {
                response.setHeader(NEW_TOKEN_HEADER, refreshResult.newToken);
                response.setHeader("Access-Control-Expose-Headers", NEW_TOKEN_HEADER);
                response.setHeader("Cache-Control", "no-store");
                this.logger.log(`Token refreshed for user ${user.id}`);
            }
        } catch (err) {
            this.logger.warn(`Token refresh failed: ${(err as Error).message}`);
        }
    }
}
