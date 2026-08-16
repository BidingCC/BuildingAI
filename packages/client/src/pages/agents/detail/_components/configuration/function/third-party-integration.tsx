import type { ThirdPartyIntegrationConfig } from "@buildingai/types";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { testCozeConnection } from "@buildingai/services/web";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

type ThirdPartyIntegrationValue = ThirdPartyIntegrationConfig & {
  provider?: "coze" | "dify";
};

type ThirdPartyIntegrationProps = {
  mode: "coze" | "dify";
  value: ThirdPartyIntegrationValue | null;
  onChange: (value: ThirdPartyIntegrationValue | null) => void;
};

type ApiVersion = "v1" | "v2";

// 从 curl 命令中提取 domain 和 apiToken
function extractCurlMeta(raw: string): { domain?: string; token?: string } {
  const result: { domain?: string; token?: string } = {};

  // 提取 URL 中的 domain
  const urlMatch = raw.match(/https?:\/\/([^\/'"]+)/);
  if (urlMatch) {
    result.domain = urlMatch[1];
  }

  // 提取 Authorization Bearer token
  const tokenMatch = raw.match(/Authorization:\s*Bearer\s+([^\s'"]+)/i);
  if (tokenMatch) {
    result.token = tokenMatch[1];
  }

  return result;
}

// 智能解析输入内容为 JSON 对象
function smartParseJson(rawValue: string): {
  parsed: Record<string, any>;
  meta: { domain?: string; token?: string };
} | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const meta: { domain?: string; token?: string } = {};
  let jsonToParse = trimmed;

  // 从 curl 命令中提取元数据
  if (trimmed.startsWith("curl ")) {
    Object.assign(meta, extractCurlMeta(trimmed));

    // 提取 --data 中的 JSON
    const dataMatch = trimmed.match(
      /(?:--data(?:-raw)?|-d)\s+(['"])([\s\S]*?)\1/,
    );
    if (dataMatch) {
      jsonToParse = dataMatch[2];
    } else {
      const dataBraceMatch = trimmed.match(
        /(?:--data(?:-raw)?|-d)\s+(\{[\s\S]*\})/,
      );
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
    const parsed = JSON.parse(jsonToParse);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return { parsed, meta };
  } catch {
    return null;
  }
}

export const ThirdPartyIntegration = memo(
  ({ mode, value, onChange }: ThirdPartyIntegrationProps) => {
    const config = useMemo<ThirdPartyIntegrationValue>(
      () => ({
        provider: mode,
        appId: value?.appId ?? "",
        apiKey: value?.apiKey ?? "",
        baseURL: value?.baseURL ?? "",
        extendedConfig: value?.extendedConfig,
        variableMapping: value?.variableMapping,
        useExternalConversation: value?.useExternalConversation ?? true,
        apiVersion: value?.apiVersion ?? "v1",
        projectId: value?.projectId ?? "",
      }),
      [value],
    );

    const apiVersion = (config.apiVersion || "v1") as ApiVersion;
    const isNewApi = apiVersion === "v2";

    // 测试连接状态
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
      success: boolean;
      message: string;
    } | null>(null);

    // JSON 输入框状态（新版 API 的完整请求体 JSON）
    const [jsonInput, setJsonInput] = useState(() => {
      if (!value?.extendedConfig) return "";
      // 排除系统管理字段，只显示用户自定义字段
      const systemKeys = [
        "provider", "botId", "apiVersion", "projectId",
        "cozeSyncStatus", "cozeSyncError",
        "difySyncStatus", "difySyncError",
      ];
      const userFields: Record<string, any> = {};
      for (const [k, v] of Object.entries(value.extendedConfig)) {
        if (!systemKeys.includes(k)) {
          userFields[k] = v;
        }
      }
      return Object.keys(userFields).length > 0
        ? JSON.stringify(userFields, null, 2)
        : "";
    });
    const [jsonError, setJsonError] = useState<string | null>(null);

    // 从 JSON 中提取到的 Domain 显示
    const [extractedDomain, setExtractedDomain] = useState<string | null>(() => {
      // 初始化时从现有 config.baseURL 恢复
      return value?.baseURL || null;
    });

    const update = useCallback(
      (patch: Partial<ThirdPartyIntegrationValue>, skipEmptyCheck = false) => {
        setTestResult(null);
        const next: ThirdPartyIntegrationValue = {
          ...config,
          ...patch,
          provider: mode,
          extendedConfig: {
            ...(config.extendedConfig ?? {}),
            ...(patch.extendedConfig ?? {}),
            provider: mode,
          },
        };

        const targetIsNewApi = patch.apiVersion
          ? patch.apiVersion === "v2"
          : isNewApi;

        if (!targetIsNewApi) {
          const botId = (patch.appId ?? config.appId ?? "").trim();
          if (botId) {
            next.extendedConfig = {
              ...(next.extendedConfig ?? {}),
              botId,
            };
          }
        } else {
          next.extendedConfig = {
            ...(next.extendedConfig ?? {}),
            apiVersion: "v2",
          };
        }

        if (skipEmptyCheck) {
          onChange(next);
          return;
        }

        const isEmpty =
          mode === "coze"
            ? !next.appId && !next.apiKey && !next.baseURL && !next.projectId
            : !next.apiKey && !next.baseURL;

        onChange(isEmpty ? null : next);
      },
      [config, mode, onChange, isNewApi],
    );

    const handleApiVersionChange = useCallback(
      (version: ApiVersion) => {
        const patch: Partial<ThirdPartyIntegrationValue> = {
          apiVersion: version,
          appId: "",
          baseURL: "",
          apiKey: "",
          projectId: "",
        };
        update(patch, true);
        setJsonInput("");
        setJsonError(null);
        setExtractedDomain(null);
      },
      [update],
    );

    // 测试连接
    const handleTestConnection = useCallback(async () => {
      setTesting(true);
      setTestResult(null);
      try {
        const result = await testCozeConnection(config);
        setTestResult(result);
      } catch (error) {
        setTestResult({
          success: false,
          message: `请求失败: ${(error as Error).message}`,
        });
      } finally {
        setTesting(false);
      }
    }, [config]);

    // JSON 输入框变化处理
    const handleJsonChange = useCallback(
      (rawValue: string) => {
        setJsonInput(rawValue);

        if (!rawValue.trim()) {
          setJsonError(null);
          setExtractedDomain(null);
          const systemKeys = [
            "provider", "botId", "apiVersion", "projectId",
            "cozeSyncStatus", "cozeSyncError",
            "difySyncStatus", "difySyncError",
          ];
          const currentExt = config.extendedConfig ?? {};
          const systemFields: Record<string, any> = {};
          for (const [k, v] of Object.entries(currentExt)) {
            if (systemKeys.includes(k)) {
              systemFields[k] = v;
            }
          }
          update({ extendedConfig: systemFields, baseURL: "" });
          return;
        }

        const result = smartParseJson(rawValue);

        if (!result) {
          setJsonError("JSON 格式错误。请粘贴 Coze API 请求体 JSON、curl 命令或 Node.js 请求代码");
          return;
        }

        setJsonError(null);

        // 只提取非 Coze 请求体核心字段作为额外配置
        // Coze 请求体核心字段由系统自动生成，不需要用户持久化
        const cozeBodyCoreKeys = new Set([
          "type", "session_id", "project_id", "content",
          "domain", // curl 中提取的域名，不保存
        ]);
        const currentExt = config.extendedConfig ?? {};
        const extraConfig: Record<string, any> = { ...currentExt };
        // 只添加不在核心字段列表中的用户字段
        for (const [k, v] of Object.entries(result.parsed)) {
          if (!cozeBodyCoreKeys.has(k)) {
            extraConfig[k] = v;
          }
        }

        // 从 JSON 或 curl 中提取 domain
        let domain = result.meta.domain || "";
        if (!domain && result.parsed.domain) {
          domain = result.parsed.domain;
        }

        // 从 curl 中提取 token（仅当 apiKey 为空时填充）
        const autoToken = result.meta.token || "";

        // 提取 project_id（如果有）
        const projectId = result.parsed.project_id
          ? String(result.parsed.project_id)
          : "";

        if (domain) {
          setExtractedDomain(domain);
        }

        // 构建 patch：只保存额外配置字段 + 从 curl 提取的 domain/token/projectId
        const patch: Partial<ThirdPartyIntegrationValue> = {
          extendedConfig: extraConfig,
        };
        if (domain) {
          patch.baseURL = domain;
        }
        if (autoToken && !config.apiKey) {
          patch.apiKey = autoToken;
        }
        if (projectId) {
          patch.projectId = projectId;
        }

        update(patch);
      },
      [config.extendedConfig, config.apiKey, update],
    );

    const title = mode === "coze" ? "Coze 平台配置" : "Dify 平台配置";
    const description =
      mode === "coze"
        ? "配置 Coze Bot 相关参数，系统会从 Coze 获取智能体能力。"
        : "配置 Dify 应用相关参数，系统会通过 Dify 提供智能体能力。";

    return (
      <div className="bg-secondary rounded-lg px-3 py-2.5">
        <div className="mb-3 flex flex-col gap-0.5">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>

        <div className="space-y-3">
          {mode === "coze" && (
            <div className="space-y-1.5">
              <Label className="text-xs">API 版本</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isNewApi ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleApiVersionChange("v1")}
                >
                  旧版 (v3/v1 chat)
                </Button>
                <Button
                  type="button"
                  variant={isNewApi ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleApiVersionChange("v2")}
                >
                  新版 (stream_run)
                </Button>
              </div>
            </div>
          )}

          {!isNewApi && (
            <>
              {/* 旧版 API：保持原有分开的输入框 */}
              <div className="space-y-1.5">
                <Label className="text-xs">BASE URL</Label>
                <Input
                  placeholder="留空默认使用 Coze 官方地址，例如：https://api.coze.cn"
                  value={config.baseURL ?? ""}
                  className="bg-background"
                  onChange={(e) => update({ baseURL: e.target.value.trim() })}
                />
              </div>

              {mode === "coze" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Bot ID<span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Input
                    placeholder="请输入 Coze Bot ID"
                    value={config.appId ?? ""}
                    className="bg-background"
                    onChange={(e) => update({ appId: e.target.value.trim() })}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">
                  API Key<span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  type="password"
                  placeholder="请输入平台 API Key"
                  value={config.apiKey ?? ""}
                  className="bg-background"
                  autoComplete="new-password"
                  onChange={(e) => update({ apiKey: e.target.value.trim() })}
                />
              </div>
            </>
          )}

          {isNewApi && (
            <>
              {/* 新版 API：精简为 2 个核心输入框 */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  API Token<span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  type="password"
                  placeholder="请输入个人访问令牌（pat_xxx）"
                  value={config.apiKey ?? ""}
                  className="bg-background"
                  autoComplete="new-password"
                  onChange={(e) => update({ apiKey: e.target.value.trim() })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  请求配置 JSON<span className="text-destructive ml-0.5">*</span>
                </Label>
                <Textarea
                  placeholder={`粘贴 Coze 部署页面的 curl 命令或请求体 JSON，系统自动提取配置信息\n\n示例 curl：\ncurl --location --request POST 'https://xxx.coze.cn/stream_run' \\\n  --header 'Authorization: Bearer pat_xxxxx' \\\n  --data '{\n    "type": "query",\n    "project_id": 7647467737832407091,\n    "content": {\n      "query": {\n        "prompt": [{\n          "type": "text",\n          "content": { "text": "你好" }\n        }]\n      }\n    }\n  }'`}
                  value={jsonInput}
                  className={`bg-background min-h-[160px] font-mono text-xs ${
                    jsonError ? "border-red-500" : ""
                  }`}
                  onChange={(e) => handleJsonChange(e.target.value)}
                />
                {jsonError && (
                  <p className="text-destructive text-xs">{jsonError}</p>
                )}
                <p className="text-muted-foreground text-xs">
                  支持粘贴 curl 命令（自动提取 API Token、Domain、project_id）或纯请求体 JSON。
                </p>
              </div>

              {/* 自动提取信息展示 */}
              {extractedDomain && (
                <div className="bg-background rounded-md px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">检测到域名：</span>
                    <code className="bg-secondary rounded px-1.5 py-0.5 font-mono">
                      {extractedDomain}
                    </code>
                  </div>
                  {config.projectId && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-muted-foreground">检测到 Project ID：</span>
                      <code className="bg-secondary rounded px-1.5 py-0.5 font-mono">
                        {config.projectId}
                      </code>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 测试连接按钮 */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={
                testing ||
                !config.apiKey ||
                (isNewApi && !config.baseURL) ||
                (!isNewApi && !config.appId)
              }
              className="text-xs"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  测试中...
                </>
              ) : (
                "测试连接"
              )}
            </Button>
            {testResult && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  testResult.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                <span className="max-w-[220px] truncate" title={testResult.message}>
                  {testResult.message}
                </span>
              </div>
            )}
          </div>

          <div className="bg-background flex items-center justify-between rounded-md px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium">使用平台会话管理</span>
              <span className="text-muted-foreground mt-0.5 text-xs">
                开启后，由第三方平台管理会话上下文，否则由本系统统一管理。
              </span>
            </div>
            <Switch
              checked={config.useExternalConversation ?? true}
              onCheckedChange={(checked) => update({ useExternalConversation: checked })}
            />
          </div>
        </div>
      </div>
    );
  },
);

ThirdPartyIntegration.displayName = "ThirdPartyIntegration";
