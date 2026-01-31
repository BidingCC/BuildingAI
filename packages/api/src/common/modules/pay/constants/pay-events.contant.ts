export const PAY_EVENTS = {
    REFRESH: "pay.refresh",
};
export type PAY_SCENE = "ALIPAY" | "WECHAT:APP" | "WECHAT:MP" | "WECHAT:OA";
/*
支付场景映射
ALIPAY只有一个场景，就是ALIPAY
WECHAT有多个场景，分别是PC、H5、APP、MP、OA，其中PC、H5、OA是同一个场景，APP、MP是同一个场景
*/
export const PAY_SCENE_MAP = {
    ALIPAY: {
        PC: "ALIPAY",
        H5: "ALIPAY",
        APP: "ALIPAY",
        MP: "ALIPAY",
        OA: "ALIPAY",
    },
    WECHAT: {
        PC: "WECHAT:OA",
        H5: "WECHAT:OA",
        APP: "WECHAT:APP",
        MP: "WECHAT:MP",
        OA: "WECHAT:OA",
    },
} as const;

/** 按支付类型聚合的缓存键（由 PAY_SCENE_MAP 派生，配置刷新时按 payType 清理对应缓存） */
export const PAY_SCENE_CACHE_KEYS_BY_PAY_TYPE: Record<
    keyof typeof PAY_SCENE_MAP,
    readonly PAY_SCENE[]
> = {
    WECHAT: [...new Set(Object.values(PAY_SCENE_MAP.WECHAT))],
    ALIPAY: [...new Set(Object.values(PAY_SCENE_MAP.ALIPAY))],
};
