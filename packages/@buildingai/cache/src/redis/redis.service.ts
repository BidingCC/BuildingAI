import { TerminalLogger } from "@buildingai/logger";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createClient, RedisClientType } from "redis";

import {
    DEFAULT_MAX_RECONNECT_ATTEMPTS,
    DEFAULT_RECONNECT_DELAY,
    DEFAULT_REDIS_DB,
    DEFAULT_REDIS_HOST,
    DEFAULT_REDIS_PORT,
} from "../constants/cache.constants";

/**
 * Redis Service
 *
 * Provides encapsulation of Redis operations, including Redis client instance and advanced Redis commands
 * Focuses on providing native Redis functionality, does not include cache management features
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
    private redisClient: RedisClientType;
    private isConnected = false;
    private subscribers: Map<string, RedisClientType> = new Map();
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts: number;
    private readonly reconnectDelay: number;

    constructor() {
        this.maxReconnectAttempts =
            Number(process.env.REDIS_MAX_RECONNECT_ATTEMPTS) || DEFAULT_MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = Number(process.env.REDIS_RECONNECT_DELAY) || DEFAULT_RECONNECT_DELAY;
        void this.initRedisClient();
    }

    /**
     * Initialize Redis client
     */
    private async initRedisClient() {
        this.redisClient = createClient({
            socket: {
                host: process.env.REDIS_HOST || DEFAULT_REDIS_HOST,
                port: Number(process.env.REDIS_PORT) || DEFAULT_REDIS_PORT,
            },
            username: process.env.REDIS_USERNAME || "",
            password: process.env.REDIS_PASSWORD || "",
            database: Number(process.env.REDIS_DB) || DEFAULT_REDIS_DB,
        });

        this.redisClient.on("error", (err) => {
            TerminalLogger.error("Redis Client", `Error: ${err}`);
            this.isConnected = false;
        });

        this.redisClient.on("connect", () => {
            TerminalLogger.success("Redis Status", "Connected");
            this.isConnected = true;
            this.reconnectAttempts = 0;
        });

        this.redisClient.on("reconnecting", () => {
            this.reconnectAttempts++;
            TerminalLogger.warn(
                "Redis Status",
                `Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
            );
        });

        this.redisClient.on("end", () => {
            TerminalLogger.info("Redis Status", "Connection ended");
            this.isConnected = false;
        });

        try {
            await this.redisClient.connect();
        } catch (error) {
            TerminalLogger.error("Redis Client", `Failed to connect: ${error}`);
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => void this.initRedisClient(), this.reconnectDelay);
            }
        }
    }

    /**
     * Get value
     * @param key Key
     * @returns Value
     */
    async get<T>(key: string): Promise<T | null> {
        return this.redisClient.get(key) as Promise<T | null>;
    }

    /**
     * Set value
     * @param key Key
     * @param value Value
     * @param ttl Time to live in seconds, optional
     */
    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (ttl) {
            await this.redisClient.setEx(key, ttl, value);
        } else {
            await this.redisClient.set(key, value);
        }
    }

    /**
     * Get hash value
     * @param key Key
     * @param field object[field]
     * @returns Value
     */
    async getHash<T>(key: string, field?: string): Promise<T | null> {
        if (field) {
            return (await this.redisClient.hGet(key, field)) as unknown as Promise<T | null>;
        } else {
            const data = await this.redisClient.hGetAll(key);
            return Object.keys(data).length > 0 ? (data as unknown as Promise<T | null>) : null;
        }
    }

    /**
     * Set hash value
     * @param key Key
     * @param value Value
     * @param ttl Time to live in seconds, optional
     */
    async setHash(key: string, value: Record<string, string>, ttl?: number): Promise<void> {
        if (ttl) {
            await this.redisClient.hSet(key, value);
            await this.redisClient.expire(key, ttl);
        } else {
            await this.redisClient.hSet(key, value);
        }
    }

    /**
     * Delete key
     * @param key Key
     */
    async del(key: string): Promise<void> {
        await this.redisClient.del(key);
    }

    /**
     * Reset all cache
     */
    async reset(): Promise<void> {
        // Use Redis client's flushDb command to clear current database
        await this.redisClient.flushDb();
    }

    /**
     * Get Redis client instance
     * Used to execute advanced Redis commands not supported by cache-manager
     * @returns Redis client instance
     */
    getClient(): RedisClientType {
        return this.redisClient;
    }

    /**
     * Execute Redis command
     * @param command Redis command
     * @param args Command arguments
     * @returns Command execution result
     */
    async executeCommand(command: string, ...args: any[]): Promise<any> {
        return this.redisClient.sendCommand([command, ...args]);
    }

    /**
     * Publish message to specified channel
     * @param channel Channel name
     * @param message Message content
     */
    async publish(channel: string, message: string): Promise<number> {
        return this.redisClient.publish(channel, message);
    }

    /**
     * Subscribe to specified channel
     * @param channel Channel name
     * @param callback Message callback function
     */
    async subscribe(
        channel: string,
        callback: (message: string, channel: string) => void,
    ): Promise<void> {
        if (this.subscribers.has(channel)) {
            TerminalLogger.warn("Redis", `Already subscribed to channel: ${channel}`);
            return;
        }

        const subscriber = this.redisClient.duplicate();
        await subscriber.connect();
        await subscriber.subscribe(channel, (message, channel) => {
            callback(message, channel);
        });

        this.subscribers.set(channel, subscriber);
    }

    /**
     * Unsubscribe from specified channel
     * @param channel Channel name
     */
    async unsubscribe(channel: string): Promise<void> {
        const subscriber = this.subscribers.get(channel);
        if (subscriber) {
            await subscriber.unsubscribe(channel);
            await subscriber.quit();
            this.subscribers.delete(channel);
        }
    }

    /**
     * Check if Redis is connected
     * @returns True if connected
     */
    isReady(): boolean {
        return this.isConnected && this.redisClient.isReady;
    }

    /**
     * Health check
     * @returns True if healthy
     */
    async healthCheck(): Promise<boolean> {
        try {
            const result = await this.redisClient.ping();
            return result === "PONG";
        } catch (error) {
            TerminalLogger.error("Redis Health Check", `Failed: ${error}`);
            return false;
        }
    }

    /**
     * Check if key exists
     * @param key Key
     * @returns True if key exists
     */
    async exists(key: string): Promise<boolean> {
        const result = await this.redisClient.exists(key);
        return result === 1;
    }

    /**
     * Get time to live for key
     * @param key Key
     * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
     */
    async ttl(key: string): Promise<number> {
        return this.redisClient.ttl(key);
    }

    /**
     * Set expiry time for key
     * @param key Key
     * @param seconds Expiry time in seconds
     */
    async expire(key: string, seconds: number): Promise<boolean> {
        return this.redisClient.expire(key, seconds);
    }

    /**
     * Get multiple values
     * @param keys Array of keys
     * @returns Array of values
     */
    async mget(keys: string[]): Promise<(string | null)[]> {
        return this.redisClient.mGet(keys);
    }

    /**
     * Set multiple key-value pairs
     * @param entries Array of key-value pairs
     */
    async mset(entries: Array<{ key: string; value: string }>): Promise<void> {
        const args: string[] = [];
        entries.forEach((entry) => {
            args.push(entry.key, entry.value);
        });
        await this.redisClient.mSet(args);
    }

    /**
     * Delete multiple keys
     * @param keys Array of keys
     * @returns Number of keys deleted
     */
    async mdel(keys: string[]): Promise<number> {
        return this.redisClient.del(keys);
    }

    /**
     * Get all keys matching pattern
     * @param pattern Pattern to match
     * @returns Array of matching keys
     */
    async keys(pattern: string): Promise<string[]> {
        return this.redisClient.keys(pattern);
    }

    /**
     * Increment value
     * @param key Key
     * @param delta Increment amount, defaults to 1
     * @returns New value after increment
     */
    async incr(key: string, delta: number = 1): Promise<number> {
        if (delta === 1) {
            return this.redisClient.incr(key);
        }
        return this.redisClient.incrBy(key, delta);
    }

    /**
     * Decrement value
     * @param key Key
     * @param delta Decrement amount, defaults to 1
     * @returns New value after decrement
     */
    async decr(key: string, delta: number = 1): Promise<number> {
        if (delta === 1) {
            return this.redisClient.decr(key);
        }
        return this.redisClient.decrBy(key, delta);
    }

    /**
     * Set value only if key does not exist (distributed lock)
     * @param key Key
     * @param value Value
     * @param ttl Time to live in seconds
     * @returns True if key was set, false if key already exists
     */
    async setnx(key: string, value: string, ttl?: number): Promise<boolean> {
        const result = await this.redisClient.setNX(key, value);
        if (result && ttl) {
            await this.redisClient.expire(key, ttl);
        }
        return result;
    }

    /**
     * Close Redis connection
     */
    async onModuleDestroy() {
        // Close all subscribers
        for (const [channel, subscriber] of this.subscribers.entries()) {
            try {
                await subscriber.quit();
                TerminalLogger.info("Redis", `Subscriber closed for channel: ${channel}`);
            } catch (error) {
                TerminalLogger.error("Redis", `Failed to close subscriber: ${error}`);
            }
        }
        this.subscribers.clear();

        // Close main client
        if (this.redisClient && this.isConnected) {
            await this.redisClient.quit();
            this.isConnected = false;
            TerminalLogger.info("Redis", "Connection closed");
        }
    }
}
