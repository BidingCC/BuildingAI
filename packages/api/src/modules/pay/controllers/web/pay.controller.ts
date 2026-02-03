import { BaseController } from "@buildingai/base";
import { PayConfigPayType } from "@buildingai/constants";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { WechatPayNotifyParams } from "@buildingai/wechat-sdk/interfaces/pay";
import { WebController } from "@common/decorators/controller.decorator";
import { PrepayDto } from "@modules/pay/dto/prepay.dto";
import { PayService } from "@modules/pay/services/pay.service";
import { Body, Get, Headers, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";

@WebController("pay")
export class PayWebController extends BaseController {
    constructor(private readonly payService: PayService) {
        super();
    }

    @Post("prepay")
    async prepay(@Body() prepayDto: PrepayDto, @Playground() user: UserPlayground) {
        return this.payService.prepay(prepayDto, user.id);
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
        console.log("回调开始");
        await this.payService.notifyWxPay(playload, body);
        //商户需告知微信支付接收回调成功，HTTP应答状态码需返回200或204，无需返回应答报文
        res.status(200).send("");
    }

    /**
     * Ref: https://opendocs.alipay.com/open/270/105902?pathHash=d5cd617e#%E5%BC%82%E6%AD%A5%E9%80%9A%E7%9F%A5%E7%89%B9%E6%80%A7
     */
    @Public()
    @Post("notifyAlipay")
    async notifyAlipay(@Body() body: Record<string, any>, @Res() res: Response) {
        try {
            await this.payService.notifyAlipay(body);
            return res.status(200).send("success");
        } catch {
            return res.status(200).send("fail");
        }
    }

    @Public()
    @Get("returnAlipay")
    async returnAlipay(@Query() query: any, @Res() res: Response) {
        try {
            // validate signature
            // const alipayService = await this.payfactoryService.getPayService(
            //     PayConfigPayType.ALIPAY,
            // );
            // const isValid = alipayService.checkNotifySignV2(query);
            // if (!isValid) {
            //     return res.redirect("/payment/fail");
            // }

            const orderNo = query.out_trade_no;
            return res.redirect(
                `/payment/success?orderNo=${orderNo}&payType=${PayConfigPayType.ALIPAY}}`,
            );
        } catch (error) {
            console.error("Alipay sync callback processing failed:", error);
            return res.redirect("/payment/fail");
        }
    }
}
