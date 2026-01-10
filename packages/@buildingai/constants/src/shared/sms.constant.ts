export const SmsScene = {
    LOGIN: 1,
    REGISTER: 2,
} as const;
export type SmsSceneType = (typeof SmsScene)[keyof typeof SmsScene];
