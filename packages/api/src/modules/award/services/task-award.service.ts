import {
    ACCOUNT_LOG_SOURCE,
    ACCOUNT_LOG_TYPE,
} from "@buildingai/constants/shared/account-log.constants";
import { AppBillingService } from "@buildingai/core/modules";
import { type UserPlayground } from "@buildingai/db";
import {
    AccountLog,
    MembershipLevels,
    SignRecord,
    UserSubscription,
} from "@buildingai/db/entities";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { UserAwardService } from "@common/modules/auth/services/user-award.service";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, MoreThan, Repository } from "typeorm";

@Injectable()
export class TaskAwardService {
    constructor(
        @InjectRepository(SignRecord)
        private readonly signRecordRepository: Repository<SignRecord>,
        @InjectRepository(AccountLog)
        private readonly accountLogRepository: Repository<AccountLog>,
        @InjectRepository(UserSubscription)
        private readonly userSubscriptionRepository: Repository<UserSubscription>,
        @InjectRepository(MembershipLevels)
        private readonly membershipLevelsRepository: Repository<MembershipLevels>,
        private readonly appBillingService: AppBillingService,
        private readonly dictService: DictService,
        private readonly userAwardService: UserAwardService,
    ) {}
    /**
     * 积分奖励
     * @param user
     * @returns
     */
    async center(user: UserPlayground) {
        //签到奖励
        const signStatus = await this.dictService.get("signAwardStatus", 1, "award");
        const signAward = await this.dictService.get("signAward", 10, "award");
        //登录奖励
        const loginAwardConfig = await this.userAwardService.getLoginAward();
        const loginStatus = loginAwardConfig.status;
        const loginAward = loginAwardConfig.loginAward;
        //注册奖励
        const registerStatus = await this.dictService.get("registerAwardStatus", 1, "award");
        const registerAward = await this.dictService.get("registerAward", 20, "award");
        //是否签到、是否登录。
        let isSign = false;
        let isLogin = false;
        let isRegister = false;
        //今天时间范围
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(24, 0, 0, 0);
        const awardLists = [];
        //签到奖励
        if (signStatus) {
            const signRecord = await this.signRecordRepository.findOne({
                where: {
                    userId: user.id,
                    signTime: Between(start, end),
                },
            });
            if (signRecord) {
                isSign = true;
            }
            awardLists.push({
                type: "sign",
                name: "签到奖励",
                desc: "每天签到成功，可得" + signAward + "积分",
                award: signAward,
                isGet: isSign, //是否已经签到
            });
        }
        //登录奖励
        if (loginStatus) {
            const loginRecord = await this.accountLogRepository.findOne({
                where: {
                    userId: user.id,
                    createdAt: Between(start, end),
                    accountType: ACCOUNT_LOG_TYPE.LOGIN_AWARD_INC,
                },
            });
            if (loginRecord) {
                isLogin = true;
            }
            const loginAwardByLevel = await this.userAwardService.resolveLoginAward(
                user.id,
                loginAward,
            );
            if (loginAwardByLevel > 0) {
                awardLists.push({
                    type: "login",
                    name: "登录奖励",
                    desc: "每天登录，可得" + loginAwardByLevel + "积分",
                    award: loginAwardByLevel,
                    isGet: isLogin, //是否已经登录
                });
            }
        }
        //注册奖励
        if (registerStatus) {
            const loginRecord = await this.accountLogRepository.findOne({
                where: {
                    userId: user.id,
                    accountType: ACCOUNT_LOG_TYPE.REGISTER_AWARD_INC,
                },
            });
            if (loginRecord) {
                isRegister = true;
            }
            awardLists.push({
                type: "register",
                name: "新用户注册",
                desc: "完成注册，可得" + registerAward + "积分",
                award: registerAward,
                isGet: isRegister, //是否已经注册
            });
        }

        return awardLists;
    }
    /**
     * 用户签到
     * @param user
     */
    async sign(user: UserPlayground) {
        const status = await this.dictService.get("signAwardStatus", 1, "award");
        const signAward = await this.dictService.get("signAward", 10, "award");
        if (1 !== status || signAward <= 0) {
            throw HttpErrorFactory.notFound("每天签到活动未开启");
        }
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(24, 0, 0, 0);
        const signRecord = await this.signRecordRepository.findOne({
            where: {
                userId: user.id,
                signTime: Between(start, end),
            },
        });
        if (signRecord) {
            throw HttpErrorFactory.conflict("您已签到");
        }
        //用户增加积分、用户签到记录、记录签到表
        await this.signRecordRepository.manager.transaction(async (entityManager) => {
            // await entityManager.increment(User, { id: user.id }, "power", signAward);
            const signRecordEntity = entityManager.create(SignRecord, {
                userId: user.id,
                signTime: new Date(),
                signDate: start,
                signAward,
                terminal: user.terminal,
            });
            await entityManager.save(signRecordEntity);
            await this.appBillingService.addUserPower(
                {
                    userId: user.id,
                    amount: signAward,
                    accountType: ACCOUNT_LOG_TYPE.SIGN_AWARD_INC,
                    source: {
                        type: ACCOUNT_LOG_SOURCE.SIGN_AWARD,
                        source: "签到奖励",
                    },
                    remark: `签到奖励：${signAward}`,
                },
                entityManager,
            );
        });
    }
}
