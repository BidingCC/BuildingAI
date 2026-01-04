import { IsOptional, IsString } from "class-validator";

/**
 * 预览小程序版本 DTO
 */
export class PreviewMpVersionDto {
    /**
     * 预览描述
     */
    @IsString()
    @IsOptional()
    description?: string;
}


