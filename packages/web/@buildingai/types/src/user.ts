import { BooleanNumberType, UserCreateSourceType } from "@buildingai/constants/shared";

export interface UserInfo {
    id: string;
    createdAt: string;
    updatedAt: string;
    userNo: string;
    username: string;
    nickname: string;
    email: string;
    phone: string;
    phoneAreaCode: string;
    avatar: string;
    realName: string;
    totalRechargeAmount: number;
    status: BooleanNumberType;
    isRoot: BooleanNumberType;
    role: {
        id: string;
        createdAt: string;
        updatedAt: string;
        name: string;
        description: string;
        isDisabled: boolean;
    } | null;
    permissions: string[];
    lastLoginAt: string;
    power: number;
    source: UserCreateSourceType;
}
