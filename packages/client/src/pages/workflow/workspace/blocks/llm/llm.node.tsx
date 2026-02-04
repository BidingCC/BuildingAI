import { cn } from "@buildingai/ui/lib/utils";

import { VARIABLE_TYPE_COLORS, type VariableType } from "../../types/variable.types";
import type { BlockNodeProps } from "../base/block.base";
import type { LlmBlockData } from "./llm.types";

export function LlmNodeComponent({ data }: BlockNodeProps<LlmBlockData>) {
  return (
    <div className="space-y-2 p-3">
      <div className="text-xs text-gray-500">{data.modelConfig.model}</div>

      <div className="border-t pt-2">
        <div className="mb-1 text-[10px] text-gray-400">输出</div>
        <div className="space-y-1">
          {data.outputs.map((v) => (
            <div key={v.name} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{v.label}</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  VARIABLE_TYPE_COLORS[v.type as VariableType],
                )}
              >
                {v.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
