/**
 * 认证相关常量
 * @description 定义登录和认证相关的常量
 */

/**
 * 登录方式类型（数字枚举）
 */
export const LOGIN_TYPE = {
    ACCOUNT: 1,
    PHONE: 2,
    WECHAT: 3,
    GOOGLE: 4,
} as const;
export type LoginType = (typeof LOGIN_TYPE)[keyof typeof LOGIN_TYPE];
