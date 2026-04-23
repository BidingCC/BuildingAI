import { BaseController } from "@buildingai/base";
import { ConsoleController } from "@common/decorators";
import { Permissions } from "@common/decorators/permissions.decorator";
import { LoginAwardDto, RegisterAwardDto, SignAwardDto } from "@modules/award/dto/award-config.dto";
import { AwardService } from "@modules/award/services/award.service";
import { Body, Get, Post } from "@nestjs/common";

@ConsoleController("award", "奖励管理")
export class AwardController extends BaseController {
    constructor(private readonly awardService: AwardService) {
        super();
    }

    /**
     * 获取注册奖励配置
     * @returns 注册奖励配置信息
     */
    @Get("register-award")
    @Permissions({
        code: "get-register-award",
        name: "获取注册奖励配置",
        description: "获取注册奖励配置",
    })
    async getRegisterAward() {
        return await this.awardService.getRegisterAward();
    }

    /**
     * 设置注册奖励配置
     * @returns 设置奖励配置信息
     */
    @Post("register-award")
    @Permissions({
        code: "set-register-award",
        name: "设置注册奖励配置",
        description: "设置注册奖励配置",
    })
    async setRegisterAward(@Body() registerAward: RegisterAwardDto) {
        return await this.awardService.setRegisterAward(registerAward);
    }

    /**
     * 获取设置登录奖励配置
     * @returns 登录配置信息
     */
    @Get("login-award")
    @Permissions({
        code: "get-login-award",
        name: "获取登录奖励配置",
        description: "获取登录奖励配置",
    })
    async getLoginAward() {
        return await this.awardService.getLoginAward();
    }

    /**
     * 设置登录奖励配置
     * @returns 设置奖励配置信息
     */
    @Post("login-award")
    @Permissions({
        code: "set-login-award",
        name: "设置登录奖励配置",
        description: "设置登录奖励配置",
    })
    async setLoginAward(@Body() loginAward: LoginAwardDto) {
        return await this.awardService.setLoginAward(loginAward);
    }

    /**
     * 获取签到奖励配置
     * @returns 签到奖励配置信息
     */
    @Get("sign-award")
    @Permissions({
        code: "get-sign-award",
        name: "获取签到奖励配置",
        description: "获取签到奖励配置",
    })
    async getSignAward() {
        return await this.awardService.getSignAward();
    }

    /**
     * 设置签到奖励配置
     * @returns 设置签到奖励配置信息
     */
    @Post("sign-award")
    @Permissions({
        code: "set-sign-award",
        name: "设置签到奖励配置",
        description: "设置签到奖励配置",
    })
    async setSignAward(@Body() signAward: SignAwardDto) {
        return await this.awardService.setSignAward(signAward);
    }
}
