/**
 * 认证相关常量
 * @description 定义登录和认证相关的常量
 */

/**
 * 登录方式类型（数字枚举）
 */
export const LOGIN_TYPE = {
    /** 账号登录 */
    ACCOUNT: 1,
    /** 手机号登录 */
    PHONE: 2,
    /** 微信登录 */
    WECHAT: 3,
} as const;
export type LoginType = (typeof LOGIN_TYPE)[keyof typeof LOGIN_TYPE];
