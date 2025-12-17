import { RedisService } from "@buildingai/cache";
import { LOGIN_TYPE } from "@buildingai/constants";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { isEnabled } from "@buildingai/utils";
import { WechatOaClient } from "@buildingai/wechat-sdk";
import { ActionName } from "@buildingai/wechat-sdk/interfaces/os";
import { MsgType } from "@buildingai/wechat-sdk/interfaces/os";
import { AuthService } from "@common/modules/auth/services/auth.service";
import { WxOaConfigService } from "@modules/channel/services/wxoaconfig.service";
import { LoginSettingsConfig } from "@modules/user/dto/login-settings.dto";
import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

import { WECHAT_EVENTS, WECHAT_SCENE_PREFIX } from "../constants/wechat.constant";

/**
 * 微信公众号服务
 *
 * 提供微信公众号相关的业务功能，包括：
 * - 获取access_token（带Redis缓存）
 * - 生成二维码
 * - 配置管理
 * - 微信登录回调处理
 */
@Injectable()
export class WechatOaService {
    private readonly logger = new Logger(WechatOaService.name);

    /**
     * Redis缓存前缀
     * 用于存储微信access_token的缓存键前缀
     */
    private readonly CACHE_PREFIX = "wechat:access_token";

    /**
     * 场景值缓存前缀
     * 用于存储二维码场景值的缓存键前缀
     */
    private readonly SCENE_PREFIX = "wechat:scene";

    /**
     * 微信公众平台客户端实例
     * 用于调用微信API
     */
    wechatOaClient: WechatOaClient;

    /**
     * 构造函数
     *
     * @param wxoaconfigService 微信公众号配置服务
     * @param redisService Redis缓存服务
     * @param authService 认证服务
     * @param dictService 字典服务
     * @param eventEmitter 事件发射器
     */
    constructor(
        private readonly wxoaconfigService: WxOaConfigService,
        private readonly redisService: RedisService,
        private readonly authService: AuthService,
        private readonly dictService: DictService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * 获取微信access_token
     *
     * 优先从Redis缓存获取，如果缓存不存在或已过期则重新请求微信API
     * access_token是调用微信公众平台API的全局唯一接口调用凭据
     *
     * @returns access_token字符串
     * @throws 当配置不存在或API调用失败时抛出错误
     */
    private async getAccessToken(): Promise<string> {
        // 从配置服务获取微信公众号的appId和appSecret
        const { appId, appSecret, token, encodingAESKey } =
            await this.wxoaconfigService.getConfig();

        // 初始化微信客户端
        this.wechatOaClient = new WechatOaClient(token, encodingAESKey, appId);

        const { access_token } = await this.wechatOaClient.getAccessToken(appId, appSecret);

        // 返回缓存的access_token
        return access_token;
    }

    /**
     * 从Redis缓存获取access_token
     *
     * 优先从Redis缓存获取，如果缓存不存在或已过期则重新请求微信API
     * access_token是调用微信公众平台API的全局唯一接口调用凭据
     *
     * @returns access_token字符串
     * @throws 当配置不存在或API调用失败时抛出错误
     */
    async getAccessTokenByRedis() {
        const { appId } = await this.wxoaconfigService.getConfig();
        // 构建缓存键
        const cacheKey = `${this.CACHE_PREFIX}:${appId}`;
        // 从Redis缓存获取access_token
        const cachedResult = await this.redisService.get<string>(cacheKey);

        // 如果缓存中没有access_token，则从微信API获取
        if (!cachedResult || !this.wechatOaClient) {
            const access_token = await this.getAccessToken();

            // 将access_token缓存到Redis，有效期设置为7100秒（微信官方是7200秒，提前100秒过期）
            await this.redisService.set(cacheKey, access_token, 7200 - 100);
            return access_token;
        }
        return cachedResult;
    }

    /**
     * 生成微信公众号二维码
     *
     * 通过access_token生成临时二维码
     * 支持自定义二维码有效期
     *
     * @param expire_seconds 二维码有效期（秒），可选，默认使用微信客户端默认值
     * @returns 包含二维码URL和过期时间的对象
     * @throws 当access_token无效或API调用失败时抛出错误
     */
    async getQrCode(expire_seconds: number = 60): Promise<{
        url: string;
        expire_seconds: number;
    }> {
        try {
            // 获取有效的access_token
            const accessToken = await this.getAccessTokenByRedis();

            // 生成一个随机UUID作为场景值
            const sceneStr = uuidv4();

            // 将场景值缓存到Redis，初始状态为未扫描
            await this.redisService.set(
                this.SCENE_PREFIX + ":" + sceneStr,
                JSON.stringify({
                    openid: "",
                    is_scan: false,
                }),
                expire_seconds,
            );

            // 调用微信客户端生成二维码
            return this.wechatOaClient.getQrCode(
                accessToken,
                expire_seconds,
                ActionName.QR_STR_SCENE,
                sceneStr,
            );
        } catch (error) {
            throw HttpErrorFactory.internal(error.message);
        }
    }

    /**
     * 处理微信二维码扫描回调
     *
     * 当用户扫描二维码时，微信会发送回调事件
     * 根据事件类型更新Redis中的场景值状态
     *
     * @param Event 事件类型（subscribe: 关注事件, SCAN: 扫描事件）
     * @param FromUserName 用户的openid
     * @param EventKey 事件KEY，包含场景值信息
     */
    async getQrCodeCallback(Event: string, FromUserName: string, EventKey: string) {
        let scene_str = EventKey;

        // 处理取消关注事件
        if (EventKey === "" || Event === WECHAT_SCENE_PREFIX.SCENE_PREFIX_UNSUBSCRIBE) {
            return;
        }

        // 处理关注事件，从EventKey中提取场景值
        if (Event === WECHAT_SCENE_PREFIX.SCENE_PREFIX_SUBSCRIBE) {
            scene_str = EventKey.split("_")[1];
        }

        // 从Redis获取场景值对应的状态
        const sceneStr = await this.redisService.get<string>(this.SCENE_PREFIX + ":" + scene_str);

        if (!sceneStr) {
            // 场景值不存在，说明登录超时，请重新登录
            throw HttpErrorFactory.internal("登录超时，请重新登录");
        }

        // 更新场景值状态，标记为已扫描并记录用户openid
        const playground = JSON.stringify({
            openid: FromUserName,
            is_scan: true,
        });

        // 将场景值和openid关联起来，设置60秒过期时间
        await this.redisService.set(this.SCENE_PREFIX + ":" + scene_str, playground, 60);
    }

    /**
     * 获取二维码扫描状态
     *
     * 前端轮询调用此方法检查用户是否已扫描二维码
     * 如果已扫描，则自动调用登录/注册方法
     *
     * @param scene_str 场景值
     * @returns 包含扫描状态的对象
     * @throws 当场景值不存在时抛出错误
     */
    async getQrCodeStatus(scene_str: string) {
        // 从Redis获取场景值对应的状态信息
        const sceneStr = await this.redisService.get<string>(this.SCENE_PREFIX + ":" + scene_str);

        if (!sceneStr) {
            // 场景值不存在，说明登录超时，请重新登录
            throw HttpErrorFactory.internal("登录超时，请重新登录");
        }

        const scene = JSON.parse(sceneStr);

        const { openid, is_scan } = scene;
        // 如果已扫描且openid不为空，则自动登录/注册用户
        if (is_scan && openid !== "") {
            // 检查用户是否已存在
            const existingUser = await this.authService.findOne({
                where: { openid },
            });

            if (existingUser) {
                // 用户已存在，检查用户状态
                if (!isEnabled(existingUser.status)) {
                    // 用户状态已停用，发送提示消息
                    await this.sendTemplateMessage(
                        openid as string,
                        "账号已被停用，请联系管理员处理",
                    );
                    return {
                        is_scan,
                        error: "账号已被停用，请联系管理员处理",
                    };
                }

                // 用户状态正常，直接登录
                const result = await this.authService.loginOrRegisterByOpenid(openid as string);
                if (result.user.token) {
                    // 发送登录成功消息
                    await this.sendTemplateMessage(openid as string, "登录成功");
                }
                return {
                    ...result,
                    is_scan,
                };
            } else {
                // 用户不存在，检查是否允许微信注册
                const loginSettings = await this.getLoginSettings();

                if (
                    !loginSettings.allowedRegisterMethods ||
                    !loginSettings.allowedRegisterMethods.includes(LOGIN_TYPE.WECHAT)
                ) {
                    // 微信注册已关闭，发送提示消息
                    await this.sendTemplateMessage(
                        openid as string,
                        "注册功能已关闭，请联系管理员处理",
                    );
                    return {
                        is_scan,
                        error: "注册功能已关闭，请联系管理员处理",
                    };
                }

                // 允许微信注册，进行自动注册
                const result = await this.authService.loginOrRegisterByOpenid(openid as string);
                if (result.user.token) {
                    // 发送注册成功消息
                    await this.sendTemplateMessage(openid as string, "注册并登录成功");
                }
                return {
                    ...result,
                    is_scan,
                };
            }
        }

        return {
            is_scan,
        };
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
     * 验证微信公众号服务器配置
     *
     * 微信公众平台在配置服务器地址时会发送验证请求
     * 需要验证签名是否正确
     *
     * @param signature 微信加密签名
     * @param timestamp 时间戳
     * @param nonce 随机数
     * @param echostr 随机字符串
     * @returns 验证成功时返回echostr
     * @throws 当签名验证失败时抛出错误
     */
    async updateUrlCallback(signature: string, timestamp: string, nonce: string, echostr: string) {
        // 获取配置中的token
        const { token } = await this.wxoaconfigService.getConfig();

        // 将token、timestamp、nonce三个参数进行字典序排序
        const sorted = [token, timestamp, nonce].sort().join("");

        // 使用sha1算法对排序后的字符串进行加密
        const hash = crypto.createHash("sha1").update(sorted).digest("hex");

        // 验证签名是否匹配
        if (hash !== signature) {
            throw HttpErrorFactory.internal("签名不匹配");
        }

        // 验证成功，返回echostr
        return echostr;
    }

    /**
     * 发送模板消息
     *
     * 向指定用户发送微信公众号模板消息
     * 自动获取access_token并调用微信API发送消息
     *
     * @param openid 接收消息的用户openid
     * @param content 消息内容
     * @returns 发送结果
     * @throws 当获取access_token失败或发送消息失败时抛出异常
     */
    private async sendTemplateMessage(openid: string, content: string) {
        try {
            // 获取有效的access_token
            const access_token = await this.getAccessTokenByRedis();

            // 调用微信客户端发送模板消息
            return this.wechatOaClient.sendTemplateMessage(
                access_token,
                openid,
                MsgType.Text,
                content,
            );
        } catch (error) {
            // 将错误包装为HTTP异常
            throw HttpErrorFactory.internal(error.message);
        }
    }

    /**
     * 解密微信加密消息
     * @param Encrypt 加密的消息内容
     * @returns 解密后的消息内容
     */
    async decryptMessage(Encrypt: string) {
        const result = await this.wechatOaClient.decryptMessage(Encrypt);
        return result;
    }

    /**
     * 验证微信消息签名
     * 用于验证消息是否来自微信官方，防止恶意请求
     * @param signature 微信加密签名
     * @param msg_signature 消息签名
     * @param timestamp 时间戳
     * @param nonce 随机数
     * @param Encrypt 加密的消息内容
     * @throws HttpException 当签名验证失败时抛出异常
     */
    async checkSignature(
        signature: string,
        msg_signature: string,
        timestamp: string,
        nonce: string,
        Encrypt: string,
    ) {
        const checked = this.wechatOaClient.checkSignature(
            signature,
            msg_signature,
            timestamp,
            nonce,
            Encrypt,
        );
        if (!checked) {
            throw HttpErrorFactory.internal("签名不一致，非法请求");
        }
    }
    @OnEvent(WECHAT_EVENTS.REFRESH, { async: true })
    async handleAccessTokenRefresh() {
        this.logger.log("access_token 刷新");
        await this.getAccessTokenByRedis();
    }
}
