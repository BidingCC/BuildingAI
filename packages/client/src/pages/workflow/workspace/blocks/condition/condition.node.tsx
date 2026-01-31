import type { FunctionComponent } from "react";
import type { BlockNodeProps } from "../base/block.base";
import type { ConditionBlockData } from "./condition.types";
import { LOGICAL_OPERATOR_LABELS, OPERATOR_LABELS } from "./condition.types";

/**
 * Condition Node 组件
 */
export const ConditionNodeComponent: FunctionComponent<
  BlockNodeProps<ConditionBlockData>
> = ({ data }) => {
  const totalRules = data.groups.reduce((sum, group) => sum + group.rules.length, 0);

  return (
    <div className="space-y-2 text-xs">
      {/* 条件概览 */}
      <div className="flex items-center gap-2">
        <span className="rounded bg-purple-100 px-2 py-1 font-semibold text-purple-700">
          IF
        </span>
        <span className="text-gray-600">
          {data.groups.length} 组条件
        </span>
      </div>

      {/* 规则预览 */}
      <div className="space-y-1">
        {data.groups.slice(0, 2).map((group, groupIndex) => (
          <div key={group.id} className="rounded border border-gray-200 bg-gray-50 p-2">
            {groupIndex > 0 && (
              <div className="mb-1 text-center text-xs font-semibold text-gray-500">
                {LOGICAL_OPERATOR_LABELS[data.groupOperator]}
              </div>
            )}
            {group.rules.slice(0, 2).map((rule, ruleIndex) => (
              <div key={rule.id} className="text-gray-700">
                {ruleIndex > 0 && (
                  <span className="mr-1 text-xs text-gray-500">
                    {LOGICAL_OPERATOR_LABELS[group.operator]}
                  </span>
                )}
                <span className="font-medium">{rule.leftValue}</span>
                <span className="mx-1 text-gray-500">
                  {OPERATOR_LABELS[rule.operator]}
                </span>
                {rule.operator !== "is_empty" && rule.operator !== "is_not_empty" && (
                  <span className="font-medium">{rule.rightValue}</span>
                )}
              </div>
            ))}
            {group.rules.length > 2 && (
              <div className="text-gray-500">
                ...还有 {group.rules.length - 2} 条规则
              </div>
            )}
          </div>
        ))}
        {data.groups.length > 2 && (
          <div className="text-center text-gray-500">
            ...还有 {data.groups.length - 2} 组
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="flex items-center justify-between rounded bg-gray-100 px-2 py-1 text-gray-600">
        <span>总规则数: {totalRules}</span>
        <span className="rounded bg-white px-2 py-0.5">
          {data.groupOperator.toUpperCase()}
        </span>
      </div>
    </div>
  );
};
