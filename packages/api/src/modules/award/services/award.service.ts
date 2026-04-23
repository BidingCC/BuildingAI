import { BaseService } from "@buildingai/base";
import { RedisService } from "@buildingai/cache";
import { Dict } from "@buildingai/db/entities";
import { MembershipLevels } from "@buildingai/db/entities";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { UserAwardService } from "@common/modules/auth/services/user-award.service";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { LOGIN_CONFIG_CACHE_PREFIX } from "../constants/award-config.constants";
import { LoginAwardDto, RegisterAwardDto, SignAwardDto } from "../dto/award-config.dto";

@Injectable()
export class AwardService extends BaseService<Dict> {
    constructor(
        private readonly dictService: DictService,
        private readonly cacheService: RedisService,
        private readonly userAwardService: UserAwardService,
        @InjectRepository(Dict) repository: Repository<Dict>,
        @InjectRepository(MembershipLevels)
        private readonly membershipLevelsRepository: Repository<MembershipLevels>,
    ) {
        super(repository);
    }

    /**
     * 获取注册奖励配置
     * @returns 注册奖励配置信息
     */
    async getRegisterAward() {
        return {
            status: await this.dictService.get("registerAwardStatus", 1, "award"),
            registerAward: await this.dictService.get("registerAward", 20, "award"),
        };
    }

    /**
     * 设置注册奖励配置
     * @returns 设置奖励配置信息
     */
    async setRegisterAward(registerAwardDto: RegisterAwardDto) {
        await this.dictService.set("registerAwardStatus", registerAwardDto.status, {
            group: "award",
        });
        await this.dictService.set("registerAward", registerAwardDto.registerAward, {
            group: "award",
        });

        return true;
    }

    /**
     * 获取登录奖励配置
     * @returns 登录奖励配置信息
     */
    async getLoginAward() {
        const config = await this.userAwardService.getLoginAwardDefaultConfig();
        return {
            status: config.status,
            loginAward: config.loginAward,
        };
    }

    /**
     * 获取登录奖励配置
     * @returns 登录奖励配置信息
     */
    async setLoginAward(loginAwardDto: LoginAwardDto) {
        const loginAward = loginAwardDto.loginAward;
        const lists = await this.membershipLevelsRepository.find({
            select: ["id", "name", "level"],
            order: {
                level: "ASC",
            },
        });
        for (const item of lists) {
            const awardConfig = loginAward.find((award) => award.id === String(item.id));
            if (!awardConfig) {
                throw HttpErrorFactory.badRequest(`请设置${item.name}的奖励`);
            }
        }
        await this.dictService.set("loginAwardStatus", loginAwardDto.status, {
            group: "award",
        });
        await this.dictService.set("loginAward", loginAward, {
            group: "award",
        });
        // 设置缓存
        await this.cacheService.set(LOGIN_CONFIG_CACHE_PREFIX, JSON.stringify(loginAwardDto));
        return true;
    }

    /**
     * 获取签到奖励配置
     * @returns 签到奖励配置信息
     */
    async getSignAward() {
        return {
            status: await this.dictService.get("signAwardStatus", 1, "award"),
            signAward: await this.dictService.get("signAward", 10, "award"),
        };
    }

    /**
     * 设置签到奖励配置
     * @returns 设置签到奖励配置信息
     */
    async setSignAward(signAwardDto: SignAwardDto) {
        await this.dictService.set("signAwardStatus", signAwardDto.status, {
            group: "award",
        });
        await this.dictService.set("signAward", signAwardDto.signAward, {
            group: "award",
        });
        return true;
    }
}
