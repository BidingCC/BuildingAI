import axios from "axios";
import * as crypto from "crypto";
import WXBizMsgCrypt from "wechat-crypto";
import { parseStringPromise } from "xml2js";

import { ActionNametype } from "../interfaces/os";
import { MsgType, type MsgtypeKey } from "../interfaces/os";

/**
 * 微信公众号服务
 *
 * 提供微信公众号相关的API调用功能，包括：
 * - 获取access_token
 * - 生成二维码
 */
export class WechatOaClient {
    constructor(
        private readonly token: string,
        private readonly encodingAESKey: string,
        private readonly appId: string,
    ) {}

    /**
     * 获取微信公众号access_token
     *
     * 通过appId和appSecret获取微信公众平台的access_token
     * access_token是调用微信公众平台API的全局唯一接口调用凭据
     *
     * @param appId 微信公众号的AppID
     * @param appSecret 微信公众号的AppSecret
     * @returns 包含access_token和过期时间的对象
     * @throws WechatApiError 当API调用失败时抛出错误
     */
    async getAccessToken(
        appId: string,
        appSecret: string,
    ): Promise<{
        access_token: string;
        expires_in: number;
    }> {
        const { data } = await axios.get<{
            access_token: string;
            expires_in: number;
            errmsg?: string;
            errcode?: number;
        }>(`https://api.weixin.qq.com/cgi-bin/token`, {
            params: {
                grant_type: "client_credential",
                appid: appId,
                secret: appSecret,
            },
            timeout: 10000, // 10秒超时
        });

        if (!data.access_token) {
            throw new Error(`获取access_token失败: ${data.errmsg}`);
        }

        return {
            access_token: data.access_token,
            expires_in: data.expires_in,
        };
    }

    /**
     * 生成微信公众号二维码
     *
     * 通过access_token生成临时或永久的二维码
     * 支持多种二维码类型：临时二维码、永久二维码等
     *
     * @param access_token 微信公众平台access_token
     * @param expire_seconds 二维码有效期（秒），默认60秒
     * @param action_name 二维码类型，默认为"QR_SCENE"（临时二维码）
     * @param scene_str 场景值字符串
     * @returns 包含二维码URL和过期时间的对象
     * @throws WechatApiError 当API调用失败时抛出错误
     */
    async getQrCode(
        access_token: string,
        expire_seconds: number = 60,
        action_name: ActionNametype = "QR_SCENE",
        scene_str: string,
    ): Promise<{
        url: string;
        expire_seconds: number;
        key: string;
    }> {
        const { data } = await axios.post<{
            ticket: string;
            expire_seconds: number;
            url: string;
            errmsg?: string;
            errcode?: number;
        }>(
            `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${access_token}`,
            {
                expire_seconds,
                action_name,
                action_info: {
                    scene: {
                        scene_str: scene_str,
                    },
                },
            },
            {
                timeout: 10000, // 10秒超时
            },
        );

        if (!data.ticket) {
            throw new Error(`获取二维码失败: ${data.errmsg}`);
        }

        // 拼接获取二维码的完整URL
        const url = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${data.ticket}`;

        return {
            url,
            expire_seconds: data.expire_seconds,
            key: scene_str,
        };
    }

    /**
     * 发送消息
     *
     * 向指定用户发送微信公众号模板消息
     * 支持多种消息类型：文本、图片、语音、视频、音乐、图文等
     *
     * @param access_token 微信公众平台access_token
     * @param openid 接收消息的用户openid
     * @param msgtype 消息类型，默认为文本消息
     * @param content 消息内容，根据消息类型格式不同
     * @returns 发送结果
     * @throws WechatApiError 当API调用失败或返回错误时抛出异常
     */
    async sendTemplateMessage(
        access_token: string,
        openid: string,
        msgtype: MsgtypeKey = MsgType.Text,
        content: string,
    ) {
        const { data } = await axios.post<{
            errcode: number;
            errmsg?: string;
        }>(
            `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${access_token}`,
            {
                touser: openid,
                msgtype,
                text: {
                    content,
                },
            },
            {
                timeout: 10000, // 10秒超时
            },
        );

        return data;
    }

    /**
     * 签名校验
     *
     * @param signature 微信加密签名
     * @param msg_signature 微信加密签名
     * @param timestamp 时间戳
     * @param nonce 随机数
     * @param Encrypt 加密字符串
     * @returns 签名验证结果
     * @throws WechatSignatureError 当签名验证失败时抛出错误
     */
    checkSignature(
        signature: string,
        msg_signature: string,
        timestamp: string,
        nonce: string,
        Encrypt: string,
    ): boolean {
        if (Encrypt) {
            const wxBizMsgCrypt = new WXBizMsgCrypt(this.token, this.encodingAESKey, this.appId);
            const temSignature = wxBizMsgCrypt.getSignature(timestamp, nonce, Encrypt);
            return temSignature === msg_signature;
        } else {
            // 将 token、timestamp、nonce 进行字典序排序
            const sortedStr = [this.token, timestamp, nonce].sort().join("");

            // 使用 sha1 加密
            const hash = crypto.createHash("sha1").update(sortedStr).digest("hex");

            // 对比加密后的字符串与微信传来的 signature
            return hash === signature;
        }
    }

    /**
     * 解密消息
     *
     * 解密微信公众平台发送的消息
     * 支持多种消息类型：文本、图片、语音、视频、音乐、图文等
     *
     * @param Encrypt 加密的消息字符串
     * @returns 解密后的消息对象
     * @throws WechatDecryptError 当解密失败时抛出错误
     */
    async decryptMessage(Encrypt: string) {
        const wxBizMsgCrypt = new WXBizMsgCrypt(this.token, this.encodingAESKey, this.appId);
        const decryptedMessage = wxBizMsgCrypt.decrypt(Encrypt);

        const { xml } = await parseStringPromise(decryptedMessage.message, {
            explicitArray: false,
        });

        if (!xml) {
            throw new Error("解析XML消息失败");
        }

        return xml;
    }
    /**
     * 通过网页授权 code 获取 OAuth access_token 与 openid
     *
     * 文档: https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html
     *
     * @param appId 公众号 AppID
     * @param appSecret 公众号 AppSecret
     * @param code 用户同意授权后回调携带的 code
     */
    async getOAuthAccessToken(
        appId: string,
        appSecret: string,
        code: string,
    ): Promise<{
        access_token: string;
        expires_in: number;
        refresh_token: string;
        openid: string;
        scope: string;
        unionid?: string;
    }> {
        const { data } = await axios.get<{
            access_token: string;
            expires_in: number;
            refresh_token: string;
            openid: string;
            scope: string;
            unionid?: string;
            errcode?: number;
            errmsg?: string;
        }>("https://api.weixin.qq.com/sns/oauth2/access_token", {
            params: {
                appid: appId,
                secret: appSecret,
                code,
                grant_type: "authorization_code",
            },
            timeout: 10000,
        });

        if (!data.access_token || !data.openid) {
            throw new Error(`获取OAuth access_token失败: ${data.errmsg || "未知错误"}`);
        }

        return data;
    }

    /**
     * 使用 OAuth access_token 获取用户信息（昵称、头像等）
     *
     * 文档: https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html#4
     * 注意: 需要 scope=snsapi_userinfo
     *
     * @param access_token OAuth access_token
     * @param openid 用户的 openid
     */
    async getOAuthUserInfo(
        access_token: string,
        openid: string,
    ): Promise<{
        openid: string;
        nickname: string;
        sex?: number;
        province?: string;
        city?: string;
        country?: string;
        headimgurl?: string;
        privilege?: string[];
        unionid?: string;
    }> {
        const { data } = await axios.get<{
            openid: string;
            nickname: string;
            sex?: number;
            province?: string;
            city?: string;
            country?: string;
            headimgurl?: string;
            privilege?: string[];
            unionid?: string;
            errcode?: number;
            errmsg?: string;
        }>("https://api.weixin.qq.com/sns/userinfo", {
            params: {
                access_token,
                openid,
                lang: "zh_CN",
            },
            timeout: 10000,
        });

        if (!data.openid) {
            throw new Error(`获取用户信息失败: ${data.errmsg || "未知错误"}`);
        }

        return data;
    }
}
