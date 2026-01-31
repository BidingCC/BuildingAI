import type { BlockNodeComponent } from "../base/block.base";
import type { OutputBlockData } from "./output.types";

export const OutputNode: BlockNodeComponent<OutputBlockData> = ({ data }) => {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500">格式: {data.format || "json"}</div>
      {data.vars.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span className="text-sm font-medium">{item.label}:</span>
          <span className="rounded bg-blue-100 px-2 py-1 text-xs">
            {`{${item.type}} - ${item.name}`}
          </span>
        </div>
      ))}
    </div>
  );
};
