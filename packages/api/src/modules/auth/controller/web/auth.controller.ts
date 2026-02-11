import { BaseController } from "@buildingai/base";
import { CacheService } from "@buildingai/cache";
import { LOGIN_TYPE } from "@buildingai/constants";
import { UserTerminal } from "@buildingai/constants/shared/status-codes.constant";
import { type UserPlayground } from "@buildingai/db";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { isDevelopment } from "@buildingai/utils";
import { WebController } from "@common/decorators";
import { ChangePasswordDto } from "@common/modules/auth/dto/change-password.dto";
import { LoginDto } from "@common/modules/auth/dto/login.dto";
import { RegisterDto } from "@common/modules/auth/dto/register.dto";
import { AuthService } from "@common/modules/auth/services/auth.service";
import { WechatOaService } from "@common/modules/wechat/services/wechatoa.service";
import { Body, Get, Headers, Param, Post, Query, Req, Res } from "@nestjs/common";
import { randomBytes } from "crypto";
import type { Request, Response } from "express";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const OAUTH_SESSION_PREFIX = "oauth:session:";
const OAUTH_SESSION_TTL = 120;

@WebController("auth")
export class AuthWebController extends BaseController {
    constructor(
        private authService: AuthService,
        private wechatOaService: WechatOaService,
        private dictService: DictService,
        private cacheService: CacheService,
    ) {
        super();
    }

    @Public()
    @Post("check-account")
    @BuildFileUrl(["**.avatar"])
    async checkAccount(@Body() body: { account: string }) {
        return this.authService.checkAccount(body.account);
    }

    /**
     * 用户注册
     *
     * @param registerDto 注册信息
     * @param userAgent 用户代理
     * @param ipAddress IP地址
     * @param terminal 终端类型
     * @returns 注册结果，包含令牌和用户信息
     */
    @Public()
    @Post("register")
    @BuildFileUrl(["**.avatar"])
    async register(
        @Body() registerDto: RegisterDto,
        @Headers("user-agent") userAgent?: string,
        @Headers("x-real-ip") ipAddress?: string,
    ) {
        // 获取终端类型，默认为PC
        const terminalType = registerDto.terminal ? registerDto.terminal : UserTerminal.PC;

        return this.authService.register(registerDto, terminalType, ipAddress, userAgent);
    }

    /**
     * 用户登录
     *
     * @param loginDto 登录信息
     * @param userAgent 用户代理
     * @param ipAddress IP地址
     * @param terminal 终端类型
     * @returns 登录结果，包含令牌和用户信息
     */
    @Public()
    @Post("login")
    @BuildFileUrl(["**.avatar"])
    async login(
        @Body() loginDto: LoginDto,
        @Headers("user-agent") userAgent?: string,
        @Headers("x-real-ip") ipAddress?: string,
    ) {
        // 获取终端类型，默认为PC
        const terminalType = loginDto.terminal ? loginDto.terminal : UserTerminal.PC;

        return this.authService.login(
            loginDto.username,
            loginDto.password,
            terminalType,
            ipAddress,
            userAgent,
        );
    }

    /**
     * 修改用户密码
     *
     * @param changePasswordDto 修改密码信息
     * @param req 请求对象
     * @returns 修改结果
     */
    @Post("change-password")
    async changePassword(
        @Body() changePasswordDto: ChangePasswordDto,
        @Playground() user: UserPlayground,
    ) {
        // 获取当前用户ID
        const userId = user.id;

        // 调用服务中的方法修改密码，并传递确认密码参数
        return this.authService.changePassword(
            userId,
            changePasswordDto.oldPassword,
            changePasswordDto.newPassword,
            changePasswordDto.confirmPassword,
        );
    }

    /**
     * 退出登录
     *
     * @param req 请求对象
     * @returns 退出结果
     */
    @Post("logout")
    async logout(@Req() req: Request) {
        // 从请求头中获取令牌
        const token = req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return {
                success: false,
                message: "未提供有效的令牌",
            };
        }

        return this.authService.logout(token);
    }

    /**
     * 获取微信二维码
     *
     * 生成用于微信登录的临时二维码
     * 二维码包含唯一的场景值，用于标识登录会话
     *
     * @param expire_seconds 二维码有效期（秒），可选参数
     * @returns 包含二维码URL和过期时间的对象
     */
    @Public()
    @Get("wechat-qrcode")
    async getWechatQrcode(@Query("expire_seconds") expire_seconds: number) {
        return this.wechatOaService.getQrCode(expire_seconds);
    }

    /**
     * 验证微信公众号服务器配置
     *
     * 微信公众平台在配置服务器地址时会发送GET请求进行验证
     * 需要验证签名是否正确，验证成功后返回echostr
     *
     * @param signature 微信加密签名
     * @param timestamp 时间戳
     * @param nonce 随机数
     * @param echostr 随机字符串
     * @param res Express响应对象
     * @returns 验证成功时返回echostr
     */
    @Public()
    @Get("wechat-callback")
    async getWechatUrlCallback(
        @Query("signature") signature: string,
        @Query("timestamp") timestamp: string,
        @Query("nonce") nonce: string,
        @Query("echostr") echostr: string,
        @Res() res: Response,
    ) {
        const result = await this.wechatOaService.updateUrlCallback(
            signature,
            timestamp,
            nonce,
            echostr,
        );
        res.send(result);
    }

    /**
     * 处理微信二维码扫描回调
     *
     * 当用户扫描二维码时，微信会发送POST请求到此接口
     * 根据事件类型更新Redis中的场景值状态
     * 支持明文和加密两种模式的消息处理
     *
     * @param signature 微信加密签名，用于验证请求来源
     * @param timestamp 时间戳
     * @param nonce 随机数
     * @param encrypt_type 加密类型（aes: 加密模式, 其他: 明文模式）
     * @param msg_signature 消息签名
     * @param body 微信回调的XML数据
     * @param body.xml.Event 事件类型（subscribe: 关注事件, SCAN: 扫描事件）
     * @param body.xml.FromUserName 用户的openid
     * @param body.xml.EventKey 事件KEY，包含场景值信息
     * @param body.xml.Encrypt 加密的消息内容（加密模式下使用）
     * @param res HTTP响应对象
     * @returns 返回"success"字符串表示处理成功
     * @throws 当签名验证失败时抛出异常
     */
    @Public()
    @Post("wechat-callback")
    async getWechatQrcodeCallback(
        @Query("signature") signature: string,
        @Query("timestamp") timestamp: string,
        @Query("nonce") nonce: string,
        @Query("encrypt_type") encrypt_type: string,
        @Query("msg_signature") msg_signature: string,
        @Body()
        body: {
            xml: {
                Event: string;
                FromUserName: string;
                EventKey: string;
                Encrypt: string;
            };
        },
        @Res() res: Response,
    ) {
        // 验证微信请求签名，确保请求来自微信官方
        await this.wechatOaService.checkSignature(
            signature,
            msg_signature,
            timestamp,
            nonce,
            body.xml.Encrypt,
        );

        // 根据加密类型选择不同的处理方式
        if (encrypt_type === "aes") {
            // 加密模式：需要先解密消息内容
            const result = await this.wechatOaService.decryptMessage(body.xml.Encrypt);

            // 使用解密后的数据更新二维码扫描状态
            await this.wechatOaService.getQrCodeCallback(
                result.Event as string,
                result.FromUserName as string,
                result.EventKey as string,
            );
        } else {
            // 明文模式：直接使用原始数据
            await this.wechatOaService.getQrCodeCallback(
                body.xml.Event,
                body.xml.FromUserName,
                body.xml.EventKey,
            );
        }

        // 返回成功响应给微信服务器
        res.send("success");
    }

    /**
     * 轮询获取二维码扫描状态
     *
     * 前端通过轮询调用此接口检查用户是否已扫描二维码
     * 如果用户已扫描，则自动进行登录或注册操作
     *
     * @param scene_str 场景值，用于标识特定的二维码会话
     * @returns 包含扫描状态和登录结果的对象
     * @throws 当场景值不存在或登录超时时抛出错误
     */
    @Public()
    @Get("wechat-qrcode-status/:scene_str")
    async getWechatQrcodeStatus(@Param("scene_str") scene_str: string) {
        return this.wechatOaService.getQrCodeStatus(scene_str);
    }

    @Public()
    @Get("google")
    async googleLogin(@Res() res: Response, @Query("redirect") redirect?: string) {
        const loginSettings = await this.dictService.get<{ allowedLoginMethods?: number[] }>(
            "login_settings",
            {},
            "auth",
        );
        if (!loginSettings?.allowedLoginMethods?.includes(LOGIN_TYPE.GOOGLE)) {
            throw HttpErrorFactory.forbidden("谷歌登录未开启");
        }
        const config = await this.getGoogleOaConfig();
        if (!config?.clientId || !config?.clientSecret) {
            throw HttpErrorFactory.badRequest("请先在后台配置谷歌登录 Client ID 与 Secret");
        }
        const redirectUri = this.getGoogleRedirectUri();
        const scope = encodeURIComponent("openid email profile");
        const state = redirect ? encodeURIComponent(redirect) : "";
        const stateParam = state ? `&state=${state}` : "";
        const url = `${GOOGLE_AUTH_URL}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}${stateParam}`;
        res.redirect(url);
    }

    @Public()
    @Get("google/callback")
    async googleCallback(
        @Res() res: Response,
        @Query("code") code: string,
        @Query("state") state?: string,
        @Headers("user-agent") userAgent?: string,
        @Headers("x-real-ip") ipAddress?: string,
    ) {
        if (!code) return this.redirectOAuthCallback(res, "missing_code", state);
        const config = await this.getGoogleOaConfig();
        if (!config?.clientId || !config?.clientSecret)
            return this.redirectOAuthCallback(res, "config", state);
        const redirectUri = this.getGoogleRedirectUri();
        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });
        if (!tokenRes.ok) return this.redirectOAuthCallback(res, "token_exchange", state);
        const tokenData = (await tokenRes.json()) as { access_token?: string };
        const accessToken = tokenData.access_token;
        if (!accessToken) return this.redirectOAuthCallback(res, "no_access_token", state);
        const userRes = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userRes.ok) return this.redirectOAuthCallback(res, "userinfo", state);
        const profile = (await userRes.json()) as {
            id: string;
            email?: string;
            name?: string;
            picture?: string;
        };
        const result = await this.authService.findOrCreateByGoogle(
            profile.id,
            profile.email ?? null,
            profile.name ?? null,
            profile.picture ?? null,
            UserTerminal.PC,
            ipAddress,
            userAgent,
        );
        const token = (result.user as { token?: string }).token;
        const oneTimeCode = randomBytes(24).toString("hex");
        await this.cacheService.set(
            OAUTH_SESSION_PREFIX + oneTimeCode,
            { token, user: result.user },
            OAUTH_SESSION_TTL,
        );
        const redirectPath = state ? decodeURIComponent(state) : "";
        const baseUrl = this.getFrontendBaseUrl();
        const params = new URLSearchParams({ code: oneTimeCode });
        if (redirectPath) params.set("redirect", redirectPath);
        return res.redirect(`${baseUrl}/login/oauth-callback?${params.toString()}`);
    }

    @Public()
    @Get("oauth/session")
    @BuildFileUrl(["user.avatar"])
    async oauthSession(@Query("code") code: string) {
        if (!code) throw HttpErrorFactory.badRequest("missing_code");
        const key = OAUTH_SESSION_PREFIX + code;
        const data = await this.cacheService.get<{ token: string; user: unknown }>(key);
        if (!data) throw HttpErrorFactory.badRequest("invalid_or_expired_code");
        return { token: data.token, user: data.user };
    }

    private async getGoogleOaConfig() {
        const cfg = await this.dictService.get<{ clientId?: string; clientSecret?: string }>(
            "google_oa_config",
            {},
            "auth",
        );
        if (cfg?.clientId || cfg?.clientSecret) return cfg;
        return this.dictService.get<{ clientId?: string; clientSecret?: string }>(
            "google_oauth_config",
            {},
            "auth",
        );
    }

    private getGoogleRedirectUri() {
        const baseUrl = (process.env.APP_DOMAIN || "http://localhost:4090").replace(/\/$/, "");
        return `${baseUrl}/api/auth/google/callback`;
    }

    private getFrontendBaseUrl() {
        return isDevelopment()
            ? "http://localhost:4091"
            : (process.env.APP_DOMAIN || "http://localhost:4090").replace(/\/$/, "");
    }

    private redirectOAuthCallback(res: Response, error?: string, redirectState?: string) {
        const baseUrl = this.getFrontendBaseUrl();
        if (error) {
            const params = new URLSearchParams({ error });
            if (redirectState) params.set("redirect", redirectState);
            return res.redirect(`${baseUrl}/login?${params.toString()}`);
        }
        return res.redirect(`${baseUrl}/login`);
    }
}
