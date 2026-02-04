import { cn } from "@buildingai/ui/lib/utils";

import { VARIABLE_TYPE_COLORS } from "../../types/variable.types";
import type { BlockNodeProps } from "../base/block.base";
import type { OutputBlockData } from "./output.types";

export function OutputNodeComponent({ data }: BlockNodeProps<OutputBlockData>) {
  return (
    <div className="p-3">
      {data.inputs?.length ? (
        <div className="space-y-1.5">
          {data.inputs.map((v) => (
            <div key={v.name} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{v.label || v.name}</span>
              <span
                className={cn("rounded px-1.5 py-0.5 text-[10px]", VARIABLE_TYPE_COLORS[v.type])}
              >
                {v.type}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-xs text-gray-400">无输出变量</div>
      )}
    </div>
  );
}
