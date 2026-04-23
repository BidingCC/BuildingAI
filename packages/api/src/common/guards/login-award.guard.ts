import { getContextPlayground } from "@buildingai/db";
import { UserAwardService } from "@common/modules/auth/services/user-award.service";
import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";

/**
 *
 */
@Injectable()
export class LoginAwardGuard implements CanActivate {
    private readonly logger = new Logger(LoginAwardGuard.name);

    constructor(
        // private reflector: Reflector,
        private readonly userAwardService: UserAwardService,
    ) {}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { user } = getContextPlayground(context);
        if (!user?.id) {
            return true;
        }
        await this.userAwardService.loginAward(user.id);
        return true;
    }
}
