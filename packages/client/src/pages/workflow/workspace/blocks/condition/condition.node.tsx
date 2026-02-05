import { Handle, Position } from "@xyflow/react";
import { type FunctionComponent, memo } from "react";

import type { BlockNodeComponent } from "../base/block.base";
import { BRANCH_TYPE_LABELS, type ConditionBlockData } from "./condition.types";

interface BranchItemProps {
  branch: ConditionBlockData["branches"][0];
}

const BranchItem: FunctionComponent<BranchItemProps> = memo(({ branch }) => {
  return (
    <div className="relative">
      <div className="rounded border px-3 py-2 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span className="font-bold">{BRANCH_TYPE_LABELS[branch.type]}</span>
          {branch.condition && (
            <span className="truncate text-[10px] opacity-70">
              {branch.condition.leftRef.varName || "(未配置)"}
            </span>
          )}
        </div>
      </div>
      <Handle
        type="source"
        id={branch.handleId}
        position={Position.Right}
        className="bg-primary! h-4 w-4 rounded-full"
      ></Handle>
    </div>
  );
});

export const ConditionNodeComponent: BlockNodeComponent<ConditionBlockData> = ({ data }) => {
  return (
    <div className="space-y-2 py-1">
      {data.branches.map((branch) => (
        <BranchItem key={branch.id} branch={branch} />
      ))}
    </div>
  );
};
