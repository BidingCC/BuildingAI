import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { Type } from "@nestjs/common";

/**
 * 判断当前环境是否为开发环境
 * @param cb 可选的回调函数，只在开发环境下执行
 * @returns 如果提供了回调函数且当前是开发环境，返回回调函数的执行结果；否则返回是否为开发环境的布尔值
 */
export const isDevelopment = <T>(cb?: () => T): T | boolean => {
    const isDev = process.env.NODE_ENV === "development";

    if (isDev && typeof cb === "function") {
        return cb();
    }

    return isDev;
};

/**
 * 判断当前环境是否为生产环境
 * @param cb 可选的回调函数，只在生产环境下执行
 * @returns 如果提供了回调函数且当前是生产环境，返回回调函数的执行结果；否则返回是否为生产环境的布尔值
 */
export const isProduction = <T>(cb?: () => T): T | boolean => {
    const isProd = process.env.NODE_ENV === "production";

    if (isProd && typeof cb === "function") {
        return cb();
    }

    return isProd;
};

/**
 * 判断状态是否为启用状态
 * @param status 状态值，可以是数字、字符串、undefined 或 null
 * @returns 如果状态值表示启用状态，返回 true；否则返回 false
 */
export const isEnabled = (status: number | string | boolean | undefined | null): boolean => {
    // 如果是布尔值，直接返回
    if (typeof status === "boolean") {
        return status;
    }

    // 如果是数字，1 表示启用
    if (typeof status === "number") {
        return status === BooleanNumber.YES;
    }

    // 如果是字符串，'1'、'true'、'yes'、'enabled' 等表示启用
    if (typeof status === "string") {
        const normalizedStatus = status.toLowerCase().trim();
        return ["1", "true", "yes", "y", "on", "enabled", "enable", "active"].includes(
            normalizedStatus,
        );
    }

    // 如果是 undefined 或 null，返回 false
    return false;
};

/**
 * 判断状态是否为禁用状态
 * @param status 状态值，可以是数字、字符串、undefined 或 null
 * @returns 如果状态值表示禁用状态，返回 true；否则返回 false
 */
export const isDisabled = (status: number | string | undefined | null): boolean => {
    // 直接取 isEnabled 的反值，确保逻辑一致性
    return !isEnabled(status);
};

/**
 * 验证一个类是否为有效的NestJS模块
 *
 * 检查类是否具有NestJS模块的特征，包括装饰器元数据
 *
 * @param moduleClass 要验证的类
 * @returns 是否为有效的NestJS模块
 */
export function isNestModule(moduleClass: Type<any>): boolean {
    if (!moduleClass || typeof moduleClass !== "function") {
        return false;
    }

    const metadataKeys = Reflect.getMetadataKeys(moduleClass);

    if (metadataKeys.length === 0) {
        return false;
    }

    return true;
}

/**
 * 检查一个值是否为函数
 * @param value - 要检查的值
 * @returns 如果值是函数则返回 true，否则返回 false
 */
export const isFunction = (value: unknown): value is (...args: any[]) => any =>
    typeof value === "function";

export function isGenerator<T, TReturn, TNext>(
    value: unknown,
): value is Generator<T, TReturn, TNext> {
    return value != null && typeof value === "object" && Symbol.iterator in value;
}

export function isAsyncGenerator<T, TReturn, TNext>(
    value: unknown,
): value is AsyncGenerator<T, TReturn, TNext> {
    return value != null && typeof value === "object" && Symbol.asyncIterator in value;
}
