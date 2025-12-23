import type { UserInfo } from "@buildingai/web-types";

import { apiHttpClient } from "../base";

export const getUserInfo = (): Promise<UserInfo> => {
    return apiHttpClient.get<UserInfo>("/user/info");
};
