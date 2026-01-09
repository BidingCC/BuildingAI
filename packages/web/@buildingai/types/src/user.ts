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
    menus: MenuItem[];
    permissionsCodes: string[];
    membershipLevel: {
        id: string | null;
        name: string | null;
        icon: string | null;
    };
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

export interface MenuItem {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    code: string;
    path: string;
    icon: string;
    component: string;
    permissionCode: string;
    parentId: string;
    sort: number;
    isHidden: number;
    type: number;
    sourceType: number;
    children: MenuItem[];
}
