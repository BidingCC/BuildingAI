import { UserTerminal, type UserTerminalType } from "@buildingai/constants";
import { Type } from "class-transformer";
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Matches,
    MinLength,
    ValidateIf,
} from "class-validator";

/**
 * 用户注册DTO
 */
export class RegisterDto {
    /**
     * 用户名
     */
    @IsNotEmpty({ message: "用户名不能为空" })
    @IsString({ message: "用户名必须是字符串" })
    @Length(3, 20, { message: "用户名长度必须在3-20个字符之间" })
    @Matches(/^[a-zA-Z0-9_]+$/, { message: "用户名只能包含字母、数字、下划线" })
    username: string;

    /**
     * 密码
     */
    @IsNotEmpty({ message: "密码不能为空" })
    @IsString({ message: "密码必须是字符串" })
    @MinLength(6, { message: "密码长度不能少于6个字符" })
    password: string;

    /**
     * 确认密码
     */
    @IsNotEmpty({ message: "确认密码不能为空" })
    @IsString({ message: "确认密码必须是字符串" })
    @MinLength(6, { message: "确认密码长度不能少于6个字符" })
    confirmPassword: string;

    /**
     * 昵称（可选）
     */
    @IsOptional()
    @IsString({ message: "昵称必须是字符串" })
    nickname?: string;

    /**
     * 邮箱（可选）
     */
    @IsOptional()
    @ValidateIf((o) => o.email !== undefined && o.email !== "")
    @IsEmail({}, { message: "邮箱格式不正确" })
    email?: string;

    /**
     * 手机号（可选）
     */
    @IsOptional()
    @IsString({ message: "手机号必须是字符串" })
    phone?: string;

    /**
     * 用户终端类型
     */
    @IsNotEmpty({ message: "用户终端类型不能为空" })
    @Type(() => Number) // 自动把字符串转换为数字
    @IsNumber({}, { message: "用户终端类型必须是数字" })
    @IsEnum(UserTerminal, {
        message: ({ value }) =>
            `用户终端类型不合法：收到 "${value}"，应为 ${Object.values(UserTerminal).join(", ")}`,
    })
    terminal: UserTerminalType;
}
