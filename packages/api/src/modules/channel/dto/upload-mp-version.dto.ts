import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * 上传小程序版本 DTO
 */
export class UploadMpVersionDto {
    /**
     * 版本号
     */
    @IsNotEmpty()
    @IsString()
    version: string;

    /**
     * 版本描述
     */
    @IsString()
    @IsOptional()
    description?: string;
}



