import { Type } from "class-transformer";
import {
    IsArray,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from "class-validator";

/**
 * 注册奖励配置
 */
export class RegisterAwardDto {
    /** 注册奖励 */
    @Type(() => Number)
    @IsInt()
    @Min(0)
    registerAward: number;

    @Type(() => Number)
    @IsInt()
    @IsIn([0, 1])
    status: number;
}

/**
 * 登录奖励配置
 */
export class LoginAwardDto {
    /** 注册奖励 */
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LoginAward)
    loginAward: LoginAward[];

    @Type(() => Number)
    @IsInt()
    @IsIn([0, 1])
    status: number;
}

export class LoginAward {
    @IsNotEmpty({ message: "ID不能为空" })
    @IsString()
    id: string;

    @IsOptional()
    @IsString()
    level: string;

    @IsNotEmpty({ message: "等级名称不能为空" })
    @IsString()
    name: string;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    award: number;
}

/**
 * 签到奖励配置
 */
export class SignAwardDto {
    /** 签到奖励 */
    @Type(() => Number)
    @IsInt()
    @Min(0)
    signAward: number;

    @Type(() => Number)
    @IsInt()
    @IsIn([0, 1])
    status: number;
}
