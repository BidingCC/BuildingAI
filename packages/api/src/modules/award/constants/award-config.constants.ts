export const LOGIN_CONFIG_CACHE_PREFIX = "login-award-config";
export const TERMINAL = {
    PC: 1,
    H5: 2,
    MINI_PROGRAM: 3,
} as const;

export type TERMINALTYPE = (typeof TERMINAL)[keyof typeof TERMINAL];
export const TERMINAL_TYPE_DESCRIPTION = {
    [TERMINAL.PC]: "PC网页",
    [TERMINAL.H5]: "手机H5",
    [TERMINAL.MINI_PROGRAM]: "微信小程序",
} as const;
