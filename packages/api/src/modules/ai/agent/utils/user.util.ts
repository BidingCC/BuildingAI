import type { UserPlayground } from "@buildingai/db";

/**
 * User utility functions for AI Agent module
 */
export class UserUtil {
    /**
     * Check if user is anonymous
     *
     * Determines whether a user is anonymous based on various patterns
     * including fixed anonymous identifiers, access tokens, and UUID patterns.
     *
     * @param user - User information to check
     * @returns True if user is anonymous, false otherwise
     */
    static isAnonymousUser(user: UserPlayground): boolean {
        return (
            // 1. 固定的anonymous标识
            user.id === "anonymous" ||
            // 2. 新的匿名用户格式（anonymous_timestamp_random）
            user.id?.startsWith("anonymous_") ||
            // 3. 基于访问令牌的用户名
            user.username?.startsWith("anonymous") ||
            user.username?.startsWith("access_") ||
            // 4. UUID格式的匿名用户（来自访问令牌生成）
            (user.id?.match(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/) !==
                null &&
                !user.username?.match(/^[a-zA-Z0-9_]+$/))
        );
    }
}
