import type { FunctionComponent } from "react";
import { useState } from "react";
import { nanoid } from "nanoid";
import type { BlockPanelProps } from "../base/block.base";
import type {
  AuthType,
  BodyType,
  HttpBlockData,
  HttpHeader,
  HttpMethod,
  QueryParam,
} from "./http.types";
import { AUTH_TYPE_LABELS, HTTP_METHODS } from "./http.types";

/**
 * 标签页类型
 */
type TabType = "basic" | "headers" | "params" | "auth" | "body" | "advanced";

/**
 * 键值对编辑器
 */
const KeyValueEditor: FunctionComponent<{
  items: Array<HttpHeader | QueryParam>;
  onUpdate: (items: Array<HttpHeader | QueryParam>) => void;
  placeholder?: { key: string; value: string };
}> = ({ items, onUpdate, placeholder = { key: "键", value: "值" } }) => {
  const addItem = () => {
    onUpdate([...items, { id: nanoid(), key: "", value: "", enabled: true }]);
  };

  const updateItem = (index: number, updates: Partial<HttpHeader | QueryParam>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdate(newItems);
  };

  const deleteItem = (index: number) => {
    onUpdate(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => updateItem(index, { enabled: e.target.checked })}
            className="h-4 w-4"
          />
          <input
            type="text"
            value={item.key}
            onChange={(e) => updateItem(index, { key: e.target.value })}
            className="flex-1 rounded border px-2 py-1 text-sm"
            placeholder={placeholder.key}
          />
          <input
            type="text"
            value={item.value}
            onChange={(e) => updateItem(index, { value: e.target.value })}
            className="flex-1 rounded border px-2 py-1 text-sm"
            placeholder={placeholder.value}
          />
          <button
            onClick={() => deleteItem(index)}
            className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
          >
            删除
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="w-full rounded border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-100"
      >
        + 添加
      </button>
    </div>
  );
};

/**
 * HTTP Panel 组件
 */
export const HttpPanelComponent: FunctionComponent<BlockPanelProps<HttpBlockData>> = ({
  data,
  onDataChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("basic");

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: "basic", label: "基础" },
    { id: "headers", label: "请求头" },
    { id: "params", label: "参数" },
    { id: "auth", label: "认证" },
    { id: "body", label: "请求体" },
    { id: "advanced", label: "高级" },
  ];

  return (
    <div className="space-y-4">
      {/* 标签页导航 */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-3 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      <div className="min-h-[300px]">
        {/* 基础配置 */}
        {activeTab === "basic" && (
          <div className="space-y-3">
            {/* HTTP 方法 */}
            <div>
              <label className="text-xs font-medium text-gray-700">请求方法</label>
              <div className="mt-1 grid grid-cols-4 gap-2">
                {HTTP_METHODS.slice(0, 4).map((method) => (
                  <button
                    key={method.value}
                    onClick={() => onDataChange({ method: method.value })}
                    className={`rounded px-3 py-2 text-sm font-semibold ${
                      data.method === method.value
                        ? method.color
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {HTTP_METHODS.slice(4).map((method) => (
                  <button
                    key={method.value}
                    onClick={() => onDataChange({ method: method.value })}
                    className={`rounded px-3 py-2 text-sm font-semibold ${
                      data.method === method.value
                        ? method.color
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* URL */}
            <div>
              <label className="text-xs font-medium text-gray-700">请求 URL *</label>
              <input
                type="text"
                value={data.url}
                onChange={(e) => onDataChange({ url: e.target.value })}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                placeholder="https://api.example.com/endpoint"
              />
              <div className="mt-1 text-xs text-gray-500">
                支持变量: {"{{variable_name}}"}
              </div>
            </div>

            {/* 输出变量 */}
            <div>
              <label className="text-xs font-medium text-gray-700">输出变量</label>
              <input
                type="text"
                value={data.outputVariable || ""}
                onChange={(e) => onDataChange({ outputVariable: e.target.value })}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                placeholder="http_response"
              />
            </div>

            {/* 响应提取 */}
            <div>
              <label className="text-xs font-medium text-gray-700">响应提取</label>
              <select
                value={data.extractResponse || "body"}
                onChange={(e) =>
                  onDataChange({
                    extractResponse: e.target.value as HttpBlockData["extractResponse"],
                  })
                }
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                <option value="full">完整响应</option>
                <option value="body">仅响应体</option>
                <option value="headers">仅响应头</option>
                <option value="status">仅状态码</option>
              </select>
            </div>
          </div>
        )}

        {/* 请求头 */}
        {activeTab === "headers" && (
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700">
              HTTP 请求头
            </label>
            <KeyValueEditor
              items={data.headers}
              onUpdate={(items) => onDataChange({ headers: items as HttpHeader[] })}
              placeholder={{ key: "Header 名称", value: "Header 值" }}
            />
          </div>
        )}

        {/* 查询参数 */}
        {activeTab === "params" && (
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700">
              URL 查询参数
            </label>
            <KeyValueEditor
              items={data.queryParams}
              onUpdate={(items) =>
                onDataChange({ queryParams: items as QueryParam[] })
              }
              placeholder={{ key: "参数名", value: "参数值" }}
            />
          </div>
        )}

        {/* 认证配置 */}
        {activeTab === "auth" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700">认证类型</label>
              <select
                value={data.auth.type}
                onChange={(e) =>
                  onDataChange({
                    auth: { ...data.auth, type: e.target.value as AuthType },
                  })
                }
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                {Object.entries(AUTH_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {data.auth.type === "bearer" && (
              <div>
                <label className="text-xs font-medium text-gray-700">Bearer Token</label>
                <input
                  type="text"
                  value={data.auth.token || ""}
                  onChange={(e) =>
                    onDataChange({
                      auth: { ...data.auth, token: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  placeholder="your-token-here"
                />
              </div>
            )}

            {data.auth.type === "basic" && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-700">用户名</label>
                  <input
                    type="text"
                    value={data.auth.username || ""}
                    onChange={(e) =>
                      onDataChange({
                        auth: { ...data.auth, username: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">密码</label>
                  <input
                    type="password"
                    value={data.auth.password || ""}
                    onChange={(e) =>
                      onDataChange({
                        auth: { ...data.auth, password: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            {data.auth.type === "api_key" && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-700">API Key</label>
                  <input
                    type="text"
                    value={data.auth.apiKey || ""}
                    onChange={(e) =>
                      onDataChange({
                        auth: { ...data.auth, apiKey: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Header 名称
                  </label>
                  <input
                    type="text"
                    value={data.auth.apiKeyHeader || ""}
                    onChange={(e) =>
                      onDataChange({
                        auth: { ...data.auth, apiKeyHeader: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    placeholder="X-API-Key"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* 请求体 */}
        {activeTab === "body" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700">请求体类型</label>
              <select
                value={data.bodyType}
                onChange={(e) =>
                  onDataChange({ bodyType: e.target.value as BodyType })
                }
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                <option value="none">无请求体</option>
                <option value="json">JSON</option>
                <option value="form">表单数据</option>
                <option value="text">纯文本</option>
                <option value="xml">XML</option>
              </select>
            </div>

            {data.bodyType !== "none" && (
              <div>
                <label className="text-xs font-medium text-gray-700">请求体内容</label>
                <textarea
                  value={data.body || ""}
                  onChange={(e) => onDataChange({ body: e.target.value })}
                  className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm"
                  rows={10}
                  placeholder={
                    data.bodyType === "json"
                      ? '{\n  "key": "value"\n}'
                      : "请输入请求体内容..."
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* 高级配置 */}
        {activeTab === "advanced" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700">
                超时时间 (毫秒)
              </label>
              <input
                type="number"
                value={data.timeout || 30000}
                onChange={(e) =>
                  onDataChange({ timeout: parseInt(e.target.value) || 30000 })
                }
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                min={0}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">重试次数</label>
              <input
                type="number"
                value={data.retries || 0}
                onChange={(e) =>
                  onDataChange({ retries: parseInt(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                min={0}
                max={5}
              />
            </div>

            {data.retries! > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-700">
                  重试延迟 (毫秒)
                </label>
                <input
                  type="number"
                  value={data.retryDelay || 1000}
                  onChange={(e) =>
                    onDataChange({ retryDelay: parseInt(e.target.value) || 1000 })
                  }
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  min={0}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="followRedirects"
                  checked={data.followRedirects ?? true}
                  onChange={(e) =>
                    onDataChange({ followRedirects: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <label htmlFor="followRedirects" className="text-sm text-gray-700">
                  自动跟随重定向
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="validateStatus"
                  checked={data.validateStatus ?? true}
                  onChange={(e) =>
                    onDataChange({ validateStatus: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <label htmlFor="validateStatus" className="text-sm text-gray-700">
                  验证 HTTP 状态码
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
