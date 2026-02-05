import { cn } from "@buildingai/ui/lib/utils";

import type { BlockNodeComponent } from "../base/block.base";
import { BRANCH_TYPE_COLORS, BRANCH_TYPE_LABELS, type ConditionBlockData } from "./condition.types";

export const ConditionNodeComponent: BlockNodeComponent<ConditionBlockData> = ({ data }) => {
  return (
    <div className="space-y-2 text-xs">
      {data.branches.map((branch) => (
        <div key={branch.id} className={cn("rounded border p-2", BRANCH_TYPE_COLORS[branch.type])}>
          {BRANCH_TYPE_LABELS[branch.type]}
        </div>
      ))}
    </div>
  );
};
