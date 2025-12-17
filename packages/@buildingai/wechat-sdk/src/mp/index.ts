import axios from "axios";

import { Jscode2sessionResponse, WechatMpJscode2sessionResponse } from "../interfaces/mp";

/**
 * 微信小程序服务
 *
 * 提供微信小程序相关的API调用功能，包括：
 * - 通过code换取openid和session_key
 */
export class WechatMpClient {
    constructor(
        private readonly appId: string,
        private readonly appSecret: string,
    ) {}

    /**
     * 通过code换取openid和session_key
     *
     * 登录凭证校验。通过 wx.login() 接口获得临时登录凭证 code 后传到开发者服务器
     * 调用此接口完成 code 换取 openid 和 session_key 等信息
     *
     * @param jsCode 登录时获取的 code，可通过 wx.login() 获取
     * @returns 包含 openid、session_key 和 unionid（可选）的对象
     * @throws Error 当API调用失败时抛出错误
     */
    async jscode2session(jsCode: string): Promise<WechatMpJscode2sessionResponse> {
        const { data } = await axios.get<Jscode2sessionResponse>(
            `https://api.weixin.qq.com/sns/jscode2session`,
            {
                params: {
                    appid: this.appId,
                    secret: this.appSecret,
                    js_code: jsCode,
                    grant_type: "authorization_code",
                },
                timeout: 10000, // 10秒超时
            },
        );

        if (data.errcode || !data.openid) {
            throw new Error(`${data.errmsg || "未知错误"} (errcode: ${data.errcode || "N/A"})`);
        }

        return {
            openid: data.openid,
            session_key: data.session_key,
            unionid: data.unionid,
        };
    }
}
