import { HttpErrorFactory } from "@buildingai/errors";
import type { ThirdPartyIntegrationConfig } from "@buildingai/types/ai/agent-config.interface";
import { Injectable, Logger } from "@nestjs/common";

export interface CozeBotInfo {
    id?: string;
    name?: string;
    description?: string;
    iconUrl?: string;
    openingStatement?: string;
    openingQuestions?: string[];
    raw: Record<string, any>;
}

export interface CozeChatUsage {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}

export interface CozeToolCallPart {
    type: "dynamic-tool";
    toolCallId: string;
    toolName: string;
    state: "input-available" | "output-available" | "output-error";
    input: Record<string, any>;
    output?: unknown;
    errorText?: string;
}

export interface CozeMessageObject {
    type: "text" | "image" | "file";
    text?: string;
    file_id?: string;
    file_url?: string;
    url?: string;
    name?: string;
    mime_type?: string;
}

export interface CozeStreamChatParams {
    config: ThirdPartyIntegrationConfig;
    userId: string;
    message: string;
    conversationId?: string;
    /** 历史消息列表,用于提供上下文 */
    messages?: Array<{
        role: string;
        content: string;
        objects?: CozeMessageObject[];
    }>;
    objects?: CozeMessageObject[];
}

/**
 * Coze OpenAPI 访问服务。
 */
@Injectable()
export class CozeApiService {
    private readonly logger = new Logger(CozeApiService.name);

    /**
     * Coze 官方默认地址。
     */
    readonly defaultBaseUrl = "https://api.coze.cn";

    /**
     * 规范化第三方配置。
     */
    normalizeConfig(config?: ThirdPartyIntegrationConfig | null): ThirdPartyIntegrationConfig {
        const normalized = {
            ...(config ?? {}),
        } as ThirdPartyIntegrationConfig & { provider?: "coze" | "dify" };
        const extendedConfig = { ...(config?.extendedConfig ?? {}) };
        const provider = (config as { provider?: "coze" | "dify" } | null | undefined)?.provider;
        const botId = this.resolveBotId(config);
        const normalizedProvider = provider === "dify" ? "dify" : "coze";
        const apiVersion = config?.apiVersion || "v1";

        if (botId) {
            extendedConfig.botId = botId;
        }
        extendedConfig.provider = normalizedProvider;
        extendedConfig.apiVersion = apiVersion;
        normalized.provider = normalizedProvider;
        normalized.apiVersion = apiVersion;

        // 新版 API：projectId 可能从 projectId 字段、appId 或 extendedConfig.projectId 获取
        if (apiVersion === "v2") {
            const projectId = config?.projectId || config?.appId;
            if (projectId) {
                extendedConfig.projectId = projectId;
                normalized.projectId = projectId;
            }
        }

        normalized.appId = botId ?? config?.appId;
        normalized.apiKey = config?.apiKey?.trim();
        normalized.baseURL = this.normalizeBaseUrl(config?.baseURL, apiVersion);
        normalized.extendedConfig = extendedConfig;
        normalized.useExternalConversation = config?.useExternalConversation ?? true;

        return normalized;
    }

    /**
     * 解析 Coze 新版 Project ID。
     */
    resolveProjectId(config?: ThirdPartyIntegrationConfig | null): string | undefined {
        return (
            config?.projectId?.trim() ||
            (config?.extendedConfig?.projectId as string)?.trim() ||
            config?.appId?.trim()
        ) || undefined;
    }

    /**
     * 判断当前配置是否满足 Coze 最小可用条件。
     */
    hasValidConfig(config?: ThirdPartyIntegrationConfig | null): boolean {
        const normalized = this.normalizeConfig(config);
        const apiVersion = normalized.apiVersion || "v1";
        if (apiVersion === "v2") {
            return Boolean(normalized.apiKey && this.resolveProjectId(normalized));
        }
        return Boolean(normalized.apiKey && this.resolveBotId(normalized));
    }

    /**
     * 获取 Coze Bot 基础信息。
     */
    async getBotInfo(config?: ThirdPartyIntegrationConfig | null): Promise<CozeBotInfo> {
        const normalized = this.normalizeConfig(config);
        const apiKey = normalized.apiKey?.trim();
        const botId = this.resolveBotId(normalized);

        if (!apiKey) {
            throw HttpErrorFactory.badRequest("Coze API Key 未配置");
        }
        if (!botId) {
            throw HttpErrorFactory.badRequest("Coze Bot ID 未配置");
        }

        const candidates: Array<{
            url: string;
            method: "GET" | "POST";
            body?: Record<string, any>;
        }> = [
            {
                url: `${normalized.baseURL}/v1/bots/retrieve`,
                method: "POST",
                body: { bot_id: botId },
            },
            {
                url: `${normalized.baseURL}/v1/bot/get`,
                method: "POST",
                body: { bot_id: botId },
            },
            {
                url: `${normalized.baseURL}/v1/bots/${encodeURIComponent(botId)}`,
                method: "GET",
            },
        ];

        let lastError = "未知错误";

        for (const candidate of candidates) {
            try {
                const response = await fetch(candidate.url, {
                    method: candidate.method,
                    headers: this.buildHeaders(apiKey),
                    body: candidate.body ? JSON.stringify(candidate.body) : undefined,
                });

                if (!response.ok) {
                    lastError = `HTTP ${response.status}`;
                    continue;
                }

                const payload = (await response.json()) as Record<string, any>;
                const data = this.unwrapResponse<Record<string, any>>(payload);
                return this.mapBotInfo(data, botId);
            } catch (error) {
                lastError = this.errMsg(error);
                this.logger.warn(
                    `Coze bot info request failed: ${candidate.url}, error=${lastError}`,
                );
            }
        }

        throw HttpErrorFactory.badRequest(`获取 Coze 智能体信息失败: ${lastError}`);
    }

    /**
     * 发起 Coze 新版 API (stream_run) 流式聊天请求。
     */
    async streamChatV2(params: CozeStreamChatParams): Promise<Response> {
        const normalized = this.normalizeConfig(params.config);
        const apiToken = normalized.apiKey?.trim();
        const projectId = this.resolveProjectId(normalized);
        const baseUrl = normalized.baseURL?.replace(/\/+$/, "") || this.defaultBaseUrl;

        if (!apiToken) {
            throw HttpErrorFactory.badRequest("Coze API Token 未配置");
        }
        if (!projectId) {
            throw HttpErrorFactory.badRequest("Coze Project ID 未配置");
        }

        // 新版 API 使用 session_id 管理会话上下文，映射到 params.conversationId
        const sessionId = params.conversationId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        // 构建新版请求体的 prompt 部分
        const prompt: Array<{ type: string; content: Record<string, any> }> = [
            {
                type: "text",
                content: { text: params.message },
            },
        ];

        // 如果有多模态对象（如图片），也添加到 prompt 中
        if (params.objects && params.objects.length > 0) {
            for (const obj of params.objects) {
                if (obj.type === "image" && (obj.url || obj.file_url)) {
                    prompt.push({
                        type: "upload_file",
                        content: {
                            upload_file: {
                                url: obj.url || obj.file_url,
                                file_name: obj.name || "image",
                            },
                        },
                    });
                } else if (obj.type === "file" && (obj.url || obj.file_url)) {
                    prompt.push({
                        type: "upload_file",
                        content: {
                            upload_file: {
                                url: obj.url || obj.file_url,
                                file_name: obj.name || "file",
                            },
                        },
                    });
                }
            }
        }

        // 使用 buildRequestBodyV2 构建完整请求体（合并用户自定义字段）
        const body = this.buildRequestBodyV2(normalized.extendedConfig, sessionId, Number(projectId), prompt);

        const url = `${baseUrl}/stream_run`;
        // 脱敏日志：只显示 project_id 和 session_id 前缀，不暴露 token
        this.logger.log(`Coze streamChatV2: url=${url}, projectId=${projectId}, sessionId=${sessionId.slice(0, 20)}..., bodyFields=${Object.keys(body).join(",")}`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
                Accept: "text/event-stream",
            },
            body: JSON.stringify(body),
        });

        this.logger.log(`Coze streamChatV2: response status=${response.status}, ok=${response.ok}, contentType=${response.headers.get("content-type")}`);

        if (!response.ok) {
            const text = await response.text();
            this.logger.error(`Coze streamChatV2: request failed, status=${response.status}, body=${text.slice(0, 500)}`);
            throw HttpErrorFactory.badRequest(
                `Coze 新版 API 调用失败: ${text || `HTTP ${response.status}`}`,
            );
        }

        return response;
    }

    /**
     * 发起 Coze 流式聊天请求。
     * 根据 apiVersion 自动选择旧版（v1）或新版（v2）API。
     */
    async streamChat(params: CozeStreamChatParams): Promise<Response> {
        const apiVersion = params.config?.apiVersion || "v1";
        if (apiVersion === "v2") {
            return this.streamChatV2(params);
        }
        return this.streamChatV1(params);
    }

    /**
     * 发起 Coze 旧版 API (v3/chat) 流式聊天请求。
     */
    private async streamChatV1(params: CozeStreamChatParams): Promise<Response> {
        const normalized = this.normalizeConfig(params.config);
        const apiKey = normalized.apiKey?.trim();
        const botId = this.resolveBotId(normalized);

        if (!apiKey) {
            throw HttpErrorFactory.badRequest("Coze API Key 未配置");
        }
        if (!botId) {
            throw HttpErrorFactory.badRequest("Coze Bot ID 未配置");
        }

        // 构建历史消息列表
        const additionalMessages: Array<{
            role: string;
            type: string;
            content: string;
            content_type: string;
        }> = [];

        // 添加历史消息(如果有)
        if (params.messages && params.messages.length > 0) {
            for (const msg of params.messages) {
                const objects = msg.objects?.filter((item) => item.type !== "text") ?? [];
                additionalMessages.push({
                    role: msg.role === "user" ? "user" : "assistant",
                    type: msg.role === "user" ? "question" : "answer",
                    content:
                        objects.length > 0
                            ? JSON.stringify(
                                  [
                                      ...(msg.content ? [{ type: "text", text: msg.content }] : []),
                                      ...objects,
                                  ],
                                  null,
                                  0,
                              )
                            : msg.content,
                    content_type: objects.length > 0 ? "object_string" : "text",
                });
            }
        }

        // 添加当前用户消息
        const currentObjects = params.objects?.filter((item) => item.type !== "text") ?? [];
        additionalMessages.push({
            role: "user",
            type: "question",
            content:
                currentObjects.length > 0
                    ? JSON.stringify(
                          [
                              ...(params.message ? [{ type: "text", text: params.message }] : []),
                              ...currentObjects,
                          ],
                          null,
                          0,
                      )
                    : params.message,
            content_type: currentObjects.length > 0 ? "object_string" : "text",
        });

        const body = {
            bot_id: botId,
            user_id: params.userId,
            conversation_id:
                normalized.useExternalConversation === false ? undefined : params.conversationId,
            stream: true,
            auto_save_history: normalized.useExternalConversation !== false,
            additional_messages: additionalMessages,
        };

        const candidates = [`${normalized.baseURL}/v3/chat`, `${normalized.baseURL}/v1/chat`];
        let lastError = "未知错误";

        for (const url of candidates) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        ...this.buildHeaders(apiKey),
                        Accept: "text/event-stream, application/json",
                    },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    const text = await response.text();
                    lastError = text || `HTTP ${response.status}`;
                    continue;
                }

                return response;
            } catch (error) {
                lastError = this.errMsg(error);
                this.logger.warn(`Coze chat stream request failed: ${url}, error=${lastError}`);
            }
        }

        throw HttpErrorFactory.badRequest(`Coze 对话失败: ${lastError}`);
    }

    /**
     * 解析 Coze SSE 事件块。
     */
    parseStreamEvent(rawBlock: string): {
        event?: string;
        data?: Record<string, any>;
        rawData?: string;
    } {
        const lines = rawBlock
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        let eventName: string | undefined;
        const dataLines: string[] = [];

        for (const line of lines) {
            if (line.startsWith("event:")) {
                eventName = line.slice(6).trim();
                continue;
            }
            if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trim());
            }
        }

        const rawData = dataLines.join("\n");
        if (!rawData) {
            return { event: eventName };
        }

        try {
            const data = JSON.parse(rawData) as Record<string, any>;
            return {
                event: eventName ?? (typeof data.event === "string" ? data.event : undefined),
                data,
                rawData,
            };
        } catch {
            return {
                event: eventName,
                rawData,
            };
        }
    }

    /**
     * 从 Coze 响应中抽取增量文本。
     */
    extractDeltaText(event?: string, data?: Record<string, any>): string {
        if (!data) return "";

        const eventName = (event ?? data.event ?? data.type ?? "").toString().toLowerCase();
        if (
            eventName.includes("message.delta") ||
            eventName.includes("conversation_message_delta") ||
            eventName === "conversation.message.delta"
        ) {
            return this.pickText(data);
        }

        return "";
    }

    /**
     * 从 Coze 响应中抽取完成文本。
     */
    extractCompletedText(event?: string, data?: Record<string, any>): string {
        if (!data) return "";

        const eventName = (event ?? data.event ?? data.type ?? "").toString().toLowerCase();
        if (
            eventName.includes("message.completed") ||
            eventName.includes("conversation_message_completed") ||
            eventName === "conversation.message.completed"
        ) {
            return this.pickText(data);
        }

        return "";
    }

    // ==================== 新版 API (stream_run) 解析方法 ====================

    /**
     * 解析新版 stream_run SSE 事件（按行解析）。
     * 新版 SSE 格式：每行 data: {JSON}
     * 事件类型通过 data.type 字段区分，而非 event: 字段。
     */
    parseStreamEventV2(rawLine: string): {
        type?: string;
        data?: Record<string, any>;
        rawData?: string;
    } {
        const trimmed = rawLine.trim();
        if (!trimmed) return {};

        // 新版 SSE 格式：data: {"type":"answer","content":{...}}
        if (trimmed.startsWith("data:")) {
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) return {};
            try {
                const parsed = JSON.parse(jsonStr) as Record<string, any>;
                return {
                    type: parsed.type as string,
                    data: parsed,
                    rawData: jsonStr,
                };
            } catch {
                return { rawData: jsonStr };
            }
        }

        // 也可能是旧版格式（event: + data:），回退到旧版解析
        return {};
    }

    /**
     * 从新版 answer 事件提取文本片段。
     * answer 事件格式：
     * {
     *   "type": "answer",
     *   "sequence_id": 1,
     *   "content": { "answer": "你好" },
     *   "finish": false
     * }
     */
    extractAnswerTextV2(data?: Record<string, any>): {
        text: string;
        sequenceId: number;
        finish: boolean;
    } {
        if (!data || data.type !== "answer") {
            return { text: "", sequenceId: 0, finish: false };
        }

        const answerText = data.content?.answer as string | undefined;
        return {
            text: answerText ?? "",
            sequenceId: Number(data.sequence_id ?? 0),
            finish: data.finish === true,
        };
    }

    /**
     * 从新版 message_end 事件提取 token 用量。
     * message_end 事件格式：
     * {
     *   "type": "message_end",
     *   "content": {
     *     "message_end": {
     *       "code": "0",
     *       "token_cost": { "input_tokens": 100, "output_tokens": 200, "total_tokens": 300 },
     *       "time_cost_ms": 1234
     *     }
     *   }
     * }
     */
    extractUsageV2(data?: Record<string, any>): CozeChatUsage | undefined {
        if (!data || data.type !== "message_end") return undefined;

        const messageEnd = data.content?.message_end as Record<string, any> | undefined;
        if (!messageEnd) return undefined;

        // 检查 message_end 的 code 字段，非 "0" 表示执行错误
        const code = messageEnd.code;
        if (code !== undefined && code !== null && String(code) !== "0") {
            const errorMsg = messageEnd.message || messageEnd.msg || `Coze 智能体执行错误，code=${code}`;
            this.logger.warn(`Coze streamChatV2: message_end code=${code}, message="${errorMsg}"`);
            // 不抛出异常，让调用方自行处理（可能只是局部错误）
        }

        const tokenCost = messageEnd.token_cost as Record<string, any> | undefined;
        if (!tokenCost) return undefined;

        return {
            inputTokens: Number(tokenCost.input_tokens ?? 0) || undefined,
            outputTokens: Number(tokenCost.output_tokens ?? 0) || undefined,
            totalTokens: Number(tokenCost.total_tokens ?? 0) || undefined,
        };
    }

    /**
     * 从新版 tool_request / tool_response 事件提取工具调用。
     * tool_request: { "type": "tool_request", "content": { "tool_request": { "name": "...", "arguments": {...} } } }
     * tool_response: { "type": "tool_response", "content": { "tool_response": { "name": "...", "output": {...} } } }
     */
    extractToolCallV2(data?: Record<string, any>): CozeToolCallPart | undefined {
        if (!data) return undefined;

        const eventType = data.type as string | undefined;

        if (eventType === "tool_request") {
            const toolRequest = data.content?.tool_request as Record<string, any> | undefined;
            if (!toolRequest) return undefined;

            return {
                type: "dynamic-tool",
                toolCallId: `${toolRequest.name || "tool"}-${Date.now()}`,
                toolName: toolRequest.name || "coze-tool",
                state: "input-available",
                input: (toolRequest.arguments || toolRequest.input || {}) as Record<string, any>,
            };
        }

        if (eventType === "tool_response") {
            const toolResponse = data.content?.tool_response as Record<string, any> | undefined;
            if (!toolResponse) return undefined;

            return {
                type: "dynamic-tool",
                toolCallId: `${toolResponse.name || "tool"}-${Date.now()}`,
                toolName: toolResponse.name || "coze-tool",
                state: "output-available",
                input: {},
                output: toolResponse.output ?? toolResponse.result,
            };
        }

        return undefined;
    }

    /**
     * 从新版 API 响应中抽取 session_id（用于会话复用）。
     */
    extractSessionIdV2(data?: Record<string, any>): string | undefined {
        if (!data) return undefined;
        return (data.session_id || data.content?.session_id) as string | undefined;
    }

    /**
     * 从 extendedConfig 中提取用户自定义的额外请求体字段。
     * 返回完整的请求体（系统核心字段优先，用户额外字段作为补充）。
     * 系统核心字段（type、session_id、project_id、content）不会被用户覆盖。
     */
    private buildRequestBodyV2(
        extendedConfig: Record<string, any> | undefined,
        sessionId: string,
        projectId: number,
        userPrompt: Array<{ type: string; content: Record<string, any> }>,
    ): Record<string, any> {
        // 系统生成的核心请求体
        const body: Record<string, any> = {
            type: "query",
            session_id: sessionId,
            project_id: projectId,
            content: {
                query: { prompt: userPrompt },
            },
        };

        // 系统核心字段，不允许被用户覆盖
        const coreFields = new Set(["type", "session_id", "project_id", "content"]);

        // 如果 extendedConfig 中有用户自定义的额外字段，合并到请求体（但不覆盖核心字段）
        if (extendedConfig && typeof extendedConfig === "object") {
            // 排除系统管理字段和核心请求体字段
            const skipKeys = new Set([
                "provider", "botId", "apiVersion", "projectId",
                "cozeSyncStatus", "cozeSyncError",
                "difySyncStatus", "difySyncError",
                ...coreFields,
            ]);
            for (const [k, v] of Object.entries(extendedConfig)) {
                if (!skipKeys.has(k)) {
                    body[k] = v;
                }
            }
        }

        return body;
    }

    /**
     * 测试新版 API (stream_run) 连接。
     * 从 config.extendedConfig 中读取用户提供的完整请求体 JSON，
     * 自动提取 project_id，用 baseURL + apiKey 构建测试请求。
     */
    async testConnectionV2(config?: ThirdPartyIntegrationConfig | null): Promise<{ success: boolean; message: string }> {
        const apiToken = config?.apiKey?.trim();
        const baseUrl = config?.baseURL?.replace(/\/+$/, "");
        const extendedConfig = config?.extendedConfig;

        if (!apiToken) {
            return { success: false, message: "API Token 未配置" };
        }
        if (!baseUrl) {
            return { success: false, message: "部署域名未配置" };
        }

        // 从 extendedConfig 中提取 project_id（优先），其次从 config.projectId
        let projectIdRaw: string | undefined;
        if (extendedConfig && typeof extendedConfig.project_id !== "undefined") {
            projectIdRaw = String(extendedConfig.project_id);
        } else {
            projectIdRaw = config?.projectId?.trim();
        }

        if (!projectIdRaw) {
            return {
                success: false,
                message: "Project ID 未配置。请在 JSON 输入框中包含 project_id 字段，或粘贴 Coze 部署页面提供的 curl 命令",
            };
        }

        const projectId = Number(projectIdRaw);
        if (!Number.isFinite(projectId) || projectId <= 0) {
            return {
                success: false,
                message: `Project ID 格式无效（"${projectIdRaw}"），请输入纯数字`,
            };
        }

        const url = `${baseUrl}/stream_run`;
        const sessionId = `test_${Date.now()}`;
        const defaultPrompt = [
            { type: "text", content: { text: "Hello" } },
        ];

        const body = this.buildRequestBodyV2(extendedConfig, sessionId, projectId, defaultPrompt);

        this.logger.log(`testConnectionV2: url=${url}, projectId=${projectId}`);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                    Accept: "text/event-stream",
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                return { success: true, message: "连接成功，API 配置正确" };
            }

            const text = await response.text();
            let detail = text || "未知错误";

            if (response.status === 404) {
                detail = `端点不存在。请检查：1) Domain 是否正确（如 xxx.coze.cn）2) 智能体是否已部署并发布。原始响应: ${text || "(空)"}`;
            } else if (response.status === 401 || response.status === 403) {
                detail = `认证失败。请检查 API Token 是否正确。原始响应: ${text || "(空)"}`;
            }

            return {
                success: false,
                message: `连接失败 (HTTP ${response.status}): ${detail}`,
            };
        } catch (error) {
            this.logger.error(`testConnectionV2 error: ${this.errMsg(error)}`);
            return {
                success: false,
                message: `连接异常: ${this.errMsg(error)}`,
            };
        }
    }

    /**
     * 测试旧版 API (v3/chat) 连接。
     * 尝试获取 Bot 信息来验证 API Key 和 Bot ID 是否正确。
     */
    async testConnectionV1(config?: ThirdPartyIntegrationConfig | null): Promise<{ success: boolean; message: string }> {
        try {
            await this.getBotInfo(config);
            return { success: true, message: "连接成功，API 配置正确" };
        } catch (error) {
            return {
                success: false,
                message: `连接失败: ${this.errMsg(error)}`,
            };
        }
    }

    // ==================== 旧版 API 解析方法（保留） ====================

    /**
     * 从 Coze 响应中抽取 conversation/chat 标识。
     */
    extractIdentifiers(data?: Record<string, any>): {
        conversationId?: string;
        chatId?: string;
    } {
        if (!data) return {};

        return {
            conversationId:
                data.conversation_id ??
                data.conversationId ??
                data.chat?.conversation_id ??
                data.chat?.conversationId,
            chatId: data.chat_id ?? data.chatId ?? data.chat?.id,
        };
    }

    /**
     * 从 Coze 响应中抽取 token 用量。
     */
    extractUsage(data?: Record<string, any>): CozeChatUsage | undefined {
        if (!data) return undefined;

        const usage = (data.chat?.usage ?? data.usage) as Record<string, any> | undefined;
        if (!usage) return undefined;

        return {
            inputTokens: usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokens,
            outputTokens: usage.output_tokens ?? usage.completion_tokens ?? usage.completionTokens,
            totalTokens: usage.token_count ?? usage.total_tokens ?? usage.totalTokens,
        };
    }

    extractToolCallPart(event?: string, data?: Record<string, any>): CozeToolCallPart | undefined {
        if (!data) return undefined;

        const eventName = (event ?? data.event ?? data.type ?? "").toString().toLowerCase();
        const payload = this.pickPrimaryMessagePayload(data);
        const messageType = this.pickString(
            payload?.type,
            payload?.message_type,
            payload?.msg_type,
            data.type,
            data.message_type,
            data.msg_type,
        ).toLowerCase();
        const isToolLike =
            eventName.includes("tool") ||
            eventName.includes("plugin") ||
            messageType.includes("tool") ||
            messageType.includes("plugin") ||
            messageType.includes("function");

        if (!isToolLike) {
            return undefined;
        }

        const toolName =
            this.pickString(
                payload?.plugin_name,
                payload?.pluginName,
                payload?.tool_name,
                payload?.toolName,
                payload?.function_name,
                payload?.functionName,
                payload?.name,
                payload?.plugin?.name,
                payload?.tool?.name,
                data.plugin_name,
                data.pluginName,
                data.tool_name,
                data.toolName,
                data.function_name,
                data.functionName,
                data.name,
            ) || "coze-tool";
        const toolCallId =
            this.pickString(
                payload?.tool_call_id,
                payload?.toolCallId,
                payload?.id,
                payload?.message_id,
                payload?.messageId,
                data.tool_call_id,
                data.toolCallId,
                data.id,
                data.message_id,
                data.messageId,
                data.chat_id,
                data.chatId,
            ) || `${toolName}-${Date.now()}`;
        const input = this.pickStructuredObject(
            payload?.arguments,
            payload?.input,
            payload?.plugin_input,
            payload?.pluginInput,
            payload?.tool_input,
            payload?.toolInput,
            data.arguments,
            data.input,
        );
        const output = this.pickStructuredValue(
            payload?.output,
            payload?.tool_output,
            payload?.toolOutput,
            payload?.plugin_output,
            payload?.pluginOutput,
            payload?.data?.output,
            payload?.content,
            data.output,
            data.tool_output,
            data.toolOutput,
            data.plugin_output,
            data.pluginOutput,
            data.content,
        );
        const errorText = this.pickString(
            payload?.error,
            payload?.error_message,
            payload?.errorMessage,
            payload?.last_error,
            payload?.lastError,
            data.error,
            data.error_message,
            data.errorMessage,
            data.last_error,
            data.lastError,
        );

        return {
            type: "dynamic-tool",
            toolCallId,
            toolName,
            state: errorText
                ? "output-error"
                : output !== undefined
                  ? "output-available"
                  : "input-available",
            input: input ?? {},
            ...(output !== undefined ? { output } : {}),
            ...(errorText ? { errorText } : {}),
        };
    }

    /**
     * 解析 Coze Bot ID。
     */
    resolveBotId(config?: ThirdPartyIntegrationConfig | null): string | undefined {
        const botId =
            (config?.extendedConfig?.botId as string | undefined) ??
            (config?.appId as string | undefined) ??
            undefined;
        return botId?.trim() || undefined;
    }

    /**
     * 规范化 baseURL。
     * 新版 API 使用部署域名（如 xxx.coze.cn），旧版使用 Coze 官方地址（https://api.coze.cn）。
     * 新版 API 不允许空 baseURL，必须填写部署域名。
     */
    normalizeBaseUrl(baseURL?: string, apiVersion?: string): string {
        const value = baseURL?.trim();

        // 新版 API：baseURL 为空时抛错，要求用户填写域名
        if (apiVersion === "v2") {
            if (!value) {
                throw HttpErrorFactory.badRequest("新版 API 必须填写部署域名（Domain）");
            }
        } else if (!value) {
            // 旧版：使用默认地址
            return this.defaultBaseUrl;
        }

        try {
            let url: URL;
            // 如果没有协议前缀，自动添加 https://
            if (!value.startsWith("http://") && !value.startsWith("https://")) {
                url = new URL(`https://${value}`);
            } else {
                url = new URL(value);
            }
            return url.toString().replace(/\/+$/, "");
        } catch {
            throw HttpErrorFactory.badRequest("Coze Base URL 格式不正确");
        }
    }

    private buildHeaders(apiKey: string): HeadersInit {
        return {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        };
    }

    private unwrapResponse<T>(payload: Record<string, any>): T {
        if (payload.code !== undefined && payload.code !== 0) {
            throw HttpErrorFactory.badRequest(
                payload.msg || payload.message || "Coze API 调用失败",
            );
        }
        return (payload.data ?? payload) as T;
    }

    private mapBotInfo(data: Record<string, any>, fallbackBotId: string): CozeBotInfo {
        const openingQuestions = this.pickStringArray(
            data.suggested_questions ??
                data.opening_questions ??
                data.onboarding_info?.suggested_questions ??
                data.onboarding_info?.opening_questions,
        );

        return {
            id: data.id ?? data.bot_id ?? fallbackBotId,
            name: this.pickString(data.name, data.bot_name, data.botName),
            description: this.pickString(data.description, data.desc, data.introduction),
            iconUrl: this.pickString(data.icon_url, data.iconUrl, data.icon, data.avatar_url),
            openingStatement: this.pickString(
                data.prompt,
                data.opening_statement,
                data.onboarding_info?.prologue,
                data.onboarding_info?.opening_statement,
            ),
            openingQuestions,
            raw: data,
        };
    }

    private pickText(data: Record<string, any>): string {
        return this.pickTextContent(
            data.message?.content,
            data.content,
            data.delta,
            data.data?.content,
            data.message?.text,
        );
    }

    /**
     * 从候选值中选取第一个非空字符串，**不执行 trim**。
     * 专用于提取流式文本 delta / completedText，避免截断 `\n` 等空白字符。
     */
    private pickTextContent(...values: unknown[]): string {
        for (const value of values) {
            if (typeof value === "string" && value.length > 0) {
                return value;
            }
        }
        return "";
    }

    private pickPrimaryMessagePayload(data: Record<string, any>): Record<string, any> | undefined {
        const candidates = [data.message, data.data, data];
        for (const candidate of candidates) {
            if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
                return candidate as Record<string, any>;
            }
        }
        return undefined;
    }

    private pickString(...values: unknown[]): string {
        for (const value of values) {
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
        }
        return "";
    }

    private pickStructuredObject(...values: unknown[]): Record<string, any> | undefined {
        for (const value of values) {
            const parsed = this.parseStructuredValue(value);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return parsed as Record<string, any>;
            }
        }
        return undefined;
    }

    private pickStructuredValue(...values: unknown[]): unknown {
        for (const value of values) {
            const parsed = this.parseStructuredValue(value);
            if (parsed !== undefined && parsed !== null && parsed !== "") {
                return parsed;
            }
        }
        return undefined;
    }

    private parseStructuredValue(value: unknown): unknown {
        if (value === undefined || value === null) return undefined;
        if (typeof value === "object") return value;
        if (typeof value !== "string") return value;

        const trimmed = value.trim();
        if (!trimmed) return undefined;

        if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
            try {
                return JSON.parse(trimmed);
            } catch {
                return trimmed;
            }
        }

        return trimmed;
    }

    private pickStringArray(value: unknown): string[] {
        if (!Array.isArray(value)) return [];
        return value
            .map((item) => {
                if (typeof item === "string") return item.trim();
                if (item && typeof item === "object") {
                    const raw =
                        (item as Record<string, any>).content ?? (item as Record<string, any>).text;
                    return typeof raw === "string" ? raw.trim() : "";
                }
                return "";
            })
            .filter(Boolean);
    }

    private errMsg(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
