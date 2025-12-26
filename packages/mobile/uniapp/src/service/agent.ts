/**
 * @fileoverview Web API service functions for AI agent management
 * @description This file contains API functions for AI agent management,
 * and related type definitions for the web frontend.
 *
 * @author BuildingAI Teams
 */

import type { Agent } from "@buildingai/service/consoleapi/ai-agent";
import type { PaginationResult } from "@buildingai/service/models/globals";
import type { QueryPublicAgentParams } from "@buildingai/service/webapi/ai-agent";
// ==================== Type Definitions ====================

/**
 * Get public agent list
 * @description Get paginated list of public agents with search and sorting support
 * @param params Query parameters
 * @returns Promise with paginated agent list
 */
export function apiGetPublicAgents(
    params: QueryPublicAgentParams,
): Promise<PaginationResult<Agent>> {
    return useWebGet("/ai-agents", params);
}
