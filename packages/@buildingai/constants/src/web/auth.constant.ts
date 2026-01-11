/**
 * @fileoverview Authentication related constants
 * @description Defines constants related to login and authentication
 *
 * @author BuildingAI Teams
 */

/**
 * Login status identifiers (string enum)
 */
export const LOGIN_STATUS = {
    /** Bind mobile phone number */
    BIND: "bind-login",
    /** Login successful */
    SUCCESS: "success-login",
} as const;
export type LoginStatus = (typeof LOGIN_STATUS)[keyof typeof LOGIN_STATUS];

/**
 * WeChat login status identifiers (numeric enum)
 */
export const WECHAT_LOGIN_STATUS = {
    /** QR code error */
    CODE_ERROR: -1,
    /** Invalid status */
    INVALID: 0,
    /** Normal status */
    NORMAL: 1,
    /** Code scanned */
    SCANNED_CODE: 2,
    /** Login failed */
    LOGIN_FAIL: 3,
    /** Login successful */
    LOGIN_SUCCESS: 4,
} as const;
export type WechatLoginStatus = (typeof WECHAT_LOGIN_STATUS)[keyof typeof WECHAT_LOGIN_STATUS];

/**
 * SMS verification code types
 *
 * @see {@link SmsScene}
 * @deprecated
 */
export const SMS_TYPE = {
    /** Login verification code */
    LOGIN: "YZMDL",
    /** Bind mobile phone verification code */
    BIND_MOBILE: "BDSJHM",
    /** Change mobile phone verification code */
    CHANGE_MOBILE: "BGSJHM",
    /** Reset password verification code */
    FIND_PASSWORD: "ZHDLMM",
    /** Registration verification code */
    REGISTER: "YZMZC",
} as const;
export type SMS_TS_TYPE = (typeof SMS_TYPE)[keyof typeof SMS_TYPE];
