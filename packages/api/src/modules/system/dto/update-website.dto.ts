import { Type } from "class-transformer";
import { IsNotEmpty, IsObject, IsOptional, ValidateNested } from "class-validator";

class WebInfoDto {
    @IsNotEmpty({ message: "网站名称不能为空" })
    name: string;

    @IsOptional()
    description?: string;

    @IsOptional()
    icon?: string;

    @IsOptional()
    logo?: string;

    /**
     * SPA加载图标
     */
    @IsOptional()
    spaLoadingIcon?: string;
}

class AgreementDto {
    @IsOptional()
    serviceTitle: string;

    @IsOptional()
    serviceContent: string;

    @IsOptional()
    privacyTitle: string;

    @IsOptional()
    privacyContent: string;

    @IsOptional()
    paymentTitle: string;

    @IsOptional()
    paymentContent: string;

    @IsOptional()
    updateAt?: string;
}

class CopyrightDto {
    @IsOptional()
    displayName?: string;

    @IsOptional()
    iconUrl?: string;

    @IsOptional()
    url?: string;

    @IsOptional()
    copyrightText?: string;

    @IsOptional()
    copyrightBrand?: string;

    @IsOptional()
    copyrightUrl?: string;
}

class StatisticsDto {
    @IsNotEmpty({ message: "统计AppID不能为空" })
    appid: string;
}

export class UpdateWebsiteDto {
    /**
     * 网站信息
     */
    @IsOptional()
    @IsObject({ message: "网站信息必须是对象格式" })
    @ValidateNested()
    @Type(() => WebInfoDto)
    webinfo?: WebInfoDto;

    /**
     * 隐私协议
     */
    @IsOptional()
    @IsObject({ message: "隐私协议必须是对象格式" })
    @ValidateNested()
    @Type(() => AgreementDto)
    agreement?: AgreementDto;

    /**
     * 版权信息
     */
    @IsOptional()
    @IsObject({ message: "版权信息必须是对象格式" })
    @ValidateNested()
    @Type(() => CopyrightDto)
    copyright?: CopyrightDto;

    /**
     * 站点统计
     */
    @IsOptional()
    @IsObject({ message: "站点统计必须是对象格式" })
    @ValidateNested()
    @Type(() => StatisticsDto)
    statistics?: StatisticsDto;
}
