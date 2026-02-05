import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { cn } from "@buildingai/ui/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useMemo } from "react";

import { VariablePicker } from "../../components/VariablePicker";
import { useWorkflowStore } from "../../store";
import type { VariableType } from "../../types/variable.types";
import { VariableUtils } from "../../utils/variable-utils";
import type { BlockPanelComponent } from "../base/block.base";
import type { ComparisonOperator, ConditionBlockData, ConditionBranch } from "./condition.types";
import { BRANCH_TYPE_COLORS, BRANCH_TYPE_LABELS, OPERATOR_LABELS } from "./condition.types";

interface BranchEditor {
  branch: ConditionBranch;
  index: number;
  onUpdate: (branch: ConditionBranch) => void;
  onDelete: () => void;
  canDelete: boolean;
}

const BranchEditor = ({ branch, onUpdate, onDelete, canDelete }: BranchEditor) => {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);

  // 获取左值变量的类型
  const leftVarType = useMemo<VariableType | null>(() => {
    if (!branch.condition?.leftRef.nodeId || !branch.condition?.leftRef.varName) {
      return null;
    }

    if (!selectedNodeId) return null;

    const availableVars = VariableUtils.getAvailableVariables(selectedNodeId, nodes, edges, true);
    const leftVar = availableVars.find(
      (v) =>
        v.nodeId === branch.condition!.leftRef.nodeId &&
        v.variable.name === branch.condition!.leftRef.varName,
    );

    return leftVar?.variable.type || null;
  }, [branch.condition?.leftRef, selectedNodeId, nodes, edges]);

  const needsRightValue =
    branch.condition?.operator !== "is_empty" && branch.condition?.operator !== "is_not_empty";

  return (
    <div className={cn("space-y-3 rounded-lg border-2 p-4", BRANCH_TYPE_COLORS[branch.type])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded px-2 py-1 text-sm font-bold">
            {BRANCH_TYPE_LABELS[branch.type]}
          </span>
        </div>

        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-100 hover:text-red-700"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {/* 条件配置（else 分支没有条件） */}
      {branch.type !== "else" && branch.condition && (
        <div className="space-y-3 rounded border border-gray-200 bg-white p-3">
          {/* 左值：必须是变量 */}
          <div className="space-y-1">
            <Label className="text-xs">左值（变量）</Label>
            <VariablePicker
              value={branch.condition.leftRef}
              onChange={(ref) => {
                onUpdate({
                  ...branch,
                  condition: {
                    ...branch.condition!,
                    leftRef: ref || { nodeId: "", varName: "" },
                    // 重置右值类型
                    rightValue: {
                      ...branch.condition!.rightValue,
                      valueType: undefined,
                    },
                  },
                });
              }}
              placeholder="选择左值变量"
            />
          </div>

          {/* 运算符 */}
          <div className="space-y-1">
            <Label className="text-xs">运算符</Label>
            <Select
              value={branch.condition.operator}
              onValueChange={(value) => {
                onUpdate({
                  ...branch,
                  condition: {
                    ...branch.condition!,
                    operator: value as ComparisonOperator,
                  },
                });
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 右值 */}
          {needsRightValue && (
            <div className="space-y-2">
              <Label className="text-xs">右值</Label>

              {/* 选择右值类型：变量或自定义 */}
              <Select
                value={branch.condition.rightValue.type}
                onValueChange={(value: "variable" | "custom") => {
                  onUpdate({
                    ...branch,
                    condition: {
                      ...branch.condition!,
                      rightValue: {
                        type: value,
                        valueType: leftVarType || "string",
                        // 切换时清空之前的值
                        ref: undefined,
                        value: undefined,
                      },
                    },
                  });
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="variable">变量</SelectItem>
                  <SelectItem value="custom">自定义值</SelectItem>
                </SelectContent>
              </Select>

              {/* 变量选择 */}
              {branch.condition.rightValue.type === "variable" && (
                <VariablePicker
                  value={branch.condition.rightValue.ref || null}
                  onChange={(ref) => {
                    onUpdate({
                      ...branch,
                      condition: {
                        ...branch.condition!,
                        rightValue: {
                          ...branch.condition!.rightValue,
                          ref: ref || undefined,
                        },
                      },
                    });
                  }}
                  typeFilter={leftVarType ? [leftVarType] : undefined}
                  placeholder="选择右值变量"
                />
              )}

              {/* 自定义值输入 */}
              {branch.condition.rightValue.type === "custom" && (
                <div>
                  {leftVarType === "boolean" ? (
                    <Select
                      value={String(branch.condition.rightValue.value || "true")}
                      onValueChange={(value) => {
                        onUpdate({
                          ...branch,
                          condition: {
                            ...branch.condition!,
                            rightValue: {
                              ...branch.condition!.rightValue,
                              value: value === "true",
                              valueType: "boolean",
                            },
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">true</SelectItem>
                        <SelectItem value="false">false</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={leftVarType === "number" ? "number" : "text"}
                      value={branch.condition.rightValue.value || ""}
                      onChange={(e) => {
                        const value =
                          leftVarType === "number" ? Number(e.target.value) : e.target.value;
                        onUpdate({
                          ...branch,
                          condition: {
                            ...branch.condition!,
                            rightValue: {
                              ...branch.condition!.rightValue,
                              value,
                              valueType: leftVarType || "string",
                            },
                          },
                        });
                      }}
                      placeholder={`输入${leftVarType === "number" ? "数字" : "文本"}值`}
                      className="h-8"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ConditionPanelComponent: BlockPanelComponent<ConditionBlockData> = ({
  data,
  onChange,
}) => {
  const addElseIf = () => {
    const elseIndex = data.branches.findIndex((b) => b.type === "else");
    const newBranch: ConditionBranch = {
      id: nanoid(),
      type: "elif",
      condition: {
        leftRef: { nodeId: "", varName: "" },
        operator: "equals",
        rightValue: {
          type: "custom",
          value: "",
          valueType: "string",
        },
      },
    };

    // 插入到 else 之前
    const newBranches = [...data.branches];
    newBranches.splice(elseIndex, 0, newBranch);
    onChange({ branches: newBranches });
  };

  const updateBranch = (index: number, branch: ConditionBranch) => {
    const newBranches = [...data.branches];
    newBranches[index] = branch;
    onChange({ branches: newBranches });
  };

  const deleteBranch = (index: number) => {
    const newBranches = data.branches.filter((_, i) => i !== index);
    onChange({ branches: newBranches });
  };

  const canDelete = (branch: ConditionBranch) => {
    if (branch.type === "if") {
      return data.branches.filter((b) => b.type === "if").length > 1;
    }
    return branch.type !== "else";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">条件分支</Label>
        {data.branches.map((branch, index) => (
          <BranchEditor
            key={branch.id}
            branch={branch}
            index={index}
            onUpdate={(b) => updateBranch(index, b)}
            onDelete={() => deleteBranch(index)}
            canDelete={canDelete(branch)}
          />
        ))}
      </div>

      <Button onClick={addElseIf} variant="outline" className="w-full border-dashed">
        <Plus className="mr-2 size-4" />
        添加 ELSE-IF 分支
      </Button>
    </div>
  );
};
