import {
    type BooleanNumberType,
    type UserTerminalType,
} from "@buildingai/constants/shared/status-codes.constant";
import { Role } from "@buildingai/db/entities";

export interface LoginUserPlayground {
    id: string;
    username: string;
    isRoot: BooleanNumberType;
    iat?: number;
    exp?: number;
    terminal?: UserTerminalType;
}

export interface UserPlayground extends LoginUserPlayground {
    permissions: string[];
    role: Role | null;
}
