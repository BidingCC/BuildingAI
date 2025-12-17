import { IsNotEmpty, IsString } from "class-validator";

/**
 * 微信小程序登录DTO
 */
export class WxMpLoginDto {
    /**
     * 微信小程序登录凭证 code
     * 通过 wx.login() 接口获得临时登录凭证 code
     */
    @IsNotEmpty({ message: "code 不能为空" })
    @IsString({ message: "code 必须是字符串" })
    code: string;
}
