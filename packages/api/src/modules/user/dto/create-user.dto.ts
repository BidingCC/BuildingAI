import {
    IsEmail,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Length,
    Matches,
    ValidateIf,
} from "class-validator";

/**
 * 创建用户DTO
 */
export class CreateUserDto {
    /**
     * 用户名
     *
     * 长度3-20个字符，只能包含字母、数字、下划线
     */
    @IsNotEmpty({ message: "用户名不能为空" })
    @IsString({ message: "用户名必须是字符串" })
    @Length(3, 20, { message: "用户名长度必须在3-20个字符之间" })
    @Matches(/^[a-zA-Z0-9_]+$/, { message: "用户名只能包含字母、数字、下划线" })
    username: string;

    /**
     * 密码
     *
     * 长度6-20个字符，必须包含字母和数字
     */
    @IsNotEmpty({ message: "密码不能为空" })
    @IsString({ message: "密码必须是字符串" })
    @Length(6, 20, { message: "密码长度必须在6-20个字符之间" })
    @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
        message: "密码必须包含字母和数字",
    })
    password: string;

    /**
     * 用户昵称
     */
    @IsOptional()
    @IsNotEmpty({ message: "昵称不能为空" })
    @IsString({ message: "昵称必须是字符串" })
    @Length(2, 20, { message: "昵称长度必须在2-20个字符之间" })
    nickname?: string;

    /**
     * 真实姓名
     */
    @IsOptional()
    @IsString({ message: "真实姓名必须是字符串" })
    @Length(2, 20, { message: "真实姓名必须在2-20个字符之间" })
    realName?: string;

    /**
     * 用户邮箱
     */
    @IsOptional()
    @ValidateIf((o) => o.email && o.email.trim() !== "")
    @IsEmail({}, { message: "邮箱格式不正确" })
    email?: string;

    /**
     * 用户手机号
     *
     * 不包含区号的手机号码
     */
    @IsOptional()
    @IsString({ message: "手机号必须是字符串" })
    @Matches(/^$|^\d{7,15}$/, {
        message: "手机号格式不正确，请输入7-15位数字",
    })
    phone?: string;

    /**
     * 手机号区号
     *
     * 国际区号，如：86, 1, 81, 44等
     */
    @IsOptional()
    @IsString({ message: "区号必须是字符串" })
    @Matches(/^$|^\d{1,4}$/, {
        message: "区号格式不正确，请输入1-4位数字",
    })
    phoneAreaCode?: string;

    /**
     * 用户头像
     */
    @IsOptional()
    @IsString({ message: "头像必须是字符串" })
    avatar?: string;

    /**
     * 用户角色ID
     *
     * 一个用户只能分配一个角色，允许为空
     */
    @IsOptional()
    @ValidateIf((o) => o.roleId && o.roleId.trim() !== "")
    @IsUUID(4, { message: "角色ID必须是有效的UUID格式" })
    roleId?: string;

    /**
     * 用户状态
     *
     * 0: 禁用, 1: 启用
     */
    @IsOptional()
    @IsInt({ message: "状态必须是整数" })
    @IsIn([0, 1], { message: "状态只能是0(禁用)或1(启用)" })
    status?: number;

    /**
     * 用户注册来源
     *
     * 0: 管理员新增, 1: 手机号注册, 2: 微信注册, 3: 邮箱注册, 4: 账号注册
     */
    @IsOptional()
    @IsInt({ message: "注册来源必须是整数" })
    @IsIn([0, 1, 2, 3, 4], { message: "注册来源只能是0-4之间的数字" })
    source?: number;

    /**
     * 会员等级ID
     */
    @IsOptional()
    @ValidateIf((o) => o.level && o.level.trim() !== "")
    @IsUUID(4, { message: "会员等级ID必须是有效的UUID格式" })
    level?: string;

    /**
     * 会员等级到期时间
     */
    @IsOptional()
    @IsString({ message: "会员等级到期时间必须是字符串" })
    levelEndTime?: string;
}
