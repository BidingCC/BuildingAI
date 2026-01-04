import { IsNotEmpty, IsString } from "class-validator";

/**
 * 微信公众号code登录DTO
 */
export class WxOaLoginDto {
    /**
     * 微信公众号code
     */
    @IsNotEmpty({ message: "code 不能为空" })
    @IsString({ message: "code 必须是字符串" })
    code: string;
}
