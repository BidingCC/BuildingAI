import { AppConfig } from "@buildingai/config";
import { ExtensionDownloadType, ExtensionStatus } from "@buildingai/constants";
import { DICT_GROUP_KEYS, DICT_KEYS } from "@buildingai/constants/server/dict-key.constant";
import {
    ApplicationListItem,
    getExtensionEnabledStatus,
    isExtensionCompatible,
} from "@buildingai/core/modules";
import { ExtensionDetailType, ExtensionsService, PlatformInfo } from "@buildingai/core/modules";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { createHttpClient, HttpClientInstance } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";
import { machineId, machineIdSync } from "node-machine-id";
import * as semver from "semver";

/**
 * Extension market service
 */
@Injectable()
export class ExtensionMarketService {
    private readonly logger = new Logger(ExtensionMarketService.name);
    private readonly httpClient: HttpClientInstance;
    private readonly appsMarketHttpClient: HttpClientInstance;
    private platformSecret: string | null = null;

    constructor(
        private readonly dictService: DictService,
        private readonly extensionsService: ExtensionsService,
    ) {
        const baseApiUrl = process.env.EXTENSION_API_URL || "https://cloud.buildingai.cc/api";

        this.httpClient = createHttpClient({
            baseURL: baseApiUrl + "/market",
            timeout: 20000,
            retryConfig: {
                retries: 3,
                retryDelay: 1000,
            },
            logConfig: {
                enableErrorLog: true,
            },
            headers: {
                Domain: process.env.APP_DOMAIN,
                "platform-version": AppConfig.version,
            },
        });

        // 创建 apps-market 专用的 httpClient
        this.appsMarketHttpClient = createHttpClient({
            baseURL: baseApiUrl + "/apps-market",
            timeout: 20000,
            retryConfig: {
                retries: 3,
                retryDelay: 1000,
            },
            logConfig: {
                enableErrorLog: true,
            },
            headers: {
                Domain: process.env.APP_DOMAIN,
                "platform-version": AppConfig.version,
            },
        });

        // 添加请求拦截器,动态获取平台密钥
        const addAuthInterceptor = (client: HttpClientInstance) => {
            client.interceptors.request.use(async (config) => {
                // 如果内存中没有，尝试从数据库加载一次
                if (!this.platformSecret) {
                    this.platformSecret = await this.dictService.get<string | null>(
                        DICT_KEYS.PLATFORM_SECRET,
                        null,
                        DICT_GROUP_KEYS.APPLICATION,
                    );
                }

                if (this.platformSecret) {
                    config.headers["X-API-Key"] = this.platformSecret;
                }

                return config;
            });
        };

        addAuthInterceptor(this.httpClient);
        addAuthInterceptor(this.appsMarketHttpClient);
    }

    isVersionInRange(version: string, range: string): boolean {
        if (!semver.valid(version)) return false;

        if (!semver.validRange(range)) return false;

        return semver.satisfies(version, range);
    }

    /**
     * Get platform info
     */
    async getPlatformInfo(platformSecret?: string): Promise<PlatformInfo | null> {
        const originalSecret = this.platformSecret;

        try {
            if (platformSecret) {
                this.platformSecret = platformSecret;
            }

            const response = await this.httpClient.get("/getPlatform");
            return response.data;
        } catch (error) {
            if (platformSecret) {
                this.platformSecret = originalSecret;
            }
            return null;
        }
    }

    /**
     * Get application list
     */
    async getApplicationList(): Promise<ApplicationListItem[]> {
        try {
            const response = await this.httpClient.get("/lists");
            return response.data;
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.response?.data?.message);
        }
    }

    /**
     * Get application detail
     */
    async getApplicationDetail(identifier: string): Promise<ExtensionDetailType> {
        try {
            const systemKey = await this.getSystemKey();
            const response = await this.httpClient.get(`/detail/${identifier}`, {
                headers: {
                    "system-key": systemKey,
                },
            });
            return response.data;
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.response?.data?.message);
        }
    }

    /**
     * Get application versions list
     */
    async getApplicationVersions(identifier: string): Promise<
        {
            version: string;
            explain: string;
            createdAt: string;
        }[]
    > {
        try {
            const response = await this.httpClient.get(`/versions/${identifier}`);
            return response.data;
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.response?.data?.message);
        }
    }

    /**
     * Download application
     */
    async downloadApplication(
        identifier: string,
        version: string,
        type: ExtensionDownloadType,
    ): Promise<{
        version: string;
        explain: string;
        url: string;
    }> {
        try {
            const systemKey = await this.getSystemKey();
            const response = await this.appsMarketHttpClient.post(
                `/upgrade/${identifier}`,
                {},
                {
                    headers: {
                        "system-key": systemKey,
                    },
                },
            );
            return response.data;
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.response?.data?.message);
        }
    }

    /**
     * Get application upgrade content
     */
    async getApplicationUpgradeContent(identifier: string, version: string) {
        try {
            const response = await this.httpClient.get(`/getVersionInfo/${identifier}/${version}`);
            return response.data;
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.response?.data?.message);
        }
    }

    /**
     * Uninstall application
     */
    async uninstallApplication(identifier: string, version: string) {
        try {
            const response = await this.httpClient.post(`/uninstall/${identifier}/${version}`);
            return response.data;
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.response?.data?.message);
        }
    }

    /**
     * Get application by activation code
     */
    async getApplicationByActivationCode(activationCode: string) {
        try {
            const response = await this.appsMarketHttpClient.get(`/getApps/${activationCode}`);
            const appData = response.data;

            // 检查返回的数据中的 key 是否在 extension 表的 identifier 字段中存在
            if (appData?.key) {
                const existingExtension = await this.extensionsService.findByIdentifier(
                    appData.key,
                );
                if (existingExtension) {
                    throw HttpErrorFactory.badRequest(`应用 ${appData.name} 已存在，无法重复安装`);
                }
            }

            return appData;
        } catch (error) {
            // 如果是因为已存在而抛出的错误，直接抛出
            if (
                error instanceof Error &&
                (error.message.includes("already exists") || error.message.includes("已存在"))
            ) {
                throw error;
            }
            throw HttpErrorFactory.badRequest(error.response?.data?.message);
        }
    }

    /**
     * Get system key from dictionary or environment
     * @returns System key or null
     */
    private async getSystemKey(): Promise<string | null> {
        const generatedMachineId = machineIdSync(true);
        // const generatedMachineId = await machineId();

        if (!generatedMachineId || generatedMachineId.trim() === "") {
            throw HttpErrorFactory.badRequest("Generated machine ID is empty");
        }

        return generatedMachineId;
    }

    /**
     * Install application by activation code
     * @param activationCode Activation code
     * @returns Installation response with extension info and download URL
     */
    async installApplicationByActivationCode(activationCode: string) {
        try {
            const systemKey = await this.getSystemKey();

            const response = await this.appsMarketHttpClient.post(
                `/install/${activationCode}`,
                {},
                {
                    headers: {
                        "system-key": systemKey,
                    },
                },
            );

            return response.data;
        } catch (error) {
            throw HttpErrorFactory.badRequest(error.response?.data?.message);
        }
    }

    /**
     * Get installed extension list with update check
     * Only returns installed extensions, checks for updates if platform secret is configured
     */
    async getMixedApplicationList() {
        const systemKey = await this.getSystemKey();
        const installedExtensions = await this.extensionsService.findAll();

        // Fetch market list only for update checking (if platform secret is configured)
        const marketVersionMap = new Map<string, string>();
        if (systemKey) {
            try {
                const response = await this.appsMarketHttpClient.get("/appsLists", {
                    headers: {
                        "system-key": systemKey,
                    },
                });
                const extensionList = Array.isArray(response.data) ? response.data : [];

                // Create a map for quick lookup of market versions
                extensionList.forEach((item: ApplicationListItem) => {
                    marketVersionMap.set(item.key, item.newVersion);
                });
            } catch (error) {
                // 静默处理更新检查失败，不影响已安装扩展列表的返回
                this.logger.error("更新检查失败", error);
            }
        }

        // Map installed extensions with update check and compatibility check
        const installedExtensionsList = await Promise.all(
            installedExtensions.map(async (ext) => {
                let hasUpdate = false;
                let latestVersion: string | null = null;

                // Only check updates for non-local extensions
                if (!ext.isLocal) {
                    const marketVersion = marketVersionMap.get(ext.identifier);
                    if (marketVersion) {
                        latestVersion = marketVersion;
                        // Use semver to compare versions
                        if (semver.valid(marketVersion) && semver.valid(ext.version)) {
                            hasUpdate = semver.gt(marketVersion, ext.version);
                        }
                    }
                }

                // Check version compatibility for installed extensions
                const isCompatible = await isExtensionCompatible(ext.identifier);

                // Get enabled status from extensions.json (true -> 1, false -> 0)
                const enabledStatus = await getExtensionEnabledStatus(ext.identifier);
                const status =
                    enabledStatus === null
                        ? ext.status
                        : enabledStatus
                          ? ExtensionStatus.ENABLED
                          : ExtensionStatus.DISABLED;

                return {
                    ...ext,
                    status,
                    isInstalled: true,
                    isCompatible,
                    latestVersion,
                    hasUpdate,
                };
            }),
        );

        return installedExtensionsList;
    }
}
