import { IsDefined, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from "class-validator";

/**
 * 管理员修改密码DTO
 */
export class ChangePasswordDto {
    /**
     * 旧密码
     */
    @IsOptional()
    @IsString({ message: "旧密码必须是字符串" })
    oldPassword: string;

    /**
     * 新密码
     */
    @IsDefined({ message: "新密码参数必须传递" })
    @IsNotEmpty({ message: "新密码不能为空" })
    @IsString({ message: "新密码必须是字符串" })
    @MinLength(6, { message: "新密码长度不能少于6个字符" })
    @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
        message: "新密码必须包含至少字母和数字",
    })
    newPassword: string;

    /**
     * 确认密码
     */
    @IsDefined({ message: "确认密码参数必须传递" })
    @IsNotEmpty({ message: "确认密码不能为空" })
    @IsString({ message: "确认密码必须是字符串" })
    @MinLength(6, { message: "确认密码长度不能少于6个字符" })
    @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
        message: "确认密码必须包含至少字母和数字",
    })
    confirmPassword: string;
}
