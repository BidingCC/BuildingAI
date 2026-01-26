/**
 * @fileoverview Console API service functions for extension management
 * @description This file contains API functions for extension CRUD operations,
 * status management, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import {
    type ExtensionStatusType,
    type ExtensionSupportTerminalType,
    type ExtensionTypeType,
} from "@buildingai/constants/shared/extension.constant";

import type {
    BaseCreateRequest,
    BaseEntity,
    BaseUpdateRequest,
    Pagination,
    PaginationResult,
} from "../models/globals";

// ==================== Type Definitions ====================

/**
 * Extension form data interface
 * @description Interface for extension form data based on backend actual fields
 */
export interface ExtensionFormData extends BaseEntity {
    /** Extension name */
    name: string;
    /** Extension identifier (unique) */
    identifier: string;
    /** Extension description */
    description?: string;
    /** Extension icon URL */
    icon?: string;
    /** Extension version */
    version: string;
    /** Extension type */
    type: ExtensionTypeType;
    /** Extension supported terminal types */
    supportTerminal?: ExtensionSupportTerminalType[];
    /** Extension status */
    status: ExtensionStatusType;
    engine: string;
    /** Extension configuration */
    config?: Record<string, any>;
    /** Extension dependencies */
    dependencies?: string[];
    /** Extension author */
    author?: { avatar: string; name: string; homepage: string };
    /** Extension homepage URL */
    homepage?: string;
    /** Extension repository URL */
    repository?: string;
    /** Extension license */
    license?: string;
    /** Extension keywords */
    keywords?: string[];
    /** Extension installation path */
    installPath?: string;
    /** Extension installation time */
    installedAt?: string;
    /** Whether it is a local development plugin */
    isLocal?: boolean;
    /** Extension version compatible */
    isCompatible?: boolean;
    /** Extension version list */
    versionLists?: ExtensionVersion[];
    /** Extension user */
    user?: string;
    /** Extension describe */
    describe?: string;
    /** Extension alias */
    alias?: string;
    /** Extension alias description */
    aliasDescription?: string;
    /** Extension alias icon */
    aliasIcon?: string;
    /** Extension alias show */
    aliasShow?: boolean;
}

export interface AppInfo {
    appsNo: string;
    cover: string;
    describe: string;
    icon: string;
    key: string;
    name: string;
}

/**
 * Extension query request parameters interface
 * @description Interface for extension query request parameters
 */
export interface ExtensionQueryRequest extends Pagination {
    /** Extension name (fuzzy search) */
    name?: string;
    /** Extension type */
    type?: ExtensionTypeType;
    /** Extension supported terminal types */
    supportTerminal?: ExtensionSupportTerminalType[];
    /** Extension status */
    status?: ExtensionStatusType;
    /** Sort field */
    sortBy?: string;
    /** Sort order */
    sortOrder?: "asc" | "desc";
}

/**
 * Extension creation request type
 * @description Excludes auto-generated fields from ExtensionFormData
 */
export type ExtensionCreateRequest = BaseCreateRequest<ExtensionFormData>;

/**
 * Extension update request type
 * @description Inherits from creation request and makes all fields optional
 */
export type ExtensionUpdateRequest = BaseUpdateRequest<ExtensionFormData>;

/**
 * Batch update status request interface
 * @description Interface for batch updating extension status
 */
export interface BatchUpdateStatusRequest {
    /** Extension IDs to update */
    ids: string[];
    /** New status to set */
    status: ExtensionStatusType;
}

/**
 * Extension identifier check response interface
 * @description Interface for extension identifier existence check response
 */
export interface ExtensionIdentifierCheckResponse {
    /** Whether identifier exists */
    exists: boolean;
}

/**
 * Batch operation response interface
 * @description Interface for batch operation responses
 */
export interface BatchOperationResponse {
    /** Operation message */
    message: string;
    /** Affected count */
    count?: number;
    /** Deleted count */
    deleted?: number;
}

/**
 * Platform secret response interface
 * @description Interface for platform secret response
 */
export interface PlatformSecretResponse {
    /** Platform secret key */
    platformSecret: string;
    /** Platform information */
    platformInfo: PlatformInfo | null;
}

/**
 * Platform information interface
 * @description Interface for platform information
 */
export interface PlatformInfo {
    /** Platform name */
    websiteName?: string;
    /** Platform Icon */
    websiteIcon?: string;
    /** Platform App Count */
    appCount?: number;
}

/**
 * Platform secret request interface
 * @description Interface for setting platform secret
 */
export interface PlatformSecretRequest {
    /** Platform secret key */
    platformSecret: string;
}

/**
 * Extension version interface
 * @description Interface for extension version
 */
export interface ExtensionVersion {
    version: string;
    createdAt: string;
    explain: string;
}

/**
 * Extension install request interface
 * @description Interface for extension install request
 */
export interface ExtensionInstallRequest {
    /** Extension identifier */
    identifier?: string;
    /** Extension version to install */
    version?: string;
}

// ==================== Extension Management Related APIs ====================

/**
 * Create extension
 * @description Creates a new extension
 * @param data Creation data
 * @returns Promise with creation result
 */
export function apiCreateExtension(data: ExtensionCreateRequest): Promise<ExtensionFormData> {
    return useConsolePost("/extensions", data, {
        timeout: 1800000,
    });
}

/**
 * Get extension paginated list
 * @description Retrieves paginated list of extensions based on query parameters
 * @param params Query parameters
 * @returns Promise with extension paginated list
 */
export function apiGetExtensionList(
    params?: ExtensionQueryRequest,
): Promise<PaginationResult<ExtensionFormData>> {
    return useConsoleGet("/extensions", params);
}

/**
 * Get all enabled extensions
 * @description Retrieves list of all enabled extensions
 * @returns Promise with enabled extensions list
 */
export function apiGetAllEnabledExtensions(): Promise<ExtensionFormData[]> {
    return useConsoleGet("/extensions/enabled/all");
}

/**
 * Get all local development extensions
 * @description Retrieves list of all local development extensions
 * @returns Promise with local extensions list
 */
export function apiGetAllLocalExtensions(): Promise<ExtensionFormData[]> {
    return useConsoleGet("/extensions/local/all");
}

/**
 * Get extensions by type
 * @description Retrieves extensions filtered by type
 * @param type Extension type
 * @param onlyEnabled Whether to return only enabled extensions
 * @returns Promise with extensions list
 */
export function apiGetExtensionsByType(
    type: ExtensionTypeType,
    onlyEnabled?: boolean,
): Promise<ExtensionFormData[]> {
    const params = onlyEnabled !== undefined ? { onlyEnabled } : {};
    return useConsoleGet(`/extensions/type/${type}`, params);
}

/**
 * Get extension by identifier
 * @description Retrieves extension details by identifier
 * @param identifier Extension identifier
 * @returns Promise with extension details
 */
export function apiGetExtensionByIdentifier(identifier: string): Promise<ExtensionFormData> {
    return useConsoleGet(`/extensions/identifier/${identifier}`);
}

/**
 * Plugin layout configuration interface
 * @description Interface for plugin layout configuration returned from backend
 */
export interface PluginLayoutConfig {
    /** Plugin manifest.json content */
    manifest: {
        identifier: string;
        name: string;
        type: string;
        version: string;
        description: string;
        homepage?: string;
        author?: {
            name: string;
            homepage: string;
        };
        changelog?: any[];
    } | null;
    /** Console menu configuration array */
    consoleMenu: any[] | null;
}

/**
 * Get extension plugin layout configuration
 * @description Retrieves router.options and manifest.json for plugin layout
 * @param identifier Extension identifier
 * @returns Promise with plugin layout configuration
 */
export function apiGetExtensionPluginLayout(identifier: string): Promise<PluginLayoutConfig> {
    return useConsoleGet(`/extensions/${identifier}/plugin-layout`);
}

/**
 * Check extension identifier existence
 * @description Checks if a extension identifier already exists
 * @param identifier Extension identifier to check
 * @param excludeId Extension ID to exclude from check (for update operations)
 * @returns Promise with existence check result
 */
export function apiCheckExtensionIdentifier(
    identifier: string,
    excludeId?: string,
): Promise<ExtensionIdentifierCheckResponse> {
    const params = excludeId ? { excludeId } : {};
    return useConsoleGet(`/extensions/check-identifier/${identifier}`, params);
}

/**
 * Get extension versions
 * @description Retrieves extension details by homepage
 * @param identifier Extension identifier
 * @returns Promise with extension versions
 */
export function apiGetExtensionVersions(identifier: string): Promise<ExtensionVersion[]> {
    return useConsoleGet(`/extensions/versions/${identifier}`);
}

/**
 * Get extension details
 * @description Retrieves detailed information for a specific extension
 * @param id Extension ID
 * @returns Promise with extension details
 */
export function apiGetExtensionDetail(id: string): Promise<ExtensionFormData> {
    return useConsoleGet(`/extensions/${id}`);
}

/**
 * Get extension details
 * @description Retrieves detailed information for a specific extension
 * @param id Extension ID
 * @returns Promise with extension details
 */
export function apiGetExtensionDetailByIdentifier(identifier: string): Promise<ExtensionFormData> {
    return useConsoleGet(`/extensions/detail/${identifier}`);
}

/**
 * Update extension
 * @description Updates an existing extension
 * @param id Extension ID
 * @param data Update data
 * @returns Promise with update result
 */
export function apiUpdateExtension(
    id: string,
    data: ExtensionUpdateRequest,
): Promise<ExtensionFormData> {
    return useConsolePatch(`/extensions/${id}`, data);
}

/**
 * Install extension
 * @description Installs an extension from the market
 * @param identifier Extension identifier
 * @param version Optional version to install
 * @returns Promise with installed extension data
 */
export function apiInstallExtension(
    identifier: string,
    version?: string,
): Promise<ExtensionFormData> {
    const data: ExtensionInstallRequest = version ? { version } : {};
    return useConsolePost(`/extensions/install/${identifier}`, data, {
        timeout: 1800000,
    });
}

/**
 * Install extension by activation code
 * @description Installs an extension by activation code
 * @param activationCode Activation code
 * @returns Promise with installed extension data
 */
export function apiInstallByActivationCode(
    activationCode: string,
    identifier: string,
    version?: string,
): Promise<ExtensionFormData> {
    const data: ExtensionInstallRequest = version ? { version, identifier } : { identifier };
    return useConsolePost(`/extensions/install-by-activation-code/${activationCode}`, data, {
        timeout: 1800000,
    });
}

/**
 * Upgrade extension content
 */
export function apiUpgradeExtensionContent(identifier: string): Promise<ExtensionFormData> {
    return useConsoleGet(`/extensions/upgrade-content/${identifier}`);
}

/**
 * Get application by activation code
 * @description Get application information by activation code
 * @param activationCode Activation code
 * @returns Promise with application data
 */
export function apiGetApplicationByActivationCode(activationCode: string): Promise<AppInfo> {
    return useConsoleGet(`/extensions/get-by-activation-code/${activationCode}`);
}

/**
 * Upgrade extension
 * @description Upgrades an extension to the latest version
 * @param identifier Extension identifier
 * @returns Promise with upgraded extension data
 */
export function apiUpgradeExtension(identifier: string): Promise<ExtensionFormData> {
    return useConsolePost(
        `/extensions/upgrade/${identifier}`,
        {},
        {
            timeout: 1800000,
        },
    );
}

/**
 * Uninstall extension
 * @description Uninstalls an extension by identifier
 * @param identifier Extension identifier
 * @returns Promise with operation result
 */
export function apiUninstallExtension(identifier: string): Promise<boolean> {
    return useConsoleDelete(`/extensions/uninstall/${identifier}`);
}

/**
 * Enable extension
 * @description Enables a specific extension
 * @param id Extension ID
 * @returns Promise with operation result
 */
export function apiEnableExtension(id: string): Promise<ExtensionFormData> {
    return useConsolePatch(
        `/extensions/${id}/enable`,
        {},
        {
            timeout: 1800000,
        },
    );
}

/**
 * Disable extension
 * @description Disables a specific extension
 * @param id Extension ID
 * @returns Promise with operation result
 */
export function apiDisableExtension(id: string): Promise<ExtensionFormData> {
    return useConsolePatch(
        `/extensions/${id}/disable`,
        {},
        {
            timeout: 1800000,
        },
    );
}

/**
 * Set extension status
 * @description Sets the status of a specific extension
 * @param id Extension ID
 * @param status New extension status
 * @returns Promise with operation result
 */
export function apiSetExtensionStatus(
    id: string,
    status: ExtensionStatusType,
): Promise<ExtensionFormData> {
    return useConsolePatch(`/extensions/${id}/status`, { status });
}

/**
 * Batch update extension status
 * @description Updates status for multiple extensions at once
 * @param data Batch update data
 * @returns Promise with operation result
 */
export function apiBatchUpdateExtensionStatus(
    data: BatchUpdateStatusRequest,
): Promise<BatchOperationResponse> {
    return useConsolePatch("/extensions/batch-status", data);
}

/**
 * Delete extension
 * @description Deletes a specific extension
 * @param id Extension ID
 * @returns Promise with deletion result
 */
export function apiDeleteExtension(id: string): Promise<{
    message: string;
}> {
    return useConsoleDelete(`/extensions/${id}`);
}

/**
 * Batch delete extensions
 * @description Deletes multiple extensions at once
 * @param ids Array of extension IDs to delete
 * @returns Promise with deletion result
 */
export function apiBatchDeleteExtensions(ids: string[]): Promise<BatchOperationResponse> {
    return useConsoleDelete("/extensions", { ids });
}

// ==================== Platform Secret Management Related APIs ====================

/**
 * Get platform secret
 * @description Retrieves the platform secret key and related information
 * @returns Promise with platform secret response
 */
export function apiGetPlatformSecret(): Promise<PlatformSecretResponse> {
    return useConsoleGet("/extensions/platform-secret");
}

/**
 * Set platform secret
 * @description Sets the platform secret key
 * @param data Platform secret request data
 * @returns Promise with operation result
 */
export function apiSetPlatformSecret(data: PlatformSecretRequest): Promise<boolean> {
    return useConsolePost("/extensions/platform-secret", data);
}

/**
 * Sync member features response interface
 * @description Interface for sync member features response
 */
export interface SyncMemberFeaturesResponse {
    /** Operation message */
    message: string;
    /** Added count */
    added: number;
    /** Updated count */
    updated: number;
    /** Removed count */
    removed: number;
    /** Total count */
    total: number;
}

/**
 * Sync extension member features
 * @description Scans and syncs @MemberOnly decorated features to database
 * @param identifier Extension identifier
 * @returns Promise with sync result
 */
export function apiSyncExtensionMemberFeatures(
    identifier: string,
): Promise<SyncMemberFeaturesResponse> {
    return useConsolePost(`/extensions/sync-member-features/${identifier}`, {});
}

/**
 * Extension feature interface
 */
export interface ExtensionFeatureItem {
    id: string;
    featureCode: string;
    name: string;
    description?: string;
    extensionId: string;
    status: boolean;
    membershipLevels: Array<{ id: string; name: string; level: number }>;
    createdAt: string;
    updatedAt: string;
}

/**
 * Get extension features
 * @param identifier Extension identifier
 * @returns Promise with features list
 */
export function apiGetExtensionFeatures(identifier: string): Promise<ExtensionFeatureItem[]> {
    return useConsoleGet(`/extensions/features/${identifier}`);
}

/**
 * Update feature membership levels
 * @param featureId Feature ID
 * @param levelIds Membership level IDs
 * @returns Promise with updated feature
 */
export function apiUpdateFeatureLevels(
    featureId: string,
    levelIds: string[],
): Promise<ExtensionFeatureItem> {
    return useConsolePatch(`/extensions/features/${featureId}/levels`, { levelIds });
}
