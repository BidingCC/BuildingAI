import { BaseController } from "@buildingai/base";
import { CacheService } from "@buildingai/cache";
import { LOGIN_TYPE, LoginType } from "@buildingai/constants";
import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { SmsScene } from "@buildingai/constants/shared/sms.constant";
import { UserTerminal } from "@buildingai/constants/shared/status-codes.constant";
import { type UserPlayground } from "@buildingai/db";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { getFrontendBaseUrl } from "@buildingai/utils";
import { WebController } from "@common/decorators";
import { ChangePasswordDto } from "@common/modules/auth/dto/change-password.dto";
import { LoginDto } from "@common/modules/auth/dto/login.dto";
import { RegisterDto } from "@common/modules/auth/dto/register.dto";
import { SendSmsCodeDto, SmsLoginDto } from "@common/modules/auth/dto/sms.dto";
import { AuthService } from "@common/modules/auth/services/auth.service";
import { GoogleOAuthService } from "@common/modules/auth/services/google-oauth.service";
import { SmsService } from "@common/modules/sms/services/sms.service";
import { WechatOaService } from "@common/modules/wechat/services/wechatoa.service";
import { type LoginSettingsConfig } from "@modules/user/dto/login-settings.dto";
import { Body, Get, Headers, Param, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import crypto from "node:crypto";

const OAUTH_SESSION_PREFIX = "oauth:session:";

/**
 * 用户认证控制器
 *
 * 处理用户登录、注册和修改密码等认证相关功能
 */
@WebController("auth")
export class AuthWebController extends BaseController {
    constructor(
        private authService: AuthService,
        private wechatOaService: WechatOaService,
        private smsService: SmsService,
        private dictService: DictService,
        private cacheService: CacheService,
        private googleOAuthService: GoogleOAuthService,
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
        await this.assertRegisterMethodEnabled(LOGIN_TYPE.ACCOUNT);
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
        await this.assertLoginMethodEnabled(LOGIN_TYPE.ACCOUNT);
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

    /**
     * 轮询获取二维码扫描状态（绑定模式）
     * 已登录用户扫码后，将微信 openid 绑定到当前用户
     */
    @Get("wechat-qrcode-bind-status/:scene_str")
    async getWechatQrcodeBindStatus(
        @Playground() user: UserPlayground,
        @Param("scene_str") scene_str: string,
    ) {
        return this.wechatOaService.getQrCodeBindStatus(scene_str, user.id);
    }

    @Public()
    @Post("sms/send-code")
    async sendSmsCode(@Body() sendSmsCodeDto: SendSmsCodeDto) {
        await this.assertLoginMethodEnabled(LOGIN_TYPE.PHONE);
        await this.smsService.sendCode(
            sendSmsCodeDto.mobile,
            sendSmsCodeDto.areaCode,
            SmsScene.LOGIN,
        );
        return "The verification code has been sent and is valid for 5 minutes";
    }

    @Public()
    @Post("sms/login")
    @BuildFileUrl(["**.avatar"])
    async smsLogin(
        @Body() smsLoginDto: SmsLoginDto,
        @Headers("user-agent") userAgent?: string,
        @Headers("x-real-ip") ipAddress?: string,
    ) {
        await this.assertLoginMethodEnabled(LOGIN_TYPE.PHONE);
        const { mobile, areaCode, code, terminal } = smsLoginDto;
        const existingUser = await this.authService.findOne({
            where: { phone: mobile, phoneAreaCode: areaCode },
        });
        if (!existingUser) {
            await this.assertRegisterMethodEnabled(LOGIN_TYPE.PHONE);
        }
        await this.smsService.verifyCode(mobile, areaCode, code, SmsScene.LOGIN);
        return this.authService.loginBySms(mobile, areaCode, terminal, ipAddress, userAgent);
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

    private async getLoginSettings() {
        return await this.dictService.get<LoginSettingsConfig>(
            "login_settings",
            {
                allowedLoginMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.WECHAT],
                allowedRegisterMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.WECHAT],
                allowMultipleLogin: true,
                showPolicyAgreement: true,
            },
            "auth",
        );
    }

    private async assertLoginMethodEnabled(loginType: LoginType) {
        const loginSettings = await this.getLoginSettings();
        if (!loginSettings.allowedLoginMethods?.includes(loginType)) {
            throw HttpErrorFactory.forbidden("当前登录方式未开启");
        }
    }

    private async assertRegisterMethodEnabled(loginType: LoginType) {
        const loginSettings = await this.getLoginSettings();
        if (!loginSettings.allowedRegisterMethods?.includes(loginType)) {
            throw HttpErrorFactory.forbidden("当前注册方式未开启");
        }
    }

    /**
     * 微信网页授权回调
     *
     * 微信在用户点击授权后会携带 code 与 state 回调到此接口。
     * 后端使用 code 置换 OAuth access_token 并拉取用户信息，
     * 将用户信息写入 Redis 的 scene 状态中，标记授权完成，
     * 然后 302 跳转到移动端 H5 的“授权成功”页面。
     */
    @Public()
    @Get("wechat-oauth-callback")
    async getWechatOAuthCallback(
        @Query("code") code: string,
        @Query("state") state: string,
        @Res() res: Response,
    ) {
        if (!code || !state) {
            throw HttpErrorFactory.business(
                "缺少必须的 code 或 state 参数",
                BusinessCode.INVALID_REQUEST,
            );
        }
        await this.wechatOaService.updateQrCodeStatusByCode(code, state);
        // 不做重定向，直接返回一个简洁的移动端友好页
        const html = `<!doctype html>
        <html lang="zh-CN">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
          <title>授权完成</title>
          <style>
            body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", "Microsoft YaHei", Arial, sans-serif; background: #f8fafc; color: #111827; }
            .container { min-height: 100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 32px; box-sizing: border-box; }
            .card { max-width: 520px; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08); padding: 28px; text-align:center; }
            .title { font-size: 20px; font-weight: 700; margin: 8px 0 4px; }
            .desc { font-size: 14px; color:#6b7280; margin: 0 0 16px; }
            .ok { width: 64px; height: 64px; border-radius: 9999px; background: #10b981; display:flex; align-items:center; justify-content:center; color:#fff; font-size: 36px; margin: 0 auto; }
            .btn { width: 100%; appearance:none; border:0; padding: 12px 16px; border-radius: 12px; background:#111827; color:#fff; font-size:16px; font-weight:600; }
            .btn:active { opacity: .9; }
            .footer { margin-top: 16px; font-size: 12px; color:#9ca3af; }
          </style>
          <script>
            function closeOrBack(){ if (typeof WeixinJSBridge !== 'undefined' && WeixinJSBridge.invoke){ WeixinJSBridge.call('closeWindow'); } else { history.length > 1 ? history.back() : window.close(); } }
          </script>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="ok">✓</div>
                <h1 class="title">授权完成</h1>
                <p class="desc">您已完成授权，可返回电脑端，页面会自动登录并跳转首页。</p>
                <button class="btn" onclick="closeOrBack()">我知道了</button>
              </div>
            </div>
          </body>
          </html>`;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(html);
    }

    /**
     * Redirect user to Google consent screen
     *
     * @param res Express response object
     * @returns Redirects to Google OAuth authorization URL
     */
    @Public()
    @Get("google")
    async googleAuth(@Res() res: Response) {
        const state = crypto.randomUUID();
        const url = await this.googleOAuthService.getAuthorizationUrl(state);
        return res.redirect(url);
    }

    /**
     * Google OAuth callback - Google redirects here with code
     *
     * @param code Authorization code from Google
     * @param state State parameter for CSRF validation
     * @param error Error parameter if user denied consent
     * @param res Express response object
     * @returns Redirects to frontend with token
     */
    @Public()
    @Get("google-callback")
    async googleCallback(
        @Query("code") code: string,
        @Query("state") state: string,
        @Query("error") error: string,
        @Res() res: Response,
    ) {
        const redirectUri = `${getFrontendBaseUrl()}/api/auth/google-callback`;

        if (error || !code) {
            return res.redirect(`${getFrontendBaseUrl()}/login?error=${error || "missing_code"}`);
        }

        const { token } = await this.googleOAuthService.handleCallback(code, state, redirectUri);
        console.log("Google OAuth callback - token:", token);
        return res.redirect(`${getFrontendBaseUrl()}/login/oauth-callback?provider=google&token=${token}`);
    }
}
