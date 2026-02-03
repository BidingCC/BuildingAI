/**
 * VariablePicker - 变量选择器
 * @description 弹出式变量选择器，支持搜索、按节点分组
 *
 * 特点：
 * 1. 使用 Popover + Command 实现搜索功能
 * 2. 按节点分组展示变量
 * 3. 显示变量类型和颜色
 * 4. 支持系统变量展示
 */

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@buildingai/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@buildingai/ui/components/ui/popover";
import { cn } from "@buildingai/ui/lib/utils";
import { ChevronDown, Variable, Workflow } from "lucide-react";
import { useState, useMemo } from "react";

import type {
  AvailableVariable,
  VariableReference,
  VariableType,
} from "../types/variable.types";
import {
  SYSTEM_VARIABLES,
  VARIABLE_TYPE_COLORS,
  groupAvailableVariables,
} from "../types/variable.types";

// ==================== 子组件 ====================

/**
 * 变量类型标签
 */
function TypeBadge({ type }: { type: VariableType }) {
  return (
    <span
      className={cn(
        "ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
        VARIABLE_TYPE_COLORS[type],
      )}
    >
      {type}
    </span>
  );
}

/**
 * 变量标签显示组件
 * @description 显示选中的变量（节点名 / 变量名）
 */
export function VariableTag({
  nodeId,
  nodeName,
  varName,
  varLabel,
  varType,
  onRemove,
  className,
}: {
  nodeId: string;
  nodeName: string;
  varName: string;
  varLabel: string;
  varType: VariableType;
  onRemove?: () => void;
  className?: string;
}) {
  const isSystem = nodeId === "system";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
        VARIABLE_TYPE_COLORS[varType],
        className,
      )}
    >
      {isSystem ? (
        <Workflow className="size-3 shrink-0" />
      ) : (
        <Variable className="size-3 shrink-0" />
      )}
      <span className="font-medium">{nodeName}</span>
      <span className="text-muted-foreground">/</span>
      <span className="flex items-center gap-1">
        <span className="opacity-60">{`{x}`}</span>
        <span>{varLabel}</span>
      </span>
      <TypeBadge type={varType} />
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 rounded-full p-0.5 hover:bg-black/10"
        >
          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

// ==================== 主组件 ====================

interface VariablePickerProps {
  /** 可用变量列表 */
  availableVars: AvailableVariable[];
  /** 当前选中的变量引用 */
  value?: VariableReference | null;
  /** 选择变化回调 */
  onChange: (ref: VariableReference | null) => void;
  /** 占位符 */
  placeholder?: string;
  /** 类型过滤（只显示指定类型的变量） */
  typeFilter?: VariableType[];
  /** 是否显示系统变量 */
  showSystemVars?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义触发器类名 */
  triggerClassName?: string;
}

export function VariablePicker({
  availableVars,
  value,
  onChange,
  placeholder = "选择变量",
  typeFilter,
  showSystemVars = true,
  disabled = false,
  triggerClassName,
}: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // 类型过滤
  const filteredVars = useMemo(() => {
    let vars = availableVars;
    if (typeFilter && typeFilter.length > 0) {
      vars = vars.filter((v) => typeFilter.includes(v.variable.type));
    }
    return vars;
  }, [availableVars, typeFilter]);

  // 按节点分组
  const groupedVars = useMemo(
    () => groupAvailableVariables(filteredVars),
    [filteredVars],
  );

  // 系统变量（过滤后）
  const filteredSystemVars = useMemo(() => {
    if (!showSystemVars) return [];
    let vars = SYSTEM_VARIABLES;
    if (typeFilter && typeFilter.length > 0) {
      vars = vars.filter((v) => typeFilter.includes(v.type));
    }
    return vars;
  }, [showSystemVars, typeFilter]);

  // 查找当前选中的变量信息
  const selectedVar = useMemo(() => {
    if (!value) return null;

    // 检查是否是系统变量
    if (value.nodeId === "system") {
      const sysVar = SYSTEM_VARIABLES.find((v) => v.name === value.varName);
      if (sysVar) {
        return {
          nodeId: "system",
          nodeName: "系统",
          nodeType: "system",
          variable: sysVar,
        };
      }
    }

    // 查找普通变量
    return availableVars.find(
      (v) => v.nodeId === value.nodeId && v.variable.name === value.varName,
    );
  }, [value, availableVars]);

  const handleSelect = (nodeId: string, varName: string) => {
    onChange({ nodeId, varName });
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex min-h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
            "bg-transparent hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName,
          )}
        >
          {selectedVar ? (
            <VariableTag
              nodeId={selectedVar.nodeId}
              nodeName={selectedVar.nodeName}
              varName={selectedVar.variable.name}
              varLabel={selectedVar.variable.label}
              varType={selectedVar.variable.type}
              onRemove={handleClear}
            />
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="搜索变量..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>未找到匹配的变量</CommandEmpty>

            {/* 节点变量 */}
            {groupedVars.map((group) => {
              // 搜索过滤
              const matchedVars = group.variables.filter(
                (v) =>
                  !search ||
                  v.name.toLowerCase().includes(search.toLowerCase()) ||
                  v.label.toLowerCase().includes(search.toLowerCase()) ||
                  group.nodeName.toLowerCase().includes(search.toLowerCase()),
              );

              if (matchedVars.length === 0) return null;

              return (
                <CommandGroup key={group.nodeId} heading={group.nodeName}>
                  {matchedVars.map((variable) => (
                    <CommandItem
                      key={`${group.nodeId}:${variable.name}`}
                      value={`${group.nodeId}:${variable.name}`}
                      onSelect={() => handleSelect(group.nodeId, variable.name)}
                      className="flex items-center gap-2"
                    >
                      <Variable className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1">
                        <span className="opacity-60">{`{x} `}</span>
                        {variable.label}
                      </span>
                      <TypeBadge type={variable.type} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}

            {/* 系统变量 */}
            {filteredSystemVars.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="系统变量">
                  {filteredSystemVars
                    .filter(
                      (v) =>
                        !search ||
                        v.name.toLowerCase().includes(search.toLowerCase()) ||
                        v.label.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((variable) => (
                      <CommandItem
                        key={`system:${variable.name}`}
                        value={`system:${variable.name}`}
                        onSelect={() => handleSelect("system", variable.name)}
                        className="flex items-center gap-2"
                      >
                        <Workflow className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">
                          <span className="opacity-60">{`{x} `}</span>
                          {variable.label}
                        </span>
                        <TypeBadge type={variable.type} />
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default VariablePicker;
