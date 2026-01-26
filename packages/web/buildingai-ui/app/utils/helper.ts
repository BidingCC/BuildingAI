// Nuxt auto-imports are available globally in .ts files
// These imports are for TypeScript type checking only

import type { LinkItem } from "../components/console/page-link-picker/layout";

/**
 * 判断路径是否包含或完全匹配
 */
export function isActive(path: string) {
    const route = useRoute();
    const currentPath = route.path;

    if (path === "/" && currentPath === path) return true;
    if (path === "/" && currentPath != path) return false;

    if (currentPath === path) return true;

    // 临时逻辑
    if (path === "/pages/index/index") {
        return true;
    }

    const normalizedPath = path.endsWith("/") ? path : `${path}/`;
    return currentPath.startsWith(normalizedPath);
}

/**
 * 获取完整的资源图片
 */
export function getImageUrl(url: string) {
    // const appStore = useAppStore()
    // return url.indexOf('http') ? `${appStore.siteConfig.domain}/${url}` : url
    const runtime = useRuntimeConfig();
    return url.indexOf("http") ? `${runtime.public.apiBaseUrl}/${url}` : url;
}

/**
 * 判断是否为外部链接
 * @param path 需要判断的路径
 * @returns boolean
 */
export function isExternalLink(path?: string): boolean {
    if (!path) return false;
    return path.startsWith("http://") || path.startsWith("https://");
}

/**
 * 跳转web页面
 * @param link 链接信息
 * @returns
 */
export function navigateToWeb(link: Omit<LinkItem, "name">) {
    if (!link.path) {
        throw new Error("Link path is required");
    }

    return navigateTo(link.path, {
        external: link.path.indexOf("http") !== -1,
    });
}

/**
 * 生成UUID
 * @returns 生成的UUID
 */
export function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param precision 精度，默认2位小数
 * @returns 格式化后的文件大小字符串
 *
 * @example
 * formatFileSize(1024) // => "1.00 KB"
 * formatFileSize(1048576) // => "1.00 MB"
 * formatFileSize(1073741824) // => "1.00 GB"
 */
export function formatFileSize(bytes: number | string | null | undefined, precision = 2): string {
    // 处理 null、undefined 或空值
    if (bytes === null || bytes === undefined || bytes === "") {
        return "0 Bytes";
    }

    // 转换为数字
    const numBytes = typeof bytes === "string" ? parseFloat(bytes) : Number(bytes);

    // 检查是否为有效数字
    if (isNaN(numBytes) || numBytes < 0) {
        return "0 Bytes";
    }

    if (numBytes === 0) return "0 Bytes";

    const units = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const threshold = 1024;

    let index = 0;
    let size = numBytes;

    while (size >= threshold && index < units.length - 1) {
        size /= threshold;
        index++;
    }

    return `${size.toFixed(precision)} ${units[index]}`;
}

/**
 * 格式化数字（类似 GitHub star 样式）
 * @param count 数字
 * @returns 格式化后的字符串
 *
 * @example
 * formatCompactNumber(950) => "950"
 * formatCompactNumber(1200) => "1.2k"
 * formatCompactNumber(1200000) => "1.2M"
 */
export function formatCompactNumber(count: number): string {
    if (count < 1000) return count.toString();

    const units = [
        { value: 1e9, symbol: "B" },
        { value: 1e6, symbol: "M" },
        { value: 1e3, symbol: "k" },
    ];

    for (const unit of units) {
        if (count >= unit.value) {
            const formatted = (count / unit.value).toFixed(1);
            // 去掉尾部 .0
            return `${parseFloat(formatted)}${unit.symbol}`;
        }
    }

    return count.toString();
}

/**
 * 格式化执行时间
 * @param duration 执行时间（毫秒）
 * @returns 格式化后的时间字符串
 */
export const formatDuration = (duration?: number): string => {
    if (!duration || duration < 0) return "0ms";

    // 个位数（1-9ms）：直接显示毫秒
    if (duration < 10) {
        return `${duration}ms`;
    }

    // 两位或三位数（10-999ms）：转换为秒
    if (duration < 1000) {
        return `${(duration / 1000).toFixed(2)}s`;
    }

    // 1000ms以上：转换为秒
    const seconds = duration / 1000;

    // 超过60秒：转换为分钟
    if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        if (remainingSeconds === 0) {
            return `${minutes}:00`;
        }
        return `${minutes}:${remainingSeconds}`;
    }

    // 1-59秒：显示秒
    return `${seconds.toFixed(1)}s`;
};
