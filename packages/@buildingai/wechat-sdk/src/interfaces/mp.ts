export interface Jscode2sessionResponse {
    openid: string;
    session_key: string;
    unionid?: string;
    errcode?: number;
    errmsg?: string;
}
export type WechatMpJscode2sessionResponse = Omit<Jscode2sessionResponse, "errcode" | "errmsg">;
