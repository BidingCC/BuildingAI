/**
 * DynamicVarLists - 动态输入/输出变量列表
 * @description 可动态添加/删除的变量列表组件
 *
 * 包含：
 * 1. DynamicInputVars - 动态输入变量列表（支持引用其他节点）
 * 2. DynamicOutputVars - 动态输出变量列表（定义节点输出）
 * 3. FixedOutputVars - 固定输出变量展示（只读）
 */

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
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState, useMemo } from "react";

import type {
  AvailableVariable,
  InputVarConfig,
  InputVarValue,
  VariableDefinition,
  VariableReference,
  VariableType,
} from "../types/variable.types";
import {
  VARIABLE_TYPE_COLORS,
  createDefaultInputVarConfig,
  getTypeDefaultValue,
} from "../types/variable.types";
import { InputVarEditor, SimpleVarRefInput } from "./InputVarEditor";
import { VariablePicker } from "./VariablePicker";

// ==================== 常量 ====================

const VARIABLE_TYPES: { value: VariableType; label: string }[] = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "array", label: "Array" },
  { value: "object", label: "Object" },
  { value: "any", label: "Any" },
  { value: "file", label: "File" },
  { value: "array[file]", label: "Array[File]" },
];

// ==================== 动态输入变量列表 ====================

interface DynamicInputVarsProps {
  /** 标题 */
  title?: string;
  /** 输入变量配置列表 */
  inputs: InputVarConfig[];
  /** 配置变化回调 */
  onChange: (inputs: InputVarConfig[]) => void;
  /** 可用变量列表（用于引用选择） */
  availableVars: AvailableVariable[];
  /** 最大数量 */
  maxCount?: number;
  /** 是否显示添加按钮 */
  showAddButton?: boolean;
  /** 是否显示刷新按钮（重新生成变量名） */
  showRefreshButton?: boolean;
}

export function DynamicInputVars({
  title = "输入变量",
  inputs,
  onChange,
  availableVars,
  maxCount = 20,
  showAddButton = true,
  showRefreshButton = true,
}: DynamicInputVarsProps) {
  const handleAdd = () => {
    if (inputs.length >= maxCount) return;

    const newDef: VariableDefinition = {
      name: `arg${inputs.length + 1}`,
      label: `参数 ${inputs.length + 1}`,
      type: "string",
      required: false,
    };

    const newConfig = createDefaultInputVarConfig(newDef);
    onChange([...inputs, newConfig]);
  };

  const handleRemove = (index: number) => {
    onChange(inputs.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updates: Partial<InputVarConfig>) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], ...updates };
    onChange(newInputs);
  };

  const handleDefinitionUpdate = (
    index: number,
    defUpdates: Partial<VariableDefinition>,
  ) => {
    const newInputs = [...inputs];
    newInputs[index] = {
      ...newInputs[index],
      definition: { ...newInputs[index].definition, ...defUpdates },
    };
    onChange(newInputs);
  };

  const handleValueUpdate = (index: number, value: InputVarValue) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], value };
    onChange(newInputs);
  };

  const handleRefresh = () => {
    // 重新生成变量名
    const newInputs = inputs.map((input, index) => ({
      ...input,
      definition: {
        ...input.definition,
        name: `arg${index + 1}`,
      },
    }));
    onChange(newInputs);
  };

  return (
    <div className="space-y-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {inputs.some((i) => i.definition.required) && (
            <span className="text-xs text-destructive">*</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showRefreshButton && inputs.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleRefresh}
              title="重新生成变量名"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          )}
          {showAddButton && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleAdd}
              disabled={inputs.length >= maxCount}
            >
              <Plus className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 变量列表 */}
      {inputs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          暂无输入变量
          {showAddButton && (
            <button
              type="button"
              onClick={handleAdd}
              className="ml-1 text-primary hover:underline"
            >
              点击添加
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {inputs.map((input, index) => (
            <DynamicInputVarItem
              key={index}
              config={input}
              availableVars={availableVars}
              onDefinitionChange={(def) => handleDefinitionUpdate(index, def)}
              onValueChange={(value) => handleValueUpdate(index, value)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </div>
      )}

      {inputs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {inputs.length} / {maxCount} 个变量
        </p>
      )}
    </div>
  );
}

// ==================== 单个动态输入变量项 ====================

interface DynamicInputVarItemProps {
  config: InputVarConfig;
  availableVars: AvailableVariable[];
  onDefinitionChange: (def: Partial<VariableDefinition>) => void;
  onValueChange: (value: InputVarValue) => void;
  onRemove: () => void;
}

function DynamicInputVarItem({
  config,
  availableVars,
  onDefinitionChange,
  onValueChange,
  onRemove,
}: DynamicInputVarItemProps) {
  const [expanded, setExpanded] = useState(false);
  const { definition, value } = config;

  return (
    <div className="group rounded-lg border bg-card">
      {/* 头部：变量名 + 引用选择器 */}
      <div className="flex items-center gap-2 p-2">
        {/* 拖拽手柄 */}
        <GripVertical className="size-4 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />

        {/* 变量名输入 */}
        <Input
          value={definition.name}
          onChange={(e) => onDefinitionChange({ name: e.target.value })}
          className="h-8 w-28 font-mono text-sm"
          placeholder="变量名"
        />

        {/* 引用选择器 */}
        <div className="flex-1">
          <VariablePicker
            availableVars={availableVars}
            value={value.mode === "reference" ? value.ref : null}
            onChange={(ref) => {
              if (ref) {
                onValueChange({ mode: "reference", ref });
              } else {
                onValueChange({
                  mode: "value",
                  value: getTypeDefaultValue(definition.type),
                });
              }
            }}
            typeFilter={definition.type !== "any" ? [definition.type, "any"] : undefined}
            placeholder="选择引用变量"
          />
        </div>

        {/* 类型选择 */}
        <Select
          value={definition.type}
          onValueChange={(type) => onDefinitionChange({ type: type as VariableType })}
        >
          <SelectTrigger className="h-8 w-24">
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

        {/* 展开/收起 */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Button>

        {/* 删除 */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-destructive opacity-0 group-hover:opacity-100"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="space-y-3 border-t p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                显示标签
              </label>
              <Input
                value={definition.label}
                onChange={(e) => onDefinitionChange({ label: e.target.value })}
                className="h-8"
                placeholder="参数名称"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <Switch
                  checked={definition.required ?? false}
                  onCheckedChange={(checked) =>
                    onDefinitionChange({ required: checked })
                  }
                />
                <span className="text-sm">必填</span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              描述说明
            </label>
            <Input
              value={definition.description ?? ""}
              onChange={(e) => onDefinitionChange({ description: e.target.value })}
              className="h-8"
              placeholder="参数说明..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 动态输出变量列表 ====================

interface DynamicOutputVarsProps {
  /** 标题 */
  title?: string;
  /** 输出变量定义列表 */
  outputs: VariableDefinition[];
  /** 定义变化回调 */
  onChange: (outputs: VariableDefinition[]) => void;
  /** 最大数量 */
  maxCount?: number;
  /** 是否显示添加按钮 */
  showAddButton?: boolean;
}

export function DynamicOutputVars({
  title = "输出变量",
  outputs,
  onChange,
  maxCount = 20,
  showAddButton = true,
}: DynamicOutputVarsProps) {
  const handleAdd = () => {
    if (outputs.length >= maxCount) return;

    const newDef: VariableDefinition = {
      name: `result${outputs.length + 1}`,
      label: `结果 ${outputs.length + 1}`,
      type: "string",
      required: false,
    };

    onChange([...outputs, newDef]);
  };

  const handleRemove = (index: number) => {
    onChange(outputs.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updates: Partial<VariableDefinition>) => {
    const newOutputs = [...outputs];
    newOutputs[index] = { ...newOutputs[index], ...updates };
    onChange(newOutputs);
  };

  return (
    <div className="space-y-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {outputs.some((o) => o.required) && (
            <span className="text-xs text-destructive">*</span>
          )}
        </div>
        {showAddButton && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleAdd}
            disabled={outputs.length >= maxCount}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {/* 变量列表 */}
      {outputs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          暂无输出变量
          {showAddButton && (
            <button
              type="button"
              onClick={handleAdd}
              className="ml-1 text-primary hover:underline"
            >
              点击添加
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {outputs.map((output, index) => (
            <OutputVarItem
              key={index}
              definition={output}
              onChange={(updates) => handleUpdate(index, updates)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </div>
      )}

      {outputs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {outputs.length} / {maxCount} 个变量
        </p>
      )}
    </div>
  );
}

// ==================== 单个输出变量项 ====================

interface OutputVarItemProps {
  definition: VariableDefinition;
  onChange: (updates: Partial<VariableDefinition>) => void;
  onRemove: () => void;
  readonly?: boolean;
}

function OutputVarItem({
  definition,
  onChange,
  onRemove,
  readonly = false,
}: OutputVarItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group rounded-lg border bg-card">
      {/* 头部 */}
      <div className="flex items-center gap-2 p-2">
        {!readonly && (
          <GripVertical className="size-4 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />
        )}

        {/* 变量名 */}
        <Input
          value={definition.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-8 w-32 font-mono text-sm"
          placeholder="变量名"
          disabled={readonly}
        />

        {/* 标签 */}
        <Input
          value={definition.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="h-8 flex-1"
          placeholder="显示标签"
          disabled={readonly}
        />

        {/* 类型 */}
        <Select
          value={definition.type}
          onValueChange={(type) => onChange({ type: type as VariableType })}
          disabled={readonly}
        >
          <SelectTrigger className="h-8 w-24">
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

        {/* 删除 */}
        {!readonly && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive opacity-0 group-hover:opacity-100"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================== 固定输出变量展示 ====================

interface FixedOutputVarsProps {
  /** 标题 */
  title?: string;
  /** 输出变量定义列表 */
  outputs: VariableDefinition[];
  /** 节点 ID（用于显示完整引用路径） */
  nodeId?: string;
}

export function FixedOutputVars({
  title = "输出变量",
  outputs,
  nodeId,
}: FixedOutputVarsProps) {
  if (outputs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          只读
        </span>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="space-y-2">
          {outputs.map((output) => (
            <div
              key={output.name}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">{`{x}`}</span>
                <span className="font-medium">{output.name}</span>
                {output.label && output.label !== output.name && (
                  <span className="text-muted-foreground">· {output.label}</span>
                )}
              </div>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  VARIABLE_TYPE_COLORS[output.type],
                )}
              >
                {output.type}
              </span>
            </div>
          ))}
        </div>
        {outputs.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            这些变量可被下游节点引用
          </p>
        )}
      </div>
    </div>
  );
}

export default DynamicInputVars;
