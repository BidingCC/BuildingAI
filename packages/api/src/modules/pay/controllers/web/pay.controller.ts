import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { WechatPayNotifyParams } from "@buildingai/wechat-sdk/interfaces/pay";
import { WebController } from "@common/decorators/controller.decorator";
import { getClientIp } from "@common/utils/ip.util";
import { PrepayDto } from "@modules/pay/dto/prepay.dto";
import { PayService } from "@modules/pay/services/pay.service";
import { Body, Get, Headers, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

@WebController("pay")
export class PayWebController extends BaseController {
    constructor(private readonly payService: PayService) {
        super();
    }

    @Get("payWayList")
    @BuildFileUrl(["**.logo"])
    async getPayWayList(@Query("scene") scene?: string) {
        const sceneNum = scene ? Number(scene) : undefined;
        return this.payService.getPayWayList(sceneNum);
    }

    @Post("prepay")
    async prepay(
        @Body() prepayDto: PrepayDto,
        @Playground() user: UserPlayground,
        @Req() req: Request,
    ) {
        const clientIp = getClientIp(req);
        return this.payService.prepay(prepayDto, user, { clientIp });
    }

    @Get("getPayResult")
    async getPayResult(
        @Query("orderId") orderId: string,
        @Query("from") from: string,
        @Playground() user: UserPlayground,
    ) {
        return this.payService.getPayResult(orderId, from, user.id);
    }

    /**
     * 微信回调
     * @param headers
     * @param body
     * @param res
     */
    @Public()
    @Post("notifyWxPay")
    async notifyWxPay(
        @Headers() headers: Headers,
        @Body() body: Record<string, any>,
        @Res() res: Response,
    ) {
        const playload: WechatPayNotifyParams = {
            timestamp: headers["wechatpay-timestamp"],
            nonce: headers["wechatpay-nonce"],
            body,
            serial: headers["wechatpay-serial"],
            signature: headers["wechatpay-signature"],
        };
        await this.payService.notifyWxPay(playload, body);
        //商户需告知微信支付接收回调成功，HTTP应答状态码需返回200或204，无需返回应答报文
        res.status(200).send("");
    }
    /**
     * 微信退款结果回调
     * 文档：https://pay.weixin.qq.com/doc/v3/merchant/4012791865
     * 要求：5 秒内完成验签并应答；验签通过返回 200/204，验签失败返回 4XX/5XX 及 { code, message }；应答后再处理业务逻辑（推荐异步）
     */
    @Public()
    @Post("notifyRefundWxPay")
    async notifyRefundWxPay(
        @Headers() headers: Headers,
        @Body() body: Record<string, any>,
        @Res() res: Response,
    ) {
        const payload: WechatPayNotifyParams = {
            timestamp: headers["wechatpay-timestamp"],
            nonce: headers["wechatpay-nonce"],
            body,
            serial: headers["wechatpay-serial"],
            signature: headers["wechatpay-signature"],
        };
        const verified = await this.payService.verifyWxRefundNotify(payload);
        if (!verified) {
            res.status(500).json({ code: "FAIL", message: "验签失败" });
            return;
        }
        res.status(200).send("");
        setImmediate(() => this.payService.processWxRefundNotify(body).catch(() => {}));
    }

    /**
     * 支付宝支付/退款异步通知（同一地址，根据 body 区分）
     * 要求：先验签并立即返回 200 + success/fail；验签通过后异步处理业务（与微信退款回调一致）
     * Ref: https://opendocs.alipay.com/open/270/105902#%E5%BC%82%E6%AD%A5%E9%80%9A%E7%9F%A5%E7%89%B9%E6%80%A7
     */
    @Public()
    @Post("notifyAlipay")
    async notifyAlipay(@Body() body: Record<string, any>, @Res() res: Response) {
        const verified = await this.payService.verifyAlipayNotify(body);
        if (!verified) {
            return res.status(200).send("fail");
        }
        res.status(200).send("success");
        setImmediate(() => this.payService.processAlipayNotify(body).catch(() => {}));
    }
}
