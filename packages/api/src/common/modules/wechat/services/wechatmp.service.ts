import { LOGIN_TYPE, UserTerminal, type UserTerminalType } from "@buildingai/constants";
import { User } from "@buildingai/db/entities/user.entity";
import { FindOptionsWhere } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { isEnabled } from "@buildingai/utils";
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
     * 通过 code 换取微信标识（openid、unionid），然后自动登录或注册用户。
     * 登录策略：
     * 1. 优先使用 unionid 查找用户（如果存在，说明已绑定微信开放平台）
     * 2. 如果 unionid 不存在，使用 mpOpenid（小程序的 openid）作为兜底方案
     * 3. 如果用户已存在则直接登录，不存在则自动注册
     *
     * @param jsCode 登录时获取的 code，可通过 wx.login() 获取
     * @param terminal 登录终端，可选，默认为 MP（小程序）
     * @param ipAddress IP地址，可选
     * @param userAgent 用户代理，可选
     * @returns 登录结果，包含用户信息、token 和 isNewUser 标识
     * @throws 当获取 openid 失败、注册功能关闭或登录失败时抛出错误
     */
    async loginOrRegister(
        jsCode: string,
        terminal: UserTerminalType = UserTerminal.MP,
        ipAddress?: string,
        userAgent?: string,
    ) {
        try {
            // 步骤1: 通过 code 换取微信标识
            // openid: 小程序用户的唯一标识
            // unionid: 微信开放平台统一标识（如果小程序已绑定开放平台）
            const { openid, unionid } = await this.jscode2session(jsCode);

            // 验证至少获取到 openid
            if (!openid) {
                throw HttpErrorFactory.internal("获取 openid 失败");
            }

            // 步骤2: 根据是否有 unionid 采用不同的查找策略
            let existingUser: User | null = null;

            if (unionid) {
                // 场景A: 有 unionid（已绑定微信开放平台）
                // 优先使用 unionid 查找用户，因为它是跨平台统一标识
                const whereCondition: FindOptionsWhere<User> = { unionid };
                existingUser = await this.authService.findOne({
                    where: whereCondition,
                });
            } else {
                // 场景B: 没有 unionid（未绑定微信开放平台）
                // 使用 mpOpenid 查找用户（注意：这里 openid 实际是小程序的 openid，应作为 mpOpenid 使用）
                const whereCondition: FindOptionsWhere<User> = { mpOpenid: openid };
                existingUser = await this.authService.findOne({
                    where: whereCondition,
                });
            }

            // 步骤3: 处理用户已存在的情况（登录流程）
            if (existingUser) {
                if (!isEnabled(existingUser.status)) {
                    throw HttpErrorFactory.business("账号已被停用，请联系管理员处理");
                }
                // 更新用户的小程序 openid（如果缺失）
                // 这可以确保用户在不同场景下都能被正确识别
                if (!existingUser.mpOpenid) {
                    await this.authService.updateById(existingUser.id, { mpOpenid: openid });
                }

                // 如果用户有 unionid 但数据库中没有，则更新（这种情况理论上不应该发生，但为了数据一致性）
                if (unionid && !existingUser.unionid) {
                    await this.authService.updateById(existingUser.id, { unionid });
                }

                // 执行登录
                const result = await this.authService.loginByUser(
                    existingUser,
                    terminal,
                    ipAddress,
                    userAgent,
                );

                return { ...result.user, isNewUser: false };
            }

            // 步骤4: 处理用户不存在的情况（注册流程）
            // 检查是否允许微信注册
            await this.checkWechatRegisterAllowed();

            // 注册新用户
            // 注意：小程序的 openid 应存储在 mpOpenid 字段中（而不是 openid 字段）
            // openid 字段用于存储公众号的 openid
            const result = await this.authService.registerByWechat(
                { mpOpenid: openid },
                terminal,
                ipAddress,
                userAgent,
            );

            // 如果有 unionid，注册后需要更新用户的 unionid
            // unionid 是微信开放平台的统一标识，用于跨平台用户识别
            if (unionid) {
                await this.authService.updateById(result.user.id, { unionid });
            }

            return { ...result.user, isNewUser: true };
        } catch (error) {
            // 如果是业务错误（如注册功能关闭），直接抛出
            if (error.status && error.status >= 400 && error.status < 500) {
                throw error;
            }

            // 其他错误记录日志并包装
            this.logger.error(`小程序登录失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.internal(`小程序登录失败: ${error.message}`);
        }
    }

    /**
     * 检查是否允许微信注册
     *
     * @throws 如果注册功能已关闭，抛出禁止访问错误
     */
    private async checkWechatRegisterAllowed(): Promise<void> {
        const loginSettings = await this.getLoginSettings();

        if (
            !loginSettings.allowedRegisterMethods ||
            !loginSettings.allowedRegisterMethods.includes(LOGIN_TYPE.WECHAT)
        ) {
            throw HttpErrorFactory.forbidden("注册功能已关闭，请联系管理员处理");
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
        const { openid, unionid } = await this.jscode2session(code);
        if (!openid) {
            throw HttpErrorFactory.internal("获取 openid 失败");
        }
        const user = await this.authService.findOne({ where: { id: userId } });
        if (!user) {
            throw HttpErrorFactory.badRequest("用户不存在");
        }
        // if (user.mpOpenid) {
        //     throw HttpErrorFactory.badRequest("用户已绑定微信");
        // }
        // 检查该 openid 是否已被其他用户使用
        const existingUser = await this.authService.findOne({
            where: { mpOpenid: openid },
        });
        if (existingUser && existingUser.id !== userId) {
            throw HttpErrorFactory.badRequest("该微信账号已被其他用户绑定");
        }
        // 更新用户的 openid unionid
        await this.authService.updateById(userId, { mpOpenid: openid });
        if (unionid) {
            await this.authService.updateById(userId, { unionid });
        }
        return { message: "success" };
    }
}
