import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { cn } from "@buildingai/ui/lib/utils";
import { Plus, Trash2 } from "lucide-react";

import type { InputVariable, VariableDefinition, VariableType } from "../types/variable.types";
import { VARIABLE_TYPE_COLORS, VARIABLE_TYPE_OPTIONS } from "../types/variable.types";
import { VariablePicker } from "./VariablePicker";

interface VarListEditableProps {
  title?: string;
  variables: VariableDefinition[];
  onChange: (variables: VariableDefinition[]) => void;
  maxCount?: number;
  newVarPrefix?: string;
}

export function VarListEditable({
  title = "变量",
  variables,
  onChange,
  maxCount = 20,
  newVarPrefix = "var",
}: VarListEditableProps) {
  const handleAdd = () => {
    if (variables.length >= maxCount) return;
    const newVar: VariableDefinition = {
      name: `${newVarPrefix}${variables.length + 1}`,
      label: `变量 ${variables.length + 1}`,
      type: "string",
    };
    onChange([...variables, newVar]);
  };

  const handleRemove = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updates: Partial<VariableDefinition>) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], ...updates };
    onChange(newVars);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleAdd}
          disabled={variables.length >= maxCount}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {variables.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
          暂无变量，
          <button type="button" onClick={handleAdd} className="text-primary hover:underline">
            点击添加
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {variables.map((variable, index) => (
            <div key={index} className="bg-card space-y-2 rounded-lg border p-2">
              <div className="flex items-center gap-2">
                <Input
                  value={variable.label}
                  onChange={(e) => handleUpdate(index, { label: e.target.value })}
                  className="h-8 flex-1"
                  placeholder="显示标签"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive size-8 group-hover:opacity-100"
                  onClick={() => handleRemove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={variable.name}
                  onChange={(e) => handleUpdate(index, { name: e.target.value })}
                  className="h-8 w-28 font-mono text-sm"
                  placeholder="变量名"
                />
                <Select
                  value={variable.type}
                  onValueChange={(type) => handleUpdate(index, { type: type as VariableType })}
                >
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      {variables.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {variables.length} / {maxCount} 个变量
        </p>
      )}
    </div>
  );
}

interface VarListReadonlyProps {
  title?: string;
  variables: VariableDefinition[];
  hint?: string;
}

export function VarListReadonly({ title = "输出变量", variables }: VarListReadonlyProps) {
  if (variables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">只读</span>
      </div>

      <div className="bg-muted/30 space-y-2 rounded-lg border p-3">
        {variables.map((v) => (
          <div key={v.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono">{`{x}`}</span>
              <span className="font-medium">{v.name}</span>
              {v.label !== v.name && <span className="text-muted-foreground">· {v.label}</span>}
            </div>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                VARIABLE_TYPE_COLORS[v.type],
              )}
            >
              {v.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface VarListWithRefProps {
  title?: string;
  variables: InputVariable[];
  onChange: (variables: InputVariable[]) => void;
  maxCount?: number;
  newVarPrefix?: string;
}

export function VarListWithRef({
  title = "变量",
  variables,
  onChange,
  maxCount = 20,
  newVarPrefix = "var",
}: VarListWithRefProps) {
  const handleAdd = () => {
    if (variables.length >= maxCount) return;
    const newVar: InputVariable = {
      name: `${newVarPrefix}${variables.length + 1}`,
      label: `变量 ${variables.length + 1}`,
      type: "string",
    };
    onChange([...variables, newVar]);
  };

  const handleRemove = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updates: Partial<InputVariable>) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], ...updates };
    onChange(newVars);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleAdd}
          disabled={variables.length >= maxCount}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {variables.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
          <span>暂无变量，</span>
          <button type="button" onClick={handleAdd} className="text-primary hover:underline">
            点击添加
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {variables.map((variable, index) => (
            <div key={index} className="group bg-card space-y-2 rounded-lg border p-2">
              <div className="flex items-center gap-2">
                <Input
                  value={variable.name}
                  onChange={(e) => handleUpdate(index, { name: e.target.value })}
                  className="h-8 w-28 font-mono text-sm"
                  placeholder="变量名"
                />
                <div className="flex-1">
                  <VariablePicker
                    value={variable.ref || null}
                    onChange={(ref) => handleUpdate(index, { ref: ref || undefined })}
                    placeholder="选择引用变量"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={variable.type}
                  onValueChange={(type) => handleUpdate(index, { type: type as VariableType })}
                >
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive size-8"
                  onClick={() => handleRemove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {variables.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {variables.length} / {maxCount} 个变量
        </p>
      )}
    </div>
  );
}
