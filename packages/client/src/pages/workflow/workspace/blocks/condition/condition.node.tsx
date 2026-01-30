import type { NodeProps } from "../types.ts";
import type { ConditionNodeData } from "./condition.types.ts";

const OperatorLabels = {
  eq: "等于",
  ne: "不等于",
  gt: "大于",
  lt: "小于",
  gte: "大于等于",
  lte: "小于等于",
  contains: "包含",
};

export function ConditionNode(props: NodeProps<ConditionNodeData>) {
  return (
    <div className="space-y-2">
      {props.data.conditions.map((condition, index) => (
        <div key={index} className="text-sm">
          {index > 0 && condition.logicOperator && (
            <div className="my-1 text-xs text-gray-500 uppercase">{condition.logicOperator}</div>
          )}
          <div className="flex items-center gap-1">
            <span className="font-medium">{condition.field}</span>
            <span className="text-gray-500">{OperatorLabels[condition.operator]}</span>
            <span className="rounded bg-blue-100 px-2 py-0.5">{condition.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
