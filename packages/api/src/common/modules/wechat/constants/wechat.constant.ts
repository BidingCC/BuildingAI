export const WECHAT_SCENE_PREFIX = {
    SCENE_PREFIX_SCAN: "scan",
    SCENE_PREFIX_SUBSCRIBE: "subscribe",
    SCENE_PREFIX_UNSUBSCRIBE: "unsubscribe",
} as const;

export const WECHAT_EVENTS = {
    REFRESH: "wechat.access_token.refresh",
    MP_CONFIG_REFRESH: "wechat.mp.config.refresh",
} as const;
