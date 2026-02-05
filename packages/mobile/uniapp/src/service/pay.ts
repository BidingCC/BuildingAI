/**
 * @fileoverview 支付相关 API
 * @description 支付方式列表、预支付等接口定义
 *
 * @author BuildingAI Teams
 */

import type { OrderPayFromType } from "@buildingai/constants/shared/payconfig.constant";
import { getTerminal } from "@/utils/env";

// ==================== 支付方式列表 ====================

/**
 * 支付方式项（与后端 Payconfig 返回字段一致）
 */
export interface PayWayItem {
    /** 配置 id */
    id: string;
    /** 支付方式名称，如：微信支付、支付宝 */
    name: string;
    /** 支付类型：1 微信 2 支付宝 */
    payType: number;
    /** 图标 URL */
    logo: string;
    /** 排序，数值越大越靠前 */
    sort: number;
    /** 是否默认：1 是 0 否 */
    isDefault: number;
}

/**
 * 获取已启用的支付方式列表
 * @description 供前端选择支付方式，仅返回已启用且不包含敏感配置的项
 * @returns 支付方式列表
 */
export function apiGetPayWayList(): Promise<PayWayItem[]> {
    return useWebGet<PayWayItem[]>(`/pay/payWayList?scene=${getTerminal()}`);
}

// ==================== 预支付 ====================

/** 预支付请求参数（与后端 PrepayDto 一致） */
export interface PrepaidParams {
    /** 订单来源：OrderPayFrom.RECHARGE | OrderPayFrom.MEMBERSHIP */
    from: OrderPayFromType;
    /** 订单 ID */
    orderId: string;
    /** 支付类型：1 微信 2 支付宝 */
    payType: number;
    /** 终端场景（与 getTerminal() 一致） */
    scene: number;
}

/** 预支付返回：微信 Native(qrCode) / 微信 JSAPI 调起参数 / 支付宝(payForm) */
export interface PrepaidInfo {
    payType: number;
    /** 微信 JSAPI 调起参数（小程序、公众号、APP） */
    timeStamp?: string;
    nonceStr?: string;
    package?: string;
    signType?: "RSA";
    paySign?: string;
    /** 支付宝 H5 支付表单 HTML */
    payForm?: string;
}

/**
 * 预支付
 * @description 调用 POST /pay/prepay，获取调起支付所需参数
 * @param data 预支付参数（orderId、payType、from、scene）
 * @returns 预支付结果（qrCode / JSAPI 参数 / payForm）
 */
export function apiPostPrepaid(data: PrepaidParams): Promise<PrepaidInfo> {
    return useWebPost<PrepaidInfo>("/pay/prepay", data);
}

// ==================== 支付结果 ====================

/** 支付结果（与后端 getPayResult 一致：recharge 用 payStatus，membership 用 payState） */
export interface PayResult {
    orderNo: string;
    /** 充值订单：0 未支付 1 已支付 */
    payStatus?: number;
    /** 会员订单：0 未支付 1 已支付 */
    payState?: number;
}

/**
 * 查询支付结果
 */
export function apiGetPayResult(params: {
    orderId: string;
    from: OrderPayFromType;
}): Promise<PayResult> {
    return useWebGet<PayResult>("/pay/getPayResult", params);
}
