import type { NodeProps } from "../types.ts";
import type { HttpNodeData } from "./http.types.ts";

const methodColors = {
  GET: "bg-green-100 text-green-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
  PATCH: "bg-purple-100 text-purple-700",
};

export function HttpNode(props: NodeProps<HttpNodeData>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${methodColors[props.data.method]}`}
        >
          {props.data.method}
        </span>
        <span className="truncate font-mono text-sm">{props.data.url || "未设置"}</span>
      </div>

      {props.data.headers.length > 0 && (
        <div className="text-xs text-gray-500">Headers: {props.data.headers.length} 项</div>
      )}

      {props.data.timeout && (
        <div className="text-xs text-gray-500">超时: {props.data.timeout}ms</div>
      )}
    </div>
  );
}
