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
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useWorkflowStore } from "../../store/store";
import type { PanelProps } from "../types.ts";
import type { ConditionNodeData } from "./condition.types.ts";

export function ConditionPanel(props: PanelProps<ConditionNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const [formData, setFormData] = useState(props.data.conditions);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setFormData(props.data.conditions);
    setIsDirty(false);
  }, [props.id, props.data.conditions]);

  const handleAddCondition = useCallback(() => {
    setFormData([
      ...formData,
      {
        field: "",
        operator: "eq" as const,
        value: "",
        logicOperator: "and" as const,
      },
    ]);
    setIsDirty(true);
  }, [formData]);

  const handleRemoveCondition = useCallback(
    (index: number) => {
      setFormData(formData.filter((_, i) => i !== index));
      setIsDirty(true);
    },
    [formData],
  );

  const handleFieldChange = useCallback(
    (index: number, field: string) => {
      const newConditions = [...formData];
      newConditions[index] = { ...newConditions[index], field };
      setFormData(newConditions);
      setIsDirty(true);
    },
    [formData],
  );

  const handleOperatorChange = useCallback(
    (index: number, operator: ConditionNodeData["conditions"][0]["operator"]) => {
      const newConditions = [...formData];
      newConditions[index] = { ...newConditions[index], operator };
      setFormData(newConditions);
      setIsDirty(true);
    },
    [formData],
  );

  const handleValueChange = useCallback(
    (index: number, value: string) => {
      const newConditions = [...formData];
      newConditions[index] = { ...newConditions[index], value };
      setFormData(newConditions);
      setIsDirty(true);
    },
    [formData],
  );

  const handleLogicOperatorChange = useCallback(
    (index: number, logicOperator: "and" | "or") => {
      const newConditions = [...formData];
      newConditions[index] = { ...newConditions[index], logicOperator };
      setFormData(newConditions);
      setIsDirty(true);
    },
    [formData],
  );

  const handleSave = useCallback(() => {
    updateNodeData(props.id, { conditions: formData });
    setIsDirty(false);
  }, [formData, props.id, updateNodeData]);

  const handleCancel = useCallback(() => {
    setFormData(props.data.conditions);
    setIsDirty(false);
  }, [props.data.conditions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>条件规则</Label>
        <Button size="sm" variant="outline" onClick={handleAddCondition}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-[400px] space-y-3 overflow-y-auto">
        {formData.map((condition, index) => (
          <div key={index} className="space-y-2 rounded-lg border p-3">
            {index > 0 && (
              <Select
                value={condition.logicOperator}
                onValueChange={(value) => handleLogicOperatorChange(index, value as "and" | "or")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="逻辑运算符" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">AND (与)</SelectItem>
                  <SelectItem value="or">OR (或)</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="space-y-2">
              <Input
                placeholder="字段名称"
                value={condition.field}
                onChange={(e) => handleFieldChange(index, e.target.value)}
              />

              <Select
                value={condition.operator}
                onValueChange={(value) =>
                  handleOperatorChange(
                    index,
                    value as ConditionNodeData["conditions"][0]["operator"],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eq">等于</SelectItem>
                  <SelectItem value="ne">不等于</SelectItem>
                  <SelectItem value="gt">大于</SelectItem>
                  <SelectItem value="lt">小于</SelectItem>
                  <SelectItem value="gte">大于等于</SelectItem>
                  <SelectItem value="lte">小于等于</SelectItem>
                  <SelectItem value="contains">包含</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="比较值"
                value={condition.value}
                onChange={(e) => handleValueChange(index, e.target.value)}
              />
            </div>

            {formData.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full"
                onClick={() => handleRemoveCondition(index)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除条件
              </Button>
            )}
          </div>
        ))}
      </div>

      {isDirty && (
        <div className="flex gap-2 border-t pt-4">
          <Button onClick={handleSave} className="flex-1">
            保存
          </Button>
          <Button onClick={handleCancel} variant="outline" className="flex-1">
            取消
          </Button>
        </div>
      )}
    </div>
  );
}
