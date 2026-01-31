/**
 * @fileoverview 支付相关 API
 * @description 支付方式列表、预支付等接口定义
 *
 * @author BuildingAI Teams
 */

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
    return useWebGet<PayWayItem[]>("/pay/payWayList");
}
