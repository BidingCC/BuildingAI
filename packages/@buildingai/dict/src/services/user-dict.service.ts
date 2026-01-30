import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { UserDict } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

import type { UserDictItem, UserDictKey, UserDictSetOptions } from "../types/user-dict.types";

/**
 * User Dictionary Configuration Service
 *
 * Provides CRUD operations for user-specific configurations
 */
@Injectable()
export class UserDictService extends BaseService<UserDict> {
    /**
     * Private groups that should not be exposed to frontend localStorage cache
     */
    private readonly PRIVATE_GROUPS: string[] = [];

    constructor(
        @InjectRepository(UserDict)
        private readonly userDictRepository: Repository<UserDict>,
    ) {
        super(userDictRepository);
    }

    /**
     * Check if a group is private
     */
    isPrivateGroup(group: string): boolean {
        return this.PRIVATE_GROUPS.includes(group);
    }

    /**
     * Get a single user configuration value
     * @param userId User ID
     * @param key Configuration key
     * @param defaultValue Default value if not found
     * @param group Configuration group, defaults to 'default'
     * @returns Configuration value
     */
    async get<T = any>(
        userId: string,
        key: string,
        defaultValue?: T,
        group: string = "default",
    ): Promise<T> {
        try {
            const config = await this.userDictRepository.findOne({
                where: { userId, key, group },
            });

            if (!config) {
                return defaultValue as T;
            }

            return config.value as T;
        } catch (error) {
            this.logger.error(`get user config failed: ${userId}/${key}@${group}`, error);
            return defaultValue as T;
        }
    }

    /**
     * Set a single user configuration value
     * @param userId User ID
     * @param key Configuration key
     * @param value Configuration value
     * @param options Optional parameters (group, description)
     * @returns Configuration entity
     */
    async set<T = any>(
        userId: string,
        key: string,
        value: T,
        options?: UserDictSetOptions,
    ): Promise<Partial<UserDict>> {
        const group = options?.group || "default";

        const existConfig = await this.userDictRepository.findOne({
            where: { userId, key, group },
        });

        if (existConfig) {
            return super.updateById(existConfig.id, {
                value,
                description:
                    options?.description !== undefined
                        ? options.description
                        : existConfig.description,
            });
        } else {
            return super.create({
                userId,
                key,
                value,
                group,
                description: options?.description,
            });
        }
    }

    /**
     * Batch get multiple user configuration values
     * @param userId User ID
     * @param keys Array of configuration keys with optional groups
     * @returns Record of key-value pairs
     */
    async mget<T = any>(
        userId: string,
        keys: UserDictKey[],
    ): Promise<Record<string, T | undefined>> {
        const result: Record<string, T | undefined> = {};

        const promises = keys.map(async ({ key, group = "default" }) => {
            const value = await this.get<T>(userId, key, undefined, group);
            const resultKey = group === "default" ? key : `${group}:${key}`;
            result[resultKey] = value;
        });

        await Promise.all(promises);
        return result;
    }

    /**
     * Batch set multiple user configuration values
     * @param userId User ID
     * @param items Array of configuration items
     */
    async mset(userId: string, items: UserDictItem[]): Promise<void> {
        const promises = items.map(({ key, value, group, description }) =>
            this.set(userId, key, value, { group, description }),
        );

        await Promise.all(promises);
    }

    /**
     * Get all configurations for a user by group
     * @param userId User ID
     * @param group Configuration group
     * @returns Array of configuration records
     */
    async getByGroup(userId: string, group: string = "default"): Promise<UserDict[]> {
        return this.userDictRepository.find({
            where: { userId, group },
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Get configuration value mapping by group
     * @param userId User ID
     * @param group Configuration group
     * @returns Configuration key-value pair mapping
     */
    async getGroupValues<T = any>(
        userId: string,
        group: string = "default",
    ): Promise<Record<string, T>> {
        const configs = await this.getByGroup(userId, group);
        const result: Record<string, any> = {};

        for (const config of configs) {
            result[config.key] = config.value;
        }

        return result as Record<string, T>;
    }

    /**
     * Get all public configurations for a user (excludes private groups)
     * Used for frontend localStorage cache
     * @param userId User ID
     * @returns Record with group as key, containing key-value pairs
     */
    async getAllPublicConfigs(userId: string): Promise<Record<string, Record<string, any>>> {
        const configs = await this.userDictRepository.find({
            where: { userId },
            order: { createdAt: "DESC" },
        });

        const result: Record<string, Record<string, any>> = {};

        for (const config of configs) {
            const group = config.group || "default";
            if (this.isPrivateGroup(group)) {
                continue;
            }

            if (!result[group]) {
                result[group] = {};
            }
            result[group][config.key] = config.value;
        }

        return result;
    }

    /**
     * Delete a user configuration by key
     * @param userId User ID
     * @param key Configuration key
     * @param group Configuration group, defaults to 'default'
     * @returns Whether deletion was successful
     */
    async deleteByKey(userId: string, key: string, group: string = "default"): Promise<boolean> {
        try {
            const config = await this.userDictRepository.findOne({
                where: { userId, key, group },
            });

            if (!config) {
                return false;
            }

            await super.delete(config.id);
            return true;
        } catch (error) {
            this.logger.error(`delete user config failed: ${userId}/${key}@${group}`, error);
            return false;
        }
    }

    /**
     * Delete all configurations for a user
     * @param userId User ID
     * @returns Number of deleted configurations
     */
    async deleteAllByUser(userId: string): Promise<number> {
        const result = await this.userDictRepository.delete({ userId });
        return result.affected || 0;
    }

    /**
     * Delete all configurations for a user by group
     * @param userId User ID
     * @param group Configuration group
     * @returns Number of deleted configurations
     */
    async deleteByGroup(userId: string, group: string): Promise<number> {
        const result = await this.userDictRepository.delete({ userId, group });
        return result.affected || 0;
    }

    /**
     * Check if a configuration exists
     * @param userId User ID
     * @param key Configuration key
     * @param group Configuration group, defaults to 'default'
     * @returns True if configuration exists
     */
    async has(userId: string, key: string, group: string = "default"): Promise<boolean> {
        const count = await this.userDictRepository.count({
            where: { userId, key, group },
        });
        return count > 0;
    }

    /**
     * Get all configuration keys for a user
     * @param userId User ID
     * @param group Optional group filter
     * @returns Array of configuration keys
     */
    async keys(userId: string, group?: string): Promise<string[]> {
        const whereCondition: any = { userId };
        if (group) {
            whereCondition.group = group;
        }

        const configs = await this.userDictRepository.find({
            where: whereCondition,
            select: ["key"],
        });

        return configs.map((config) => config.key);
    }
}
