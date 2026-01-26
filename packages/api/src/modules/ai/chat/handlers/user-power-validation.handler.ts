import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { AiModel } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

/**
 * User Power Validation Command Handler
 *
 * Handles user power (积分) validation and retrieval.
 */
@Injectable()
export class UserPowerValidationCommandHandler {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    /**
     * Get and validate user power
     *
     * @param userId - User ID
     * @param model - AI Model
     * @returns User entity
     * @throws HttpErrorFactory.badRequest if user not found or insufficient power
     */
    async getAndValidateUserPower(userId: string, model: AiModel): Promise<User> {
        const userInfo = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!userInfo) {
            throw HttpErrorFactory.badRequest("User not found.");
        }

        // Check if user has sufficient power
        if (userInfo.power <= 0 && model.billingRule.power > 0) {
            throw HttpErrorFactory.badRequest("余额不足，请充值后重试");
        }

        return userInfo;
    }
}
