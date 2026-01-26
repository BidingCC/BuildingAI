import { CacheService } from "@buildingai/cache";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Dict } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { DICT_CACHE_EVENTS } from "../constants/dict-events.constant";
import { DictService } from "./dict.service";

/**
 * Dictionary cache service
 *
 * Provides caching management for dictionary configurations, including:
 * 1. Loading all dictionary configurations into memory cache on module initialization
 * 2. Listening to dictionary update events to synchronize memory cache
 * 3. Providing cache query interfaces, prioritizing dictionary configurations from cache
 */
@Injectable()
export class DictCacheService {
    private readonly logger = new Logger(DictCacheService.name);
    private readonly CACHE_KEY_PREFIX = "dict:";
    private readonly ALL_DICTS_CACHE_KEY = "dict:all";

    /**
     * Constructor
     * @param dictRepository Dictionary configuration repository
     * @param cacheService Cache service
     */
    constructor(
        @InjectRepository(Dict)
        private readonly dictRepository: Repository<Dict>,
        private readonly cacheService: CacheService,
        private readonly dictService: DictService,
    ) {}

    /**
     * Load all dictionary configurations into cache
     */
    async loadAllDictsToCache() {
        try {
            // Check if table exists
            const tableExists = await this.checkTableExists();
            if (!tableExists) {
                this.logger.warn("Config table does not exist, skipping dictionary cache loading");
                return;
            }

            // Query all dictionary configurations
            const dicts = await this.dictRepository.find();

            // Cache all dictionary configurations
            await this.cacheService.set(this.ALL_DICTS_CACHE_KEY, dicts);

            // Cache separately by key:group
            for (const dict of dicts) {
                const cacheKey = this.getCacheKey(dict.key, dict.group);
                await this.cacheService.set(cacheKey, dict);
            }

            this.logger.log(`Loaded ${dicts.length} dictionary configurations into cache`);
        } catch (error) {
            this.logger.error("Failed to load dictionary configurations into cache", error);
            throw error;
        }
    }

    /**
     * Check if config table exists
     */
    private async checkTableExists(): Promise<boolean> {
        try {
            const result = await this.dictRepository.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'config'
                );
            `);
            return result[0].exists;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    /**
     * Listen to dictionary update event
     * @param dict Updated dictionary configuration
     */
    @OnEvent(DICT_CACHE_EVENTS.DICT_UPDATED)
    async handleDictUpdatedEvent(dict: Dict) {
        this.logger.debug(`Dictionary configuration updated: ${dict.key}@${dict.group}`);

        // Update single dictionary cache
        const cacheKey = this.getCacheKey(dict.key, dict.group);
        await this.cacheService.set(cacheKey, dict);

        // Update all dictionaries cache
        await this.refreshAllDictsCache();
    }

    /**
     * Listen to dictionary deletion event
     * @param params Deleted dictionary configuration parameters
     */
    @OnEvent(DICT_CACHE_EVENTS.DICT_DELETED)
    async handleDictDeletedEvent(params: { key: string; group: string }) {
        const { key, group } = params;
        this.logger.debug(`Dictionary configuration deleted: ${key}@${group}`);

        // Delete single dictionary cache
        const cacheKey = this.getCacheKey(key, group);
        await this.cacheService.del(cacheKey);

        // Update all dictionaries cache
        await this.refreshAllDictsCache();
    }

    /**
     * Refresh all dictionary caches
     */
    private async refreshAllDictsCache() {
        const dicts = await this.dictRepository.find();
        await this.cacheService.set(this.ALL_DICTS_CACHE_KEY, dicts);
    }

    /**
     * Get dictionary configuration cache key
     * @param key Configuration key
     * @param group Configuration group
     * @returns Cache key
     */
    private getCacheKey(key: string, group: string = "default"): string {
        return `${this.CACHE_KEY_PREFIX}${group}:${key}`;
    }

    /**
     * Get dictionary configuration value from cache
     * @param key Configuration key
     * @param defaultValue Default value
     * @param group Configuration group, defaults to default
     * @returns Configuration value
     */
    async get<T = any>(key: string, defaultValue?: T, group: string = "default"): Promise<T> {
        try {
            // Try to get from cache
            const cacheKey = this.getCacheKey(key, group);
            const cachedDict = await this.cacheService.get<Dict>(cacheKey);

            if (cachedDict && cachedDict.isEnabled) {
                return this.dictService.parseValue<T>(cachedDict.value);
            }

            // Cache miss, get from database and update cache
            const value = await this.dictService.get<T>(key, defaultValue, group);

            // If successfully retrieved from database, update cache
            const dict = await this.dictRepository.findOne({
                where: { key, group, isEnabled: true },
            });

            if (dict) {
                await this.cacheService.set(cacheKey, dict);
            }

            return value;
        } catch (error) {
            this.logger.error(`Get dict cache failed: ${key}@${group}`, error);
            return defaultValue as T;
        }
    }

    /**
     * Get all dictionary configurations
     * @returns All dictionary configurations
     */
    async getAll(): Promise<Dict[]> {
        try {
            // Try to get from cache
            const cachedDicts = await this.cacheService.get<Dict[]>(this.ALL_DICTS_CACHE_KEY);

            if (cachedDicts) {
                return cachedDicts;
            }

            // Cache miss, get from database and update cache
            await this.loadAllDictsToCache();
            return (await this.cacheService.get<Dict[]>(this.ALL_DICTS_CACHE_KEY)) || [];
        } catch (error) {
            this.logger.error("Get all dict cache failed", error);
            return [];
        }
    }

    /**
     * Get all configurations by group
     * @param group Configuration group
     * @param onlyEnabled Whether to return only enabled configurations, defaults to true
     * @returns Configuration record array
     */
    async getByGroup(group: string, onlyEnabled: boolean = true): Promise<Dict[]> {
        try {
            // Get all configurations first
            const allDicts = await this.getAll();

            // Filter configurations for specified group
            return allDicts.filter((dict) => {
                // Match group
                const groupMatch = dict.group === group;

                // If need to filter by enabled status
                if (onlyEnabled) {
                    return groupMatch && dict.isEnabled;
                }

                return groupMatch;
            });
        } catch (error) {
            this.logger.error(`Failed to get configurations for group ${group}`, error);
            return [];
        }
    }

    /**
     * Get configuration value mapping by group
     * @param group Configuration group
     * @param onlyEnabled Whether to return only enabled configurations, defaults to true
     * @returns Configuration key-value pair mapping
     */
    async getGroupValues<T = any>(group: string, onlyEnabled: boolean = true): Promise<T> {
        try {
            const configs = await this.getByGroup(group, onlyEnabled);
            const result: Record<string, any> = {};

            for (const config of configs) {
                result[config.key] = this.dictService.parseValue(config.value);
            }

            return result as T;
        } catch (error) {
            this.logger.error(
                `Failed to get configuration value mapping for group ${group}`,
                error,
            );
            return {} as T;
        }
    }

    /**
     * Batch get multiple configuration values
     * @param keys Array of configuration keys with optional groups
     * @returns Array of configuration values
     */
    async mget<T = any>(
        keys: Array<{ key: string; group?: string }>,
    ): Promise<Array<T | undefined>> {
        const promises = keys.map(({ key, group = "default" }) =>
            this.get<T>(key, undefined, group),
        );
        return Promise.all(promises);
    }

    /**
     * Check if configuration exists
     * @param key Configuration key
     * @param group Configuration group, defaults to 'default'
     * @returns True if configuration exists and is enabled
     */
    async has(key: string, group: string = "default"): Promise<boolean> {
        try {
            const cacheKey = this.getCacheKey(key, group);
            const cachedDict = await this.cacheService.get<Dict>(cacheKey);

            if (cachedDict && cachedDict.isEnabled) {
                return true;
            }

            // Check database if not in cache
            const dict = await this.dictRepository.findOne({
                where: { key, group, isEnabled: true },
            });

            return !!dict;
        } catch (error) {
            this.logger.error(`Check dict existence failed: ${key}@${group}`, error);
            return false;
        }
    }

    /**
     * Warm up cache by preloading specific groups
     * @param groups Array of group names to preload
     */
    async warmupCache(groups?: string[]): Promise<void> {
        try {
            if (!groups || groups.length === 0) {
                // Warm up all configurations
                await this.loadAllDictsToCache();
                return;
            }

            // Warm up specific groups
            for (const group of groups) {
                const dicts = await this.dictRepository.find({
                    where: { group },
                });

                for (const dict of dicts) {
                    const cacheKey = this.getCacheKey(dict.key, dict.group);
                    await this.cacheService.set(cacheKey, dict);
                }

                this.logger.log(`Warmed up cache for group: ${group} (${dicts.length} items)`);
            }
        } catch (error) {
            this.logger.error("Cache warmup failed", error);
            throw error;
        }
    }

    /**
     * Get cache statistics
     * @returns Cache statistics including total count and group distribution
     */
    async getCacheStats(): Promise<{
        totalCount: number;
        enabledCount: number;
        disabledCount: number;
        groupCounts: Record<string, number>;
    }> {
        try {
            const allDicts = await this.getAll();
            const enabledDicts = allDicts.filter((dict) => dict.isEnabled);
            const disabledDicts = allDicts.filter((dict) => !dict.isEnabled);

            const groupCounts: Record<string, number> = {};
            for (const dict of allDicts) {
                groupCounts[dict.group] = (groupCounts[dict.group] || 0) + 1;
            }

            return {
                totalCount: allDicts.length,
                enabledCount: enabledDicts.length,
                disabledCount: disabledDicts.length,
                groupCounts,
            };
        } catch (error) {
            this.logger.error("Get cache stats failed", error);
            return {
                totalCount: 0,
                enabledCount: 0,
                disabledCount: 0,
                groupCounts: {},
            };
        }
    }

    /**
     * Clear dictionary cache
     */
    async clearCache() {
        this.logger.log("Clear dictionary cache");

        // Get all dictionary configurations
        const dicts = await this.dictRepository.find();

        // Use batch delete for better performance
        const cacheKeys = dicts.map((dict) => this.getCacheKey(dict.key, dict.group));
        cacheKeys.push(this.ALL_DICTS_CACHE_KEY);

        await this.cacheService.mdel(cacheKeys);
    }
}
