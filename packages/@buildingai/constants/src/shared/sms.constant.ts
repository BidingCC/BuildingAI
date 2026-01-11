export const SmsScene = {
    LOGIN: 1,
    REGISTER: 2,
    BIND_MOBILE: 3,
    CHANGE_MOBILE: 4,
    FIND_PASSWORD: 5,
} as const;
export type SmsSceneType = (typeof SmsScene)[keyof typeof SmsScene];
