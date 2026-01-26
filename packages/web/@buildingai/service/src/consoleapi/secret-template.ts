/**
 * @fileoverview Console API service functions for Secret template management
 * @description This file contains API functions for Secret template CRUD operations,
 * template configuration management, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

// ==================== Type Definitions ====================

/**
 * Secret template create/update request interface
 * @description Interface for Secret template creation and update requests
 */
export interface SecretTemplateRequest {
    id: string;
    fieldConfig: FieldConfig[];
    icon: string;
    isEnabled: number;
    name: string;
    sortOrder: number;
    type: string;
    secretConfigs?: SecretConfig[];
    Secrets?: SecretConfig[]; // Backend uses 'Secrets' field name
    createdAt: string;
    updatedAt: string;
}

/**
 * Secret template form data interface
 * @description Interface for form data used in create/edit forms
 */
export interface SecretTemplateFormData {
    id?: string;
    fieldConfig: FieldConfig[];
    icon: string;
    isEnabled: number;
    name: string;
    sortOrder?: number;
    type?: string;
    secretConfigs?: SecretConfig[];
}

/**
 * Field configuration interface
 * @description Interface for field configuration in Secret templates
 */
export interface FieldConfig {
    name: string;
    placeholder: string;
    required: boolean;
    type: string;
}

/**
 * Secret configuration interface
 * @description Interface for Secret configuration details
 */
export interface SecretConfig {
    id: string;
    name: string;
    templateId: string;
    fieldValues: { name: string; value: string }[];
    remark: string;
    status: number;
    lastUsedAt: string | null;
    usageCount: number;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * Secret template list interface
 * @description Interface for paginated Secret template list response
 */
export interface SecretTemplateList {
    items: SecretTemplateRequest[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

/**
 * Secret template list parameters interface
 * @description Interface for Secret template list query parameters
 */
export interface SecretTemplateListParams {
    name?: string;
    page: number;
    pageSize: number;
}

// ==================== Secret Template Management Related APIs ====================

/**
 * Create secret template
 * @description Creates a new secret template
 * @param data Template form data
 * @returns Promise with creation result
 */
export const createSecretTemplate = (data: SecretTemplateFormData) => {
    return useConsolePost("/secret-templates", data);
};

/**
 * Import secret template from JSON
 * @description Imports a secret template from JSON data
 * @param data Import data containing JSON string
 * @returns Promise with import result
 */
export const importSecretTemplate = (data: { jsonData: string }) => {
    return useConsolePost("/secret-templates/import/json", data);
};

/**
 * Get secret template list (paginated)
 * @description Retrieves paginated list of secret templates
 * @param params Query parameters including pagination
 * @returns Promise with paginated template list
 */
export const getSecretTemplateList = (
    params: SecretTemplateListParams,
): Promise<SecretTemplateList> => {
    return useConsoleGet("/secret-templates", params);
};

/**
 * Get secret template list (all enabled)
 * @description Retrieves all enabled secret templates without pagination
 * @returns Promise with all enabled templates
 */
export const getSecretTemplateListAll = (): Promise<SecretTemplateRequest[]> => {
    return useConsoleGet("/secret-templates/enabled/all");
};

/**
 * Get all secret templates (including enabled and disabled)
 * @description Retrieves all secret templates without pagination, including both enabled and disabled ones
 * @returns Promise with all templates
 */
export const getAllSecretTemplates = (): Promise<SecretTemplateRequest[]> => {
    return useConsoleGet("/secret-templates/all");
};

/**
 * Get secret template details
 * @description Retrieves detailed information for a specific template
 * @param id Template ID
 * @returns Promise with template details
 */
export const getSecretTemplateDetail = (id: string): Promise<SecretTemplateRequest> => {
    return useConsoleGet(`/secret-templates/${id}`);
};

/**
 * Update secret template
 * @description Updates an existing secret template
 * @param id Template ID
 * @param data Updated template form data
 * @returns Promise with update result
 */
export const updateSecretTemplate = (id: string, data: SecretTemplateFormData) => {
    return useConsolePatch(`/secret-templates/${id}`, data);
};

/**
 * Update secret template status
 * @description Updates the enabled status of a template
 * @param id Template ID
 * @param data Status update data
 * @returns Promise with status update result
 */
export const updateSecretTemplateStatus = (id: string, data: { isEnabled: number }) => {
    return useConsolePatch(`/secret-templates/${id}/enabled`, data);
};

/**
 * Delete secret template
 * @description Deletes a specific secret template
 * @param id Template ID
 * @returns Promise with deletion result
 */
export const deleteSecretTemplate = (id: string) => {
    return useConsoleDelete(`/secret-templates/${id}`);
};

/**
 * Batch delete secret templates
 * @description Deletes multiple secret templates at once
 * @param ids Array of template IDs to delete
 * @returns Promise with batch deletion result
 */
export const deleteSecretTemplates = (ids: string[]) => {
    return useConsoleDelete(`/secret-templates`, { ids });
};
