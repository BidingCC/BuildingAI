/**
 * 数字布尔值
 */
export const BooleanNumber = {
    YES: 1,
    NO: 0,
} as const;
export type BooleanNumberType = (typeof BooleanNumber)[keyof typeof BooleanNumber];
export type BooleanNumberKey = keyof typeof BooleanNumber;

/**
 * 用户来源
 */
export const UserCreateSource = {
    CONSOLE: 0,
    PHONE: 1,
    WECHAT: 2,
    EMAIL: 3,
    USERNAME: 4,
    GOOGLE: 5,
} as const;
export type UserCreateSourceType = (typeof UserCreateSource)[keyof typeof UserCreateSource];
export type UserCreateSourceKey = keyof typeof UserCreateSource;

/**
 * 用户终端
 */
export const UserTerminal = {
    PC: 1,
    H5: 2,
    MP: 3,
    APP: 4,
} as const;
export type UserTerminalType = (typeof UserTerminal)[keyof typeof UserTerminal];
export type UserTerminalKey = keyof typeof UserTerminal;
