/**
 * InputVarEditor - 输入变量编辑器
 * @description 单个输入变量的配置组件，支持固定值/引用变量模式切换
 *
 * 特点：
 * 1. 左侧显示变量名，右侧显示值/引用
 * 2. 点击右侧区域弹出选择器
 * 3. 支持固定值输入和变量引用
 * 4. 根据变量类型显示不同的输入控件
 */

import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@buildingai/ui/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { cn } from "@buildingai/ui/lib/utils";
import { Braces, Link2, Trash2, Type } from "lucide-react";
import { useState, useMemo } from "react";

import type {
  AvailableVariable,
  InputVarConfig,
  InputVarValue,
  VariableDefinition,
  VariableType,
} from "../types/variable.types";
import {
  VARIABLE_TYPE_COLORS,
  getTypeDefaultValue,
} from "../types/variable.types";
import { VariablePicker, VariableTag } from "./VariablePicker";

// ==================== 值输入组件 ====================

interface ValueInputProps {
  type: VariableType;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
}

/**
 * 根据变量类型渲染不同的输入控件
 */
function ValueInput({ type, value, onChange, placeholder }: ValueInputProps) {
  switch (type) {
    case "number":
      return (
        <Input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder || "输入数字"}
          className="h-8"
        />
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <span className="text-sm text-muted-foreground">
            {value === true ? "True" : "False"}
          </span>
        </div>
      );

    case "array":
    case "object":
      return (
        <div className="space-y-1">
          <textarea
            value={typeof value === "string" ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                // 保持原始文本，让用户继续编辑
                onChange(e.target.value);
              }
            }}
            placeholder={type === "array" ? "[]" : "{}"}
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">输入有效的 JSON</p>
        </div>
      );

    default:
      return (
        <Input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "输入值"}
          className="h-8"
        />
      );
  }
}

// ==================== 主组件 ====================

interface InputVarEditorProps {
  /** 变量定义 */
  definition: VariableDefinition;
  /** 当前值配置 */
  value: InputVarValue;
  /** 值变化回调 */
  onChange: (value: InputVarValue) => void;
  /** 可用变量列表 */
  availableVars: AvailableVariable[];
  /** 是否允许删除 */
  onRemove?: () => void;
  /** 是否显示完整的配置（包含模式切换） */
  showModeSwitch?: boolean;
  /** 是否只读 */
  readonly?: boolean;
}

export function InputVarEditor({
  definition,
  value,
  onChange,
  availableVars,
  onRemove,
  showModeSwitch = true,
  readonly = false,
}: InputVarEditorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  // 查找引用的变量信息
  const referencedVar = useMemo(() => {
    if (value.mode !== "reference") return null;
    return availableVars.find(
      (v) => v.nodeId === value.ref.nodeId && v.variable.name === value.ref.varName,
    );
  }, [value, availableVars]);

  const handleModeChange = (newMode: "value" | "reference") => {
    if (newMode === "value") {
      onChange({
        mode: "value",
        value: getTypeDefaultValue(definition.type),
      });
    } else {
      onChange({
        mode: "reference",
        ref: { nodeId: "", varName: "" },
      });
    }
  };

  const handleValueChange = (newValue: any) => {
    onChange({ mode: "value", value: newValue });
  };

  const handleRefChange = (ref: { nodeId: string; varName: string } | null) => {
    if (ref) {
      onChange({ mode: "reference", ref });
    } else {
      onChange({ mode: "value", value: getTypeDefaultValue(definition.type) });
    }
  };

  return (
    <div className="group flex items-start gap-2 rounded-lg border bg-card p-3">
      {/* 左侧：变量名和类型 */}
      <div className="flex min-w-[120px] flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Braces className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{definition.name}</span>
          {definition.required && (
            <span className="text-xs text-destructive">*</span>
          )}
        </div>
        {definition.label && definition.label !== definition.name && (
          <span className="text-xs text-muted-foreground">{definition.label}</span>
        )}
        <span
          className={cn(
            "inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
            VARIABLE_TYPE_COLORS[definition.type],
          )}
        >
          {definition.type}
        </span>
      </div>

      {/* 右侧：值编辑区 */}
      <div className="flex-1">
        {showModeSwitch && !readonly && (
          <div className="mb-2 flex items-center gap-2">
            <Button
              type="button"
              variant={value.mode === "value" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => handleModeChange("value")}
            >
              <Type className="size-3" />
              固定值
            </Button>
            <Button
              type="button"
              variant={value.mode === "reference" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => handleModeChange("reference")}
            >
              <Link2 className="size-3" />
              引用变量
            </Button>
          </div>
        )}

        {value.mode === "value" ? (
          <ValueInput
            type={definition.type}
            value={value.value}
            onChange={handleValueChange}
            placeholder={definition.description}
          />
        ) : (
          <VariablePicker
            availableVars={availableVars}
            value={value.ref.nodeId ? value.ref : null}
            onChange={handleRefChange}
            typeFilter={definition.type !== "any" ? [definition.type, "any"] : undefined}
            placeholder="选择引用变量"
          />
        )}
      </div>

      {/* 删除按钮 */}
      {onRemove && !readonly && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={onRemove}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}

// ==================== 简化版（只显示变量引用选择） ====================

interface SimpleVarRefInputProps {
  /** 变量名标签 */
  label: string;
  /** 当前引用 */
  value: { nodeId: string; varName: string } | null;
  /** 引用变化回调 */
  onChange: (ref: { nodeId: string; varName: string } | null) => void;
  /** 可用变量列表 */
  availableVars: AvailableVariable[];
  /** 类型过滤 */
  typeFilter?: VariableType[];
  /** 是否必填 */
  required?: boolean;
  /** 是否可删除 */
  onRemove?: () => void;
}

export function SimpleVarRefInput({
  label,
  value,
  onChange,
  availableVars,
  typeFilter,
  required,
  onRemove,
}: SimpleVarRefInputProps) {
  return (
    <div className="group flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <div className="flex min-w-[80px] items-center gap-1.5">
        <Braces className="size-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
        {required && <span className="text-xs text-destructive">*</span>}
      </div>

      <div className="flex-1">
        <VariablePicker
          availableVars={availableVars}
          value={value}
          onChange={onChange}
          typeFilter={typeFilter}
          placeholder="选择引用变量"
        />
      </div>

      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={onRemove}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}

export default InputVarEditor;
