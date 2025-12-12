import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateWxMpConfigDto {
    /**
     * 小程序名称
     */
    @IsNotEmpty()
    @IsString()
    name: string;
    /**
     * 小程序原始ID
     */
    @IsString()
    @IsOptional()
    originalId: string;
    /**
     * 小程序二维码
     */
    @IsString()
    @IsOptional()
    qrCode: string;
    /**
     * 小程序AppId
     */
    @IsNotEmpty()
    @IsString()
    appId: string;
    /**
     * 小程序AppSecret
     */
    @IsNotEmpty()
    @IsString()
    appSecret: string;
    /**
     * 上传密钥
     */
    @IsString()
    @IsOptional()
    uploadKey: string;
}
