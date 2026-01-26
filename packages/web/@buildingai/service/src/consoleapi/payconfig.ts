/**
 * @fileoverview Console API service functions for payment configuration management
 * @description This file contains API functions for payment configuration,
 * payment method settings, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type {
    AlipayPayConfigInfo,
    PayConfigInfo,
    PayConfigType,
    WeChatPayConfigInfo,
} from "@buildingai/constants/shared";
import { PayConfigPayType } from "@buildingai/constants/shared";

// ==================== Type Definitions ====================

/**
 * Payment method key type
 * @description Type for payment method keys
 */
export type PayConfigTypeKey = keyof typeof PayConfigPayType;

/**
 * Payment method display name mapping
 * @description Mapping of payment method values to display names
 */
export const PayConfigPayTypeLabels: Record<PayConfigType, string> = {
    [PayConfigPayType.WECHAT]: "WeChat Pay",
    [PayConfigPayType.ALIPAY]: "Alipay",
} as const;

/**
 * Payment configuration information interface
 * @description Interface for payment configuration details
 */
export interface PayconfigInfo {
    /** Configuration ID */
    id: string;
    /** Configuration name */
    name: string;
    /** Logo URL */
    logo: string;
    /** Enable status: 1-enabled, 0-disabled */
    isEnable: number;
    /** Default status: 1-default, 0-not default */
    isDefault: number;
    /** Payment type: 1-WeChat Pay, 2-Alipay */
    payType: PayConfigType;
    /** Sort order */
    sort: number;
    /** Payment version */
    payVersion: string;
    /** Merchant type */
    merchantType: string;
    /** Merchant ID */
    mchId: string;
    /** API key */
    apiKey: string;
    /** Payment signature key */
    paySignKey: string;
    /** Certificate */
    cert: string;
    /** Payment authorization directory */
    payAuthDir: string;
    /** Application ID */
    appId: string;
}

/**
 * Update payment configuration DTO interface
 * @description Interface for updating payment configuration
 */
export interface UpdatePayconfigDto {
    /** Configuration ID */
    id: string;
    /** Configuration name */
    name: string;
    /** Logo URL */
    logo: string;
    /** Enable status: 1-enabled, 0-disabled */
    isEnable: number;
    /** Default status: 1-default, 0-not default */
    isDefault: number;
    /** Payment version */
    payVersion: string;
    /** Merchant type */
    merchantType: string;
    /** Merchant ID */
    mchId: string;
    /** API key */
    apiKey: string;
    /** Payment signature key */
    paySignKey: string;
    /** Sort order */
    sort: number;
    /** Application ID */
    appId: string;
}

/**
 * Payment configuration table data type
 * @description Type for payment configuration list display
 */
export type PayconfigTableData = Pick<
    PayconfigInfo,
    "id" | "name" | "payType" | "isEnable" | "logo" | "isDefault" | "sort"
>;

/**
 * Boolean number type
 * @description Type for boolean values represented as numbers
 */
export type BooleanNumberType = 0 | 1;

// ==================== Payment Configuration Related APIs ====================

/**
 * Get payment configuration list
 * @description Get list of all payment configurations
 * @returns Promise with payment configuration list
 */
export function apiGetPayconfigList(): Promise<PayconfigTableData[]> {
    return useConsoleGet("/system-payconfig");
}

/**
 * Get payment configuration by ID
 * @description Get detailed payment configuration information by ID
 * @param id Payment configuration ID
 * @param _payType
 * @returns Promise with payment configuration details
 */
export function apiGetPayconfigById(
    id: string,
    _payType: typeof PayConfigPayType.WECHAT,
): Promise<WeChatPayConfigInfo>;
export function apiGetPayconfigById(
    id: string,
    _payType: typeof PayConfigPayType.ALIPAY,
): Promise<AlipayPayConfigInfo>;
export function apiGetPayconfigById(id: string): Promise<PayConfigInfo> {
    return useConsoleGet(`/system-payconfig/${id}`);
}

/**
 * Update payment configuration status
 * @description Update enable/disable status of payment configuration
 * @param id Payment configuration ID
 * @param isEnable Enable status: 1-enabled, 0-disabled
 * @returns Promise with updated payment configuration
 */
export function apiUpdatePayconfigStatus(
    id: string,
    isEnable: BooleanNumberType,
): Promise<PayconfigTableData> {
    return useConsolePatch(`/system-payconfig/${id}`, { isEnable });
}

/**
 * Update payment configuration
 * @description Update payment configuration settings
 * @param data Updated payment configuration data
 * @returns Promise with updated payment configuration
 */
export function apiUpdatePayconfig(data: PayConfigInfo): Promise<PayConfigInfo> {
    return useConsolePost(`/system-payconfig`, data);
}
