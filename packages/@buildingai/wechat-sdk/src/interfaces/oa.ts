export const ActionName = {
    QR_SCENE: "QR_SCENE",
    QR_STR_SCENE: "QR_STR_SCENE",
    QR_LIMIT_SCENE: "QR_LIMIT_SCENE",
    QR_LIMIT_STR_SCENE: "QR_LIMIT_STR_SCENE",
} as const;
export type ActionNametype = (typeof ActionName)[keyof typeof ActionName];
export const MsgType = {
    Text: "text",
    // Image: "image",
    // Link: "link",
    // Miniprogram: "miniprogram",
} as const;
export type MsgtypeKey = (typeof MsgType)[keyof typeof MsgType];
