import type { FunctionComponent } from "react";
import { nanoid } from "nanoid";
import type { BlockPanelProps } from "../base/block.base";
import type {
  ConditionBlockData,
  ConditionGroup,
  ConditionRule,
  ComparisonOperator,
  LogicalOperator,
  ValueType,
} from "./condition.types";
import { LOGICAL_OPERATOR_LABELS, OPERATOR_LABELS } from "./condition.types";

/**
 * 单个规则编辑器
 */
const RuleEditor: FunctionComponent<{
  rule: ConditionRule;
  onUpdate: (rule: ConditionRule) => void;
  onDelete: () => void;
}> = ({ rule, onUpdate, onDelete }) => {
  const needsRightValue =
    rule.operator !== "is_empty" && rule.operator !== "is_not_empty";

  return (
    <div className="space-y-2 rounded border border-gray-200 bg-white p-3">
      {/* 左值 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <input
            type="text"
            value={rule.leftValue}
            onChange={(e) => onUpdate({ ...rule, leftValue: e.target.value })}
            className="w-full rounded border px-2 py-1 text-sm"
            placeholder="变量或值"
          />
        </div>
        <div>
          <select
            value={rule.leftType}
            onChange={(e) =>
              onUpdate({ ...rule, leftType: e.target.value as ValueType })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          >
            <option value="variable">变量</option>
            <option value="string">文本</option>
            <option value="number">数字</option>
            <option value="boolean">布尔</option>
          </select>
        </div>
      </div>

      {/* 运算符 */}
      <div>
        <select
          value={rule.operator}
          onChange={(e) =>
            onUpdate({ ...rule, operator: e.target.value as ComparisonOperator })
          }
          className="w-full rounded border px-2 py-1 text-sm"
        >
          {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* 右值 */}
      {needsRightValue && (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <input
              type="text"
              value={rule.rightValue}
              onChange={(e) => onUpdate({ ...rule, rightValue: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
              placeholder="比较值"
            />
          </div>
          <div>
            <select
              value={rule.rightType}
              onChange={(e) =>
                onUpdate({ ...rule, rightType: e.target.value as ValueType })
              }
              className="w-full rounded border px-2 py-1 text-sm"
            >
              <option value="variable">变量</option>
              <option value="string">文本</option>
              <option value="number">数字</option>
              <option value="boolean">布尔</option>
            </select>
          </div>
        </div>
      )}

      {/* 删除按钮 */}
      <button
        onClick={onDelete}
        className="w-full rounded bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100"
      >
        删除规则
      </button>
    </div>
  );
};

/**
 * 条件组编辑器
 */
const GroupEditor: FunctionComponent<{
  group: ConditionGroup;
  onUpdate: (group: ConditionGroup) => void;
  onDelete: () => void;
}> = ({ group, onUpdate, onDelete }) => {
  const addRule = () => {
    const newRule: ConditionRule = {
      id: nanoid(),
      leftValue: "",
      leftType: "variable",
      operator: "equals",
      rightValue: "",
      rightType: "string",
    };
    onUpdate({ ...group, rules: [...group.rules, newRule] });
  };

  const updateRule = (index: number, rule: ConditionRule) => {
    const newRules = [...group.rules];
    newRules[index] = rule;
    onUpdate({ ...group, rules: newRules });
  };

  const deleteRule = (index: number) => {
    const newRules = group.rules.filter((_, i) => i !== index);
    onUpdate({ ...group, rules: newRules });
  };

  return (
    <div className="space-y-3 rounded-lg border-2 border-purple-200 bg-purple-50 p-3">
      {/* 组头部 */}
      <div className="flex items-center justify-between">
        <select
          value={group.operator}
          onChange={(e) =>
            onUpdate({ ...group, operator: e.target.value as LogicalOperator })
          }
          className="rounded border bg-white px-3 py-1 text-sm font-medium"
        >
          {Object.entries(LOGICAL_OPERATOR_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={onDelete}
          className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
        >
          删除组
        </button>
      </div>

      {/* 规则列表 */}
      <div className="space-y-2">
        {group.rules.map((rule, index) => (
          <div key={rule.id}>
            {index > 0 && (
              <div className="my-1 text-center text-xs font-semibold text-purple-700">
                {LOGICAL_OPERATOR_LABELS[group.operator]}
              </div>
            )}
            <RuleEditor
              rule={rule}
              onUpdate={(r) => updateRule(index, r)}
              onDelete={() => deleteRule(index)}
            />
          </div>
        ))}
      </div>

      {/* 添加规则按钮 */}
      <button
        onClick={addRule}
        className="w-full rounded border-2 border-dashed border-purple-300 bg-white px-3 py-2 text-sm text-purple-600 hover:border-purple-400 hover:bg-purple-50"
      >
        + 添加规则
      </button>
    </div>
  );
};

/**
 * Condition Panel 组件
 */
export const ConditionPanelComponent: FunctionComponent<
  BlockPanelProps<ConditionBlockData>
> = ({ data, onDataChange }) => {
  const addGroup = () => {
    const newGroup: ConditionGroup = {
      id: nanoid(),
      operator: "and",
      rules: [
        {
          id: nanoid(),
          leftValue: "",
          leftType: "variable",
          operator: "equals",
          rightValue: "",
          rightType: "string",
        },
      ],
    };
    onDataChange({ groups: [...data.groups, newGroup] });
  };

  const updateGroup = (index: number, group: ConditionGroup) => {
    const newGroups = [...data.groups];
    newGroups[index] = group;
    onDataChange({ groups: newGroups });
  };

  const deleteGroup = (index: number) => {
    const newGroups = data.groups.filter((_, i) => i !== index);
    onDataChange({ groups: newGroups });
  };

  return (
    <div className="space-y-4">
      {/* 条件组列表 */}
      <div className="space-y-3">
        <label className="text-sm font-semibold">条件规则</label>
        {data.groups.map((group, index) => (
          <div key={group.id}>
            {index > 0 && (
              <div className="my-2">
                <select
                  value={data.groupOperator}
                  onChange={(e) =>
                    onDataChange({
                      groupOperator: e.target.value as LogicalOperator,
                    })
                  }
                  className="w-full rounded bg-gray-100 px-3 py-2 text-center font-semibold text-gray-700"
                >
                  {Object.entries(LOGICAL_OPERATOR_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <GroupEditor
              group={group}
              onUpdate={(g) => updateGroup(index, g)}
              onDelete={() => deleteGroup(index)}
            />
          </div>
        ))}
      </div>

      {/* 添加条件组 */}
      <button
        onClick={addGroup}
        className="w-full rounded border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-100"
      >
        + 添加条件组
      </button>

      {/* 输出配置 */}
      <div className="space-y-2 border-t pt-4">
        <label className="text-sm font-semibold">输出配置</label>
        
        <div>
          <label className="text-xs text-gray-600">True 分支输出变量</label>
          <input
            type="text"
            value={data.trueOutput || ""}
            onChange={(e) => onDataChange({ trueOutput: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="condition_true"
          />
        </div>

        <div>
          <label className="text-xs text-gray-600">False 分支输出变量</label>
          <input
            type="text"
            value={data.falseOutput || ""}
            onChange={(e) => onDataChange({ falseOutput: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="condition_false"
          />
        </div>

        <div>
          <label className="text-xs text-gray-600">默认分支</label>
          <select
            value={data.defaultBranch || "both"}
            onChange={(e) =>
              onDataChange({
                defaultBranch: e.target.value as ConditionBlockData["defaultBranch"],
              })
            }
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="true">True 分支</option>
            <option value="false">False 分支</option>
            <option value="both">两个分支都执行</option>
          </select>
        </div>
      </div>
    </div>
  );
};
