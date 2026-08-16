import { type SmsSceneType, type UserTerminalType } from "@buildingai/constants/shared";
import type { MutationOptionsUtil, UserInfo } from "@buildingai/web-types";
import { useMutation } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type LoginRequest = {
    username: string;
    password: string;
    terminal: UserTerminalType;
};

export type LoginResponse = {
    token: string;
    user: UserInfo;
    expiresAt: string;
};

export type RegisterRequest = {
    username: string;
    password: string;
    confirmPassword: string;
    terminal: UserTerminalType;
    nickname?: string;
    email?: string;
    phone?: string;
};

export type RegisterResponse = LoginResponse;

export type CheckAccountRequest = {
    account: string;
};

export type CheckAccountResponse = {
    hasAccount: boolean;
    type: string;
    hasPassword: boolean;
};

/**
 * 发送短信验证码请求参数
 */
export type SendSmsCodeRequest = {
    mobile: string;
    scene: SmsSceneType;
    areaCode?: string;
};

/**
 * 手机号短信登录请求参数
 */
export type SmsLoginRequest = {
    mobile: string;
    code: string;
    terminal: UserTerminalType;
    areaCode?: string;
};

/**
 * 发送短信验证码响应
 */
export type SendSmsCodeResponse = string;

/**
 * 手机号短信登录响应
 */
export type SmsLoginResponse = LoginResponse;

export function useLoginMutation(options?: MutationOptionsUtil<LoginResponse, LoginRequest>) {
    return useMutation<LoginResponse, Error, LoginRequest>({
        mutationFn: (vars) => apiHttpClient.post<LoginResponse>("/auth/login", vars),
        ...options,
    });
}

/**
 * 发送短信验证码
 */
export function useSendSmsCodeMutation(
    options?: MutationOptionsUtil<SendSmsCodeResponse, SendSmsCodeRequest>,
) {
    return useMutation<SendSmsCodeResponse, Error, SendSmsCodeRequest>({
        mutationFn: (vars) => apiHttpClient.post<SendSmsCodeResponse>("/auth/sms/send-code", vars),
        ...options,
    });
}

/**
 * 手机号短信登录
 */
export function useSmsLoginMutation(
    options?: MutationOptionsUtil<SmsLoginResponse, SmsLoginRequest>,
) {
    return useMutation<SmsLoginResponse, Error, SmsLoginRequest>({
        mutationFn: (vars) => apiHttpClient.post<SmsLoginResponse>("/auth/sms/login", vars),
        ...options,
    });
}

export function useRegisterMutation(
    options?: MutationOptionsUtil<RegisterResponse, RegisterRequest>,
) {
    return useMutation<RegisterResponse, Error, RegisterRequest>({
        mutationFn: (vars) => apiHttpClient.post<RegisterResponse>("/auth/register", vars),
        ...options,
    });
}

export function useCheckAccountMutation(
    options?: MutationOptionsUtil<CheckAccountResponse, CheckAccountRequest>,
) {
    return useMutation<CheckAccountResponse, Error, CheckAccountRequest>({
        mutationFn: (vars) => apiHttpClient.post<CheckAccountResponse>("/auth/check-account", vars),
        ...options,
    });
}

export type OAuthSessionResponse = {
    token: string;
    user: UserInfo;
};

export function exchangeOAuthCode(code: string) {
    return apiHttpClient.get<OAuthSessionResponse>("/auth/oauth/session", {
        params: { code },
    });
}

/** 微信扫码登录：获取二维码 */
export type WechatQrcodeResponse = {
    url: string;
    expire_seconds: number;
    key: string;
};

export function getWechatQrcode(expire_seconds: number = 60) {
    return apiHttpClient.get<WechatQrcodeResponse>("/auth/wechat-qrcode", {
        params: { expire_seconds },
    });
}

/** 微信扫码登录：轮询扫码状态 */
export type WechatQrcodeStatusResponse = {
    is_scan: boolean;
    token?: string;
    user?: UserInfo;
    error?: string;
};

export function getWechatQrcodeStatus(sceneStr: string) {
    return apiHttpClient.get<WechatQrcodeStatusResponse>(
        `/auth/wechat-qrcode-status/${encodeURIComponent(sceneStr)}`,
    );
}

/** 微信扫码绑定：轮询绑定状态（需登录，将 openid 绑定到当前用户） */
export type WechatQrcodeBindStatusResponse = {
    is_scan: boolean;
    is_processing?: boolean;
    success?: boolean;
    error?: string;
};

export function getWechatQrcodeBindStatus(sceneStr: string) {
    return apiHttpClient.get<WechatQrcodeBindStatusResponse>(
        `/auth/wechat-qrcode-bind-status/${encodeURIComponent(sceneStr)}`,
    );
}

/** 修改密码请求参数 */
export type ChangePasswordRequest = {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
};

export function useChangePasswordMutation(
    options?: MutationOptionsUtil<null, ChangePasswordRequest>,
) {
    return useMutation<null, Error, ChangePasswordRequest>({
        mutationFn: (body) => apiHttpClient.post<null>("/auth/change-password", body),
        ...options,
    });
}

export type LogoutResponse = {
    success: boolean;
    message: string;
};

export function useLogoutMutation(options?: MutationOptionsUtil<LogoutResponse, void>) {
    return useMutation<LogoutResponse, Error, void>({
        mutationFn: () => apiHttpClient.post<LogoutResponse>("/auth/logout"),
        ...options,
    });
}
