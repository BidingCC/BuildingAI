import { ExtensionSupportTerminalType, ExtensionTypeType } from "@buildingai/constants";
import { DynamicModule } from "@nestjs/common";

/**
 * Extension package.json file structure
 */
export interface ExtensionPackageJson {
    name: string;
    key: string;
    version: string;
    enabled: boolean;
    title: string;
    description: string;
    author: {
        avatar: string;
        name: string;
        homepage: string;
    };
    homepage: string;
}

/**
 * Extension Directory manifest.json file structure
 */
export interface ExtensionMinifestJson {
    name: string;
    key: string;
    version: string;
    title: string;
    description: string;
    author: string;
    homepage: string;
}

/**
 * 插件信息接口
 */
export interface ExtensionInfo {
    /** 插件名称 */
    name: string;
    /** 插件标识符(用于与数据库匹配) */
    identifier: string;
    /** 插件路径 */
    path: string;
    /** 是否启用 */
    enabled: boolean;
    /** 插件版本 */
    version: string;
    /** 插件描述 */
    description?: string;
    /** 平台版本兼容范围 */
    engine: string;
    /** 插件作者 */
    author?: {
        avatar?: string;
        name: string;
        homepage?: string;
    };
    /** 插件模块 */
    module?: DynamicModule;
}

export interface ApplicationListItem {
    id: string;
    name: string;
    identifier: string;
    key?: string;
    newVersion?: string;
    version: string;
    description: string;
    icon: string;
    type: ExtensionTypeType;
    supportTerminal: ExtensionSupportTerminalType[];
    isLocal: boolean;
    status: number;
    isCompatible: boolean | null;
    author: {
        avatar: string;
        name: string;
        homepage: string;
    };
    content: string;
    createdAt: string;
    updatedAt: string;
    purchasedAt: string;
}

/**
 * Extension manifest structure in extensions.json
 */
export interface ExtensionManifest {
    identifier: string;
    name: string;
    type: string;
    version: string;
    description: string;
    homepage: string;
    author: {
        avatar: string;
        name: string;
        homepage: string;
    };
    changelog: {
        version: string;
        date: string;
        changes: string[];
    }[];
    engine: {
        buildingai: string;
    };
}

/**
 * Extension configuration structure in extensions.json
 */
export interface ExtensionConfig {
    manifest: ExtensionManifest;
    isLocal: boolean;
    enabled: boolean;
}

/**
 * Extensions.json file structure
 */
export interface ExtensionsJsonConfig {
    applications: Record<string, ExtensionConfig>;
    functionals: Record<string, ExtensionConfig>;
}
