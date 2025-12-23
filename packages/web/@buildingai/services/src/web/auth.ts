import { type UserTerminalType } from "@buildingai/constants/shared";
import { UserInfo } from "@buildingai/web-types";

import { apiHttpClient } from "../base";

export function postLogin(data: {
    username: string;
    password: string;
    terminal: UserTerminalType;
}) {
    return apiHttpClient.post<{
        token: string;
        user: UserInfo;
        expiresAt: string;
    }>("/auth/login", data);
}
