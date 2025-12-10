/**
 * @fileoverview Console API service functions for financial center management
 * @description This file contains API functions for financial center operations,
 * financial statistics, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

// ==================== Type Definitions ====================

/**
 * Financial center information interface
 * @description Interface for financial center information with business, order, and user statistics
 */
export interface FinancialCenterInfo {
    /** Business overview */
    finance: Finance;
    /** Order overview */
    recharge: Recharge;
    /** User overview */
    user: User;
}

/**
 * Business overview interface
 * @description Interface for business financial statistics
 */
export interface Finance {
    /** Total income amount */
    totalIncomeAmount: number;
    /** Total order count */
    totalIncomeNum: number;
    /** Total net income */
    totalNetIncome: number;
    /** Total refund amount */
    totalRefundAmount: number;
    /** Total refund order count */
    totalRefundNum: number;
}

/**
 * Order overview interface
 * @description Interface for recharge order statistics
 */
export interface Recharge {
    /** Total recharge amount */
    rechargeAmount: number;
    /** Recharge net income */
    rechargeNetIncome: number;
    /** Recharge order count */
    rechargeNum: number;
    /** Total refund amount */
    rechargeRefundAmount: number;
    /** Refund order count */
    rechargeRefundNum: number;
}

/**
 * User overview interface
 * @description Interface for user statistics and consumption data
 */
export interface User {
    /** Total chat count */
    totalChatNum: number;
    /** Total remaining computing power */
    totalPowerSum: number;
    /** Total recharge amount */
    totalRechargeAmount: number;
    /** Total recharge user count */
    totalRechargeNum: number;
    /** Total user count */
    totalUserNum: number;
}

// ==================== Financial Center Related APIs ====================

/**
 * Get financial center information
 * @description Get comprehensive financial center information including business, order, and user statistics
 * @returns Promise with financial center information
 */
export function apiGetFinancialCenterInfo(): Promise<FinancialCenterInfo> {
    return useConsoleGet("/finance/center");
}
