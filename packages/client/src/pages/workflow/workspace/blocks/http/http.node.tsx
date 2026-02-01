import type { BlockNodeComponent } from "../base/block.base";
import type { HttpBlockData } from "./http.types";
import { HTTP_METHODS } from "./http.types";

export const HttpNodeComponent: BlockNodeComponent<HttpBlockData> = ({ data }) => {
  const methodConfig = HTTP_METHODS.find((m) => m.value === data.method);
  const activeHeaders = data.headers.filter((h) => h.enabled).length;
  const activeParams = data.queryParams.filter((p) => p.enabled).length;

  return (
    <div className="space-y-2 text-xs">
      {/* HTTP 方法和 URL */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-1 font-bold ${methodConfig?.color || "bg-gray-100"}`}>
            {data.method}
          </span>
        </div>
        <div className="rounded border border-gray-200 bg-gray-50 p-2">
          <div className="break-all text-gray-700">{data.url || "未设置 URL"}</div>
        </div>
      </div>

      {/* 请求配置概览 */}
      <div className="grid grid-cols-2 gap-2">
        {/* 请求头数量 */}
        {activeHeaders > 0 && (
          <div className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1">
            <span className="text-blue-700">📋</span>
            <span className="text-blue-700">{activeHeaders} 个请求头</span>
          </div>
        )}

        {/* 查询参数数量 */}
        {activeParams > 0 && (
          <div className="flex items-center gap-1 rounded bg-green-50 px-2 py-1">
            <span className="text-green-700">🔗</span>
            <span className="text-green-700">{activeParams} 个参数</span>
          </div>
        )}

        {/* 认证类型 */}
        {data.auth.type !== "none" && (
          <div className="flex items-center gap-1 rounded bg-purple-50 px-2 py-1">
            <span className="text-purple-700">🔐</span>
            <span className="text-purple-700">{data.auth.type}</span>
          </div>
        )}

        {/* 请求体类型 */}
        {data.bodyType !== "none" && (
          <div className="flex items-center gap-1 rounded bg-yellow-50 px-2 py-1">
            <span className="text-yellow-700">📦</span>
            <span className="text-yellow-700">{data.bodyType.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* 超时和重试 */}
      {(data.timeout || data.retries) && (
        <div className="flex items-center gap-2 text-gray-600">
          {data.timeout && <span>⏱️ {data.timeout}ms</span>}
          {data.retries && <span>🔄 {data.retries} 次重试</span>}
        </div>
      )}
    </div>
  );
};
