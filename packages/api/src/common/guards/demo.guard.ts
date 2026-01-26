import { HttpErrorFactory } from "@buildingai/errors";
import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import type { Request } from "express";

/**
 * Demo Environment Guard
 *
 * Intercepts all POST requests in demo environment, only allows whitelisted endpoints
 */
@Injectable()
export class DemoGuard implements CanActivate {
    private readonly logger = new Logger(DemoGuard.name);
    private readonly isDemoEnv: boolean;
    private readonly whitelist: string[];

    constructor() {
        // Check if demo environment is enabled
        this.isDemoEnv = process.env.SERVER_IS_DEMO_ENV === "true";

        // Read whitelist from environment variable, supports multiple paths separated by commas
        const whitelistEnv = process.env.SERVER_DEMO_POST_WHITELIST || "";
        this.whitelist = whitelistEnv
            .split(",")
            .map((path) => path.trim())
            .filter((path) => path.length > 0);

        if (this.isDemoEnv) {
            this.logger.log(
                `Demo environment enabled, POST request whitelist: ${this.whitelist.length > 0 ? this.whitelist.join(", ") : "none"}`,
            );
        }
    }

    /**
     * Verify if the request is allowed to pass
     *
     * @param context Execution context
     * @returns Whether access is allowed
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // If not in demo environment, allow all requests
        if (!this.isDemoEnv) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();

        // Only intercept POST requests
        if (request.method === "GET") {
            return true;
        }

        // Get request path (excluding query parameters)
        const requestPath = request.path;

        // Check if path is in whitelist
        const isWhitelisted = this.whitelist.some((whitelistPath) => {
            // Support exact match and prefix match
            return requestPath === whitelistPath || requestPath.startsWith(whitelistPath + "/");
        });

        if (isWhitelisted) {
            this.logger.debug(`Allowed POST request: ${request.method} ${requestPath}`);
            return true;
        }

        // Not in whitelist, reject request
        this.logger.warn(
            `Blocked POST request in demo environment: ${request.method} ${requestPath}`,
        );
        throw HttpErrorFactory.forbidden("演示环境不支持此操作，请自行部署尝试");
    }
}
