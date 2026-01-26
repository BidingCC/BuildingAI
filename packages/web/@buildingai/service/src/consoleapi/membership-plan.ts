/**
 * @fileoverview Console API service functions for membership plan management
 * @description This file contains API functions for membership plan configuration,
 * authentication methods, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity } from "../models/globals";
import type { LevelFormData } from "./membership-level";

export enum MembershipPlanDuration {
    MONTH = 1,
    QUARTER = 2,
    HALF = 3,
    YEAR = 4,
    FOREVER = 5,
    CUSTOM = 6,
}

export interface Duration {
    value: number;
    unit: string;
}

export interface Billing {
    levelId: string;
    salesPrice: number;
    originalPrice: number;
    label: string;
    status: boolean;
}

export interface Plan {
    id: string;
    name: string;
    durationConfig: MembershipPlanDuration;
    levelCount: number;
    status: boolean;
    sort: number;
    duration: Duration;
    levels: LevelFormData[];
}

export interface PlanFormData {
    plansStatus: boolean;
    plans: Plan[];
}

export interface PlanDetail extends BaseEntity {
    name: string;
    label: string;
    durationConfig: MembershipPlanDuration;
    status: boolean;
    sort: number;
    duration: Duration;
    billing: Billing[];
}

export interface PlanCreateRequest
    extends Omit<PlanDetail, "id" | "createdAt" | "updatedAt" | "status" | "sort"> {}

export interface PlanUpdateRequest extends PlanCreateRequest {
    id: string;
}

/**
 * Get plan list
 * @returns Promise with plan list
 */
export const apiGetPlanList = (): Promise<PlanFormData> => {
    return useConsoleGet("/plans");
};

/**
 * Enable and disable membership function
 * @param data Plan data
 * @returns Promise with updated plan
 */
export const apiUpdateMembershipStatus = (data: { status: boolean }): Promise<PlanFormData> => {
    return useConsolePost("/plans/setConfig", data);
};

/**
 * Update plan status
 * @param data Plan data
 * @returns Promise with updated plan
 */
export const apiUpdatePlanStatus = (id: string, data: { status: boolean }): Promise<Plan> => {
    return useConsolePost(`/plans/setPlanStatus/${id}`, data);
};

/**
 * Update plan sort
 * @param data Plan data
 * @returns Promise with updated plan
 */
export const apiUpdatePlanSort = (id: string, data: { sort: number }): Promise<Plan> => {
    return useConsolePatch(`/plans/setPlanSort/${id}`, data);
};

/**
 * Update plan
 * @param id Plan id
 * @param data Plan data
 * @returns Promise with updated plan
 */
export const apiUpdatePlan = (id: string, data: PlanUpdateRequest): Promise<Plan> => {
    return useConsolePatch(`/plans/${id}`, data);
};

/**
 * Get plan detail
 * @param id Plan id
 * @returns Promise with plan detail
 */
export const apiGetPlanDetail = (id: string): Promise<PlanDetail> => {
    return useConsoleGet(`/plans/${id}`);
};

/**
 * Create plan
 * @param data Plan data
 * @returns Promise with created plan
 */
export const apiCreatePlan = (data: PlanCreateRequest): Promise<Plan> => {
    return useConsolePost("/plans", data);
};

/**
 * Delete plan
 * @param id Plan id
 * @returns Promise with deleted plan
 */
export const apiDeletePlan = (id: string): Promise<Plan> => {
    return useConsoleDelete(`/plans/${id}`);
};
