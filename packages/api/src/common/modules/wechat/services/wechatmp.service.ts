import { LOGIN_TYPE, UserTerminal, type UserTerminalType } from "@buildingai/constants";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { WechatMpJscode2sessionResponse } from "@buildingai/wechat-sdk/interfaces/mp";
import { AuthService } from "@common/modules/auth/services/auth.service";
import { LoginSettingsConfig } from "@modules/user/dto/login-settings.dto";
import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";

import { WechatMpClientFactory } from "./mpfactory.service";

/**
 * 微信小程序服务
 *
 * 提供微信小程序相关的业务功能，包括：
 * - 通过code换取openid和session_key
 * - 小程序登录/注册
 * - 配置管理
 */
@Injectable()
export class WechatMpService {
    private readonly logger = new Logger(WechatMpService.name);

    /**
     * 构造函数
     *
     * @param wechatMpClientFactory 微信小程序客户端工厂
     * @param authService 认证服务
     * @param dictService 字典服务
     */
    constructor(
        private readonly wechatMpClientFactory: WechatMpClientFactory,
        private readonly authService: AuthService,
        private readonly dictService: DictService,
    ) {}

    /**
     * 通过code换取openid和session_key
     *
     * 登录凭证校验。通过 wx.login() 接口获得临时登录凭证 code 后传到开发者服务器
     * 调用此接口完成 code 换取 openid 和 session_key 等信息
     *
     * @param jsCode 登录时获取的 code，可通过 wx.login() 获取
     * @returns 包含 openid、session_key 和 unionid（可选）的对象
     * @throws 当API调用失败时抛出错误
     */
    async jscode2session(jsCode: string): Promise<WechatMpJscode2sessionResponse> {
        try {
            // 获取微信小程序客户端实例
            const client = await this.wechatMpClientFactory.getClient();

            // 调用客户端方法获取 openid 和 session_key
            const result = await client.jscode2session(jsCode);

            return result;
        } catch (error) {
            throw HttpErrorFactory.internal(`获取 openid 失败: ${error.message}`);
        }
    }

    /**
     * 小程序登录/注册
     *
     * 通过 code 换取 openid，然后自动登录或注册用户
     * 如果用户已存在则直接登录，不存在则自动注册
     *
     * @param jsCode 登录时获取的 code，可通过 wx.login() 获取
     * @param terminal 登录终端，可选，默认为 MP（小程序）
     * @param ipAddress IP地址，可选
     * @param userAgent 用户代理，可选
     * @returns 登录结果，包含用户信息和token
     * @throws 当获取 openid 失败或登录失败时抛出错误
     */
    async loginOrRegister(
        jsCode: string,
        terminal: UserTerminalType = UserTerminal.MP,
        ipAddress?: string,
        userAgent?: string,
    ) {
        try {
            // 通过 code 换取 openid 和 session_key
            const { openid } = await this.jscode2session(jsCode);

            if (!openid) {
                throw HttpErrorFactory.internal("获取 openid 失败");
            }
            const existingUser = await this.authService.findOne({
                where: { openid },
            });
            if (existingUser) {
                const result = await this.authService.loginOrRegisterByOpenid(
                    openid,
                    terminal,
                    ipAddress,
                    userAgent,
                );
                return { ...result.user, isNewUser: false };
            }
            const loginSettings = await this.getLoginSettings();

            if (
                !loginSettings.allowedRegisterMethods ||
                !loginSettings.allowedRegisterMethods.includes(LOGIN_TYPE.WECHAT)
            ) {
                // 微信注册已关闭
                throw HttpErrorFactory.forbidden("注册功能已关闭，请联系管理员处理");
            }
            const result = await this.authService.loginOrRegisterByOpenid(
                openid,
                terminal,
                ipAddress,
                userAgent,
            );

            return { ...result.user, isNewUser: true };
        } catch (error) {
            this.logger.error(`小程序登录失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.internal(`小程序登录失败: ${error.message}`);
        }
    }

    /**
     * 获取登录设置配置
     *
     * @returns 登录设置配置
     */
    private async getLoginSettings(): Promise<LoginSettingsConfig> {
        return await this.dictService.get<LoginSettingsConfig>(
            "login_settings",
            this.getDefaultLoginSettings(),
            "auth",
        );
    }

    /**
     * 获取默认登录设置配置
     *
     * @returns 默认的登录设置配置
     */
    private getDefaultLoginSettings(): LoginSettingsConfig {
        return {
            allowedLoginMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.WECHAT],
            allowedRegisterMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.WECHAT],
            defaultLoginMethod: LOGIN_TYPE.ACCOUNT,
            allowMultipleLogin: false,
            showPolicyAgreement: true,
        };
    }

    /**
     * 绑定微信
     * @param code 微信小程序登录凭证 code
     * @param userId 用户ID
     * @returns
     */
    async bindWechat(code: string, userId: string) {
        const { openid } = await this.jscode2session(code);
        if (!openid) {
            throw HttpErrorFactory.internal("获取 openid 失败");
        }
        const user = await this.authService.findOne({ where: { id: userId } });
        if (!user) {
            throw HttpErrorFactory.badRequest("用户不存在");
        }
        if (user.openid) {
            throw HttpErrorFactory.badRequest("用户已绑定微信");
        }
        // 检查该 openid 是否已被其他用户使用
        const existingUser = await this.authService.findOne({
            where: { openid },
        });
        if (existingUser && existingUser.id !== userId) {
            throw HttpErrorFactory.badRequest("该微信账号已被其他用户绑定");
        }
        // 更新用户的 openid
        await this.authService.updateById(userId, { openid });
        return { message: "success" };
    }
}
