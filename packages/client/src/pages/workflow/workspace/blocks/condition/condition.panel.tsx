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
import { produce } from "immer";
import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { memo, useCallback, useMemo } from "react";

import { VariablePicker } from "../../components/VariablePicker";
import { useWorkflowStore } from "../../store";
import type { VariableReference, VariableType } from "../../types/variable.types";
import { VariableUtils } from "../../utils/variable-utils";
import type { BlockPanelComponent } from "../base/block.base";
import type { ComparisonOperator, ConditionBlockData, ConditionBranch } from "./condition.types";
import { BRANCH_TYPE_COLORS, BRANCH_TYPE_LABELS, OPERATOR_LABELS } from "./condition.types";

interface BranchEditorProps {
  branch: ConditionBranch;
  index: number;
  onUpdate: (index: number, updater: (draft: ConditionBranch) => void) => void;
  onDelete: (index: number) => void;
  canDelete: boolean;
}

const BranchEditor = memo<BranchEditorProps>(({ branch, index, onUpdate, onDelete, canDelete }) => {
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

  const handleLeftRefChange = useCallback(
    (ref: VariableReference | null) => {
      onUpdate(index, (draft) => {
        if (draft.condition) {
          draft.condition.leftRef = ref || { nodeId: "", varName: "" };
          // 重置右值类型
          draft.condition.rightValue.valueType = undefined;
        }
      });
    },
    [index, onUpdate],
  );

  const handleOperatorChange = useCallback(
    (operator: ComparisonOperator) => {
      onUpdate(index, (draft) => {
        if (draft.condition) {
          draft.condition.operator = operator;
        }
      });
    },
    [index, onUpdate],
  );

  const handleRightValueTypeChange = useCallback(
    (type: "variable" | "custom") => {
      onUpdate(index, (draft) => {
        if (draft.condition) {
          draft.condition.rightValue = {
            type,
            valueType: leftVarType || "string",
            ref: undefined,
            value: undefined,
          };
        }
      });
    },
    [index, onUpdate, leftVarType],
  );

  const handleRightRefChange = useCallback(
    (ref: VariableReference | null) => {
      onUpdate(index, (draft) => {
        if (draft.condition) {
          draft.condition.rightValue.ref = ref || undefined;
        }
      });
    },
    [index, onUpdate],
  );

  const handleCustomValueChange = useCallback(
    (value: any) => {
      onUpdate(index, (draft) => {
        if (draft.condition) {
          draft.condition.rightValue.value = value;
          draft.condition.rightValue.valueType = leftVarType || "string";
        }
      });
    },
    [index, onUpdate, leftVarType],
  );

  const handleDelete = useCallback(() => {
    onDelete(index);
  }, [index, onDelete]);

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
            onClick={handleDelete}
            className="text-red-600 hover:bg-red-100 hover:text-red-700"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {/* else 分支没有条件 */}
      {branch.type !== "else" && branch.condition && (
        <div className="space-y-3 rounded border border-gray-200 bg-white p-3">
          <div className="space-y-1">
            <Label className="text-xs">左值（变量）</Label>
            <VariablePicker
              value={branch.condition.leftRef}
              onChange={handleLeftRefChange}
              placeholder="选择左值变量"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">运算符</Label>
            <Select value={branch.condition.operator} onValueChange={handleOperatorChange}>
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
                onValueChange={handleRightValueTypeChange}
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
                  onChange={handleRightRefChange}
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
                      onValueChange={(value) => handleCustomValueChange(value === "true")}
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
                        handleCustomValueChange(value);
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
});

export const ConditionPanelComponent: BlockPanelComponent<ConditionBlockData> = ({
  data,
  onChange,
}) => {
  const updateBranch = useCallback(
    (index: number, updater: (draft: ConditionBranch) => void) => {
      onChange(
        produce(data, (draft) => {
          updater(draft.branches[index]);
        }),
      );
    },
    [data, onChange],
  );

  const deleteBranch = useCallback(
    (index: number) => {
      onChange(
        produce(data, (draft) => {
          draft.branches.splice(index, 1);
        }),
      );
    },
    [data, onChange],
  );

  const addElseIf = useCallback(() => {
    onChange(
      produce(data, (draft) => {
        const elseIndex = draft.branches.findIndex((b) => b.type === "else");
        const newBranch: ConditionBranch = {
          id: nanoid(),
          type: "elif",
          handleId: `branch-${nanoid()}`,
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
        draft.branches.splice(elseIndex, 0, newBranch);
      }),
    );
  }, [data, onChange]);

  const canDelete = useCallback(
    (branch: ConditionBranch) => {
      if (branch.type === "if") {
        return data.branches.filter((b) => b.type === "if").length > 1;
      }
      return branch.type !== "else";
    },
    [data.branches],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">条件分支</Label>
          <span className="text-muted-foreground text-xs">共 {data.branches.length} 个分支</span>
        </div>

        {data.branches.map((branch, index) => (
          <BranchEditor
            key={branch.id}
            branch={branch}
            index={index}
            onUpdate={updateBranch}
            onDelete={deleteBranch}
            canDelete={canDelete(branch)}
          />
        ))}
      </div>

      <Button onClick={addElseIf} variant="outline" className="w-full border-dashed">
        <Plus className="mr-2 size-4" />
        添加 ELIF 分支
      </Button>
    </div>
  );
};
