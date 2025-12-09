/**
 * @fileoverview Console API service functions for package management
 * @description This file contains API functions for package management,
 * recharge configuration, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity } from "../models/globals";

// ==================== Type Definitions ====================

/**
 * Recharge configuration data interface
 * @description Interface for recharge configuration response data
 */
export interface RechargeConfigData {
    /** Recharge explanation */
    rechargeExplain: string;
    /** Recharge rules */
    rechargeRule: RechargeRule[];
    /** Recharge switch: true-enabled, false-disabled */
    rechargeStatus: boolean;
}

/**
 * Recharge rule interface
 * @description Interface for individual recharge rule configuration
 */
export interface RechargeRule extends BaseEntity {
    /** Gift power amount */
    givePower: number;
    /** Rule label */
    label: string;
    /** Recharge power amount */
    power: number;
    /** Selling price */
    sellPrice: string | number;
}

// ==================== Package Management Related APIs ====================

/**
 * Get recharge configuration
 * @description Get current recharge configuration settings
 * @returns Promise with recharge configuration data
 */
export const apiGetRechargeRules = (): Promise<RechargeConfigData> => {
    return useConsoleGet("/recharge-config");
};

/**
 * Save recharge configuration
 * @description Save recharge configuration settings
 * @param data Recharge configuration data
 * @returns Promise with operation result
 */
export const saveRechargeRules = (data: RechargeConfigData): Promise<void> => {
    return useConsolePost("/recharge-config", data);
};
