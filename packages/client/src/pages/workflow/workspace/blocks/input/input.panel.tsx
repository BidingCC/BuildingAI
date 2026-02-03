import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { cn } from "@buildingai/ui/lib/utils";
import { Plus, Trash2 } from "lucide-react";

import type { VariableType } from "../../types/variable.types";
import { VARIABLE_TYPE_COLORS } from "../../types/variable.types";
import type { BlockPanelComponent } from "../base/block.base";
import type { InputBlockData, InputVar } from "./input.types";

const VARIABLE_TYPES: { value: VariableType; label: string }[] = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "array", label: "Array" },
  { value: "object", label: "Object" },
  { value: "file", label: "File" },
  { value: "array[file]", label: "Array[File]" },
];

export const InputPanelComponent: BlockPanelComponent<InputBlockData> = ({ data, onChange }) => {
  const handleAdd = () => {
    const newVar: InputVar = {
      name: `var_${data.vars.length + 1}`,
      type: "string",
      label: `变量 ${data.vars.length + 1}`,
      required: false,
    };
    onChange({ vars: [...data.vars, newVar] });
  };

  const handleRemove = (index: number) => {
    onChange({ vars: data.vars.filter((_, i) => i !== index) });
  };

  const handleUpdate = (index: number, updates: Partial<InputVar>) => {
    const newVars = [...data.vars];
    newVars[index] = { ...newVars[index], ...updates };
    onChange({ vars: newVars });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">输入字段</h3>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="h-8 gap-1">
          <Plus className="size-4" />
          <span>添加</span>
        </Button>
      </div>

      {data.vars.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            暂无输入字段，
            <button type="button" onClick={handleAdd} className="text-primary hover:underline">
              点击添加
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.vars.map((v, index) => (
            <InputVarItem
              key={index}
              variable={v}
              onChange={(updates) => handleUpdate(index, updates)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface InputVarItemProps {
  variable: InputVar;
  onChange: (updates: Partial<InputVar>) => void;
  onRemove: () => void;
}

function InputVarItem({ variable, onChange, onRemove }: InputVarItemProps) {
  return (
    <div className="group bg-card rounded-lg border">
      <div className="p-2">
        <Input
          value={variable.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="h-8 flex-1"
          placeholder="显示标签"
        />
      </div>
      <div className="flex items-center gap-2 p-2">
        <span className="text-muted-foreground">{`{x}`}</span>

        <Input
          value={variable.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-8 w-28 font-mono text-sm"
          placeholder="变量名"
        />

        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
            VARIABLE_TYPE_COLORS[variable.type],
          )}
        >
          {variable.type}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive size-8 opacity-0 group-hover:opacity-100"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="space-y-3 border-t p-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">数据类型</label>
            <Select
              value={variable.type}
              onValueChange={(type) => onChange({ type: type as VariableType })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VARIABLE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <Switch
                checked={variable.required ?? false}
                onCheckedChange={(checked) => onChange({ required: checked })}
              />
              <span className="text-sm">必填</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
