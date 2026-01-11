import { SmsScene, type SmsSceneType } from "@buildingai/constants";
import {
    UserTerminal,
    type UserTerminalType,
} from "@buildingai/constants/shared/status-codes.constant";
import { Type } from "class-transformer";
import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Matches,
} from "class-validator";

/**
 * 目前匹配中国的手机号
 */
export class SendSmsCodeDto {
    @IsNotEmpty()
    @IsString()
    @Matches(/^1[3-9]\d{9}$/, { message: "请输入有效的手机号" })
    mobile: string;

    @IsNotEmpty()
    @IsNumber()
    @IsEnum(SmsScene)
    scene: SmsSceneType;

    @IsOptional()
    @IsString()
    areaCode: string = "86";
}

export class SmsLoginDto {
    @IsNotEmpty()
    @Matches(/^1[3-9]\d{9}$/, { message: "请输入有效的手机号" })
    mobile: string;

    @IsOptional()
    @IsString()
    areaCode: string = "86";

    @IsNotEmpty()
    @IsString()
    @Length(6, 6)
    code: string;

    @IsNotEmpty()
    @Type(() => Number)
    @IsNumber()
    @IsEnum(UserTerminal)
    terminal: UserTerminalType;
}
