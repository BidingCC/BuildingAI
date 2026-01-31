import type { FunctionComponent } from "react";

import type { BlockNodeProps } from "../base/block.base.ts";
import type { InputBlockData } from "./input.types.ts";

export const InputNode: FunctionComponent<BlockNodeProps<InputBlockData>> = ({ data }) => {
  return (
    <div className="space-y-2">
      {data.vars.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span className="text-sm font-medium">{item.label}:</span>
          <span className="rounded bg-gray-200 px-2 py-1 text-xs">
            {`{${item.type}} - ${item.name}`}
          </span>
        </div>
      ))}
    </div>
  );
};
