export interface Link {
    path: string;
    name?: string;
    type: string;
    canTab: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query?: Record<string, any>;
}

export enum LinkTypeEnum {
    "SHOP_PAGES" = "shop",
    "CUSTOM_LINK" = "custom",
    "MINI_PROGRAM" = "mini_program",
}

export const isEmpty = (value: unknown) => {
    return value == null && typeof value == "undefined";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function objectToQuery(params: Record<string, any>): string {
    let query = "";
    for (const props of Object.keys(params)) {
        const value = params[props];
        if (!isEmpty(value)) {
            query += props + "=" + value + "&";
        }
    }
    return query.slice(0, -1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseQuery(query: string): Record<string, any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryObj: Record<string, any> = {};
    const queryArr = query.split("&");
    queryArr.forEach((item) => {
        const [key, value] = item.split("=");
        if (key && value) {
            queryObj[key] = value;
        }
    });
    return queryObj;
}

export function navigateTo(
    link: Link,
    navigateType: "navigateTo" | "switchTab" | "reLaunch" = "navigateTo",
) {
    // 如果是小程序跳转
    if (link.type === LinkTypeEnum.MINI_PROGRAM) {
        navigateToMiniProgram(link);
        return;
    }

    const url = link?.query ? `${link.path}?${objectToQuery(link?.query)}` : link.path;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (navigateType == "switchTab" || link.canTab) && uni.switchTab({ url });
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    navigateType == "navigateTo" && uni.navigateTo({ url });
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    navigateType == "reLaunch" && uni.reLaunch({ url });
}
export function navigateToMiniProgram(link: Link) {
    const query = link.query;
    // #ifdef H5
    window.open(
        `weixin://dl/business/?appid=${query?.appId}&path=${query?.path}&env_version=${
            query?.env_version
        }&query=${encodeURIComponent(query?.query)}`,
    );
    // #endif
    // #ifdef MP
    uni.navigateToMiniProgram({
        appId: query?.appId,
        path: query?.path,
        extraData: parseQuery(query?.query),
        envVersion: query?.env_version,
    });
    // #endif
}
