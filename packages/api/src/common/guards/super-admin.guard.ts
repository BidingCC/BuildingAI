import { getContextPlayground } from "@buildingai/db";
import { SUPER_ADMIN_ONLY_KEY } from "@buildingai/decorators/super-admin-only.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { getOverrideMetadata, isEnabled } from "@buildingai/utils";
import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

/**
 * Super admin guard
 *
 * Verifies that the user is a super administrator before allowing access to the route
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
    private readonly logger = new Logger(SuperAdminGuard.name);

    constructor(private reflector: Reflector) {}

    /**
     * Verify if the user is a super administrator
     *
     * @param context Execution context
     * @returns Whether access is allowed
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if the route requires super admin access
        const requiresSuperAdmin = getOverrideMetadata<boolean>(
            this.reflector,
            SUPER_ADMIN_ONLY_KEY,
            context,
        );

        // If super admin is not required, allow access
        if (!requiresSuperAdmin) {
            return true;
        }

        const { request, user } = getContextPlayground(context);

        // Ensure user is authenticated
        if (!user) {
            this.logger.warn(
                `Attempted to access super admin only route without authentication: ${request.method} ${request.url}`,
            );
            throw HttpErrorFactory.unauthorized("Unauthorized access");
        }

        // Check if user is a super administrator
        if (!isEnabled(user.isRoot)) {
            this.logger.warn(
                `User ${user.username} (ID: ${user.id}) attempted to access super admin only route: ${request.method} ${request.url}`,
            );
            throw HttpErrorFactory.forbidden(
                "Access denied. Super administrator privileges required",
            );
        }

        return true;
    }
}
