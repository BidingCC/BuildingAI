/**
 * Environment utility class
 * Provides type-safe environment detection methods, compatible with Nuxt 3 server and client
 */

/**
 * Environment type enumeration
 */
export type Environment = "development" | "production" | "test";

/**
 * Runtime environment type
 */
export type RuntimeEnvironment = "server" | "client";

/**
 * Get current environment
 * Priority: NUXT_BUILD_ENV > NODE_ENV
 * @returns Current environment type
 */
export function getEnv(): Environment {
    // In Nuxt 3, server can use process.env, client uses import.meta.env
    if (import.meta.server) {
        const buildEnv = process.env.NUXT_BUILD_ENV;
        const nodeEnv = process.env.NODE_ENV;

        if (buildEnv === "development" || buildEnv === "production" || buildEnv === "test") {
            return buildEnv;
        }

        if (nodeEnv === "development" || nodeEnv === "production" || nodeEnv === "test") {
            return nodeEnv;
        }
    } else {
        // Client environment
        const buildEnv = import.meta.env.NUXT_BUILD_ENV;
        const mode = import.meta.env.MODE;

        if (buildEnv === "development" || buildEnv === "production" || buildEnv === "test") {
            return buildEnv;
        }

        if (mode === "development" || mode === "production" || mode === "test") {
            return mode;
        }
    }

    // Default to development
    return "development";
}

/**
 * Check if current environment is development
 * @returns Whether the current environment is development
 */
export function isDev(): boolean {
    return getEnv() === "development";
}

/**
 * Check if current environment is production
 * @returns Whether the current environment is production
 */
export function isProd(): boolean {
    return getEnv() === "production";
}

/**
 * Check if current environment is test
 * @returns Whether the current environment is test
 */
export function isTest(): boolean {
    return getEnv() === "test";
}

/**
 * Check if SSR is enabled
 * @returns Whether SSR is enabled
 */
export function isSSR(): boolean {
    if (import.meta.server) {
        return process.env.NUXT_BUILD_SSR === "true";
    }
    // Client cannot directly determine SSR, but can check via import.meta.env.SSR
    return import.meta.env.SSR === true;
}

/**
 * Environment configuration object
 * Provides convenient environment detection properties
 */
export const env = {
    /**
     * Current environment
     */
    current: getEnv(),

    /**
     * Whether the current environment is development
     */
    isDev: isDev(),

    /**
     * Whether the current environment is production
     */
    isProd: isProd(),

    /**
     * Whether the current environment is test
     */
    isTest: isTest(),

    /**
     * Whether SSR is enabled
     */
    isSSR: isSSR(),
} as const;

/**
 * Environment utility functions collection
 * Provides function-based environment detection methods (supports dynamic detection)
 */
export const envUtils = {
    /**
     * Get current environment
     */
    getEnv,

    /**
     * Check if current environment is development
     */
    isDev,

    /**
     * Check if current environment is production
     */
    isProd,

    /**
     * Check if current environment is test
     */
    isTest,

    /**
     * Check if SSR is enabled
     */
    isSSR,
} as const;

/**
 * Default export of environment configuration object
 */
export default env;
