import { cn } from "@buildingai/ui/lib/utils";

import { VARIABLE_TYPE_COLORS } from "../../types/variable.types";
import type { BlockNodeProps } from "../base/block.base";
import type { HttpBlockData } from "./http.types";

export function HttpNodeComponent({ data }: BlockNodeProps<HttpBlockData>) {
  const outputs = data.outputs;

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-blue-700">
          {data.method}
        </span>
        <span className="truncate text-gray-500">{data.url || "未配置"}</span>
      </div>

      {data.inputs?.length > 0 && (
        <div className="border-t pt-2">
          <div className="mb-1 text-[10px] text-gray-400">输入</div>
          <div className="space-y-1">
            {data.inputs.map((v) => (
              <div key={v.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{v.label || v.name}</span>
                <span
                  className={cn("rounded px-1 py-0.5 text-[10px]", VARIABLE_TYPE_COLORS[v.type])}
                >
                  {v.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t pt-2">
        <div className="mb-1 text-[10px] text-gray-400">输出</div>
        <div className="space-y-1">
          {outputs.map((v) => (
            <div key={v.name} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{v.label}</span>
              <span className={cn("rounded px-1 py-0.5 text-[10px]", VARIABLE_TYPE_COLORS[v.type])}>
                {v.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
