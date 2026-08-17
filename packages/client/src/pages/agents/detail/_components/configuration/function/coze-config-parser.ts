/**
 * Coze / Dify 第三方集成配置解析相关的纯函数（F1：从 third-party-integration.tsx 抽出，便于复用与测试）。
 */

export interface CurlMeta {
    domain?: string;
    token?: string;
}

export type JsonObject = Record<string, unknown>;

/** 从 curl 命令中提取 domain 与 apiToken */
export function extractCurlMeta(raw: string): CurlMeta {
    const result: CurlMeta = {};
    const urlMatch = raw.match(/https?:\/\/([^\/'"]+)/);
    if (urlMatch) result.domain = urlMatch[1];
    const tokenMatch = raw.match(/Authorization:\s*Bearer\s+([^\s'"]+)/i);
    if (tokenMatch) result.token = tokenMatch[1];
    return result;
}

/** 智能解析输入内容为 JSON 对象，并附带从 curl 提取的元数据 */
export function smartParseJson(rawValue: string): {
    parsed: JsonObject;
    meta: CurlMeta;
} | null {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    const meta: CurlMeta = {};
    let jsonToParse = trimmed;

    // 从 curl 命令中提取元数据
    if (trimmed.startsWith("curl ")) {
        Object.assign(meta, extractCurlMeta(trimmed));

        // 提取 --data 中的 JSON
        const dataMatch = trimmed.match(/(?:--data(?:-raw)?|-d)\s+(['"])([\s\S]*?)\1/);
        if (dataMatch) {
            jsonToParse = dataMatch[2];
        } else {
            const dataBraceMatch = trimmed.match(/(?:--data(?:-raw)?|-d)\s+(\{[\s\S]*\})/);
            if (dataBraceMatch) {
                jsonToParse = dataBraceMatch[1];
            }
        }
    }

    // 如果不是 JSON 开头，尝试提取 body/data 中的 JSON
    if (!jsonToParse.startsWith("{") && !jsonToParse.startsWith("[")) {
        const bodyMatch = jsonToParse.match(
            /(?:body|data):\s*(?:JSON\.stringify\()?\s*(\{[\s\S]*?\})\s*\)?/,
        );
        if (bodyMatch) {
            jsonToParse = bodyMatch[1];
        }
    }

    // 回退：提取第一个 {...} 块
    if (!jsonToParse.startsWith("{") && !jsonToParse.startsWith("[")) {
        const firstBrace = jsonToParse.match(/(\{[\s\S]*\})/);
        if (firstBrace) {
            jsonToParse = firstBrace[1];
        }
    }

    try {
        const parsed = JSON.parse(jsonToParse) as JsonObject;
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            return null;
        }
        return { parsed, meta };
    } catch {
        return null;
    }
}

/**
 * 系统托管/保留的扩展配置字段（F2/F4：统一去重，避免两处 systemKeys 数组不一致）。
 * 渲染「请求配置 JSON」输入框时排除这些字段，切换版本时仅保留这些字段。
 */
export const SYSTEM_MANAGED_KEYS = [
    "provider",
    "botId",
    "apiVersion",
    "projectId",
    "cozeSyncStatus",
    "cozeSyncError",
    "difySyncStatus",
    "difySyncError",
];
