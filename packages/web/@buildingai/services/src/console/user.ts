import type { UserInfo } from "@buildingai/web-types";

import { consoleHttpClient } from "../base";

export const getUserInfo = (): Promise<UserInfo> => {
    return consoleHttpClient.get<UserInfo>("/user/info");
};
