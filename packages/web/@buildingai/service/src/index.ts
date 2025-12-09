/**
 * @fileoverview BuildingAI Service Package Entry Point
 * @description Main entry point for the BuildingAI service package.
 * This package provides API service functions for both web and console interfaces.
 *
 * @author BuildingAI Teams
 */

// Export common API services
export * from "./common";

// Export console API services
export * from "./consoleapi/account-balance";
export * from "./consoleapi/ai-agent";
export * from "./consoleapi/ai-conversation";
export * from "./consoleapi/ai-datasets";
export * from "./consoleapi/ai-model";
export * from "./consoleapi/ai-provider";
export * from "./consoleapi/common";
export * from "./consoleapi/decorate";
export * from "./consoleapi/extensions";
export * from "./consoleapi/financial-center";
export * from "./consoleapi/login-settings";
export * from "./consoleapi/mcp-server";
export * from "./consoleapi/menu";
export * from "./consoleapi/oaconfig";
export * from "./consoleapi/order-recharge";
export * from "./consoleapi/package-management";
export * from "./consoleapi/payconfig";
export * from "./consoleapi/permission";
export * from "./consoleapi/role";
export * from "./consoleapi/secret-list";
export * from "./consoleapi/secret-template";
export * from "./consoleapi/system";
export * from "./consoleapi/tag";
export * from "./consoleapi/user";
export * from "./consoleapi/website";

// Export web API services
export * from "./webapi/ai-agent";
export * from "./webapi/ai-agent-publish";
export * from "./webapi/ai-conversation";
export * from "./webapi/decorate";
export * from "./webapi/mcp-server";
export * from "./webapi/power-detail";
export * from "./webapi/purchase-record";
export * from "./webapi/recharge-center";
export * from "./webapi/tag";
export * from "./webapi/user";