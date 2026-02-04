import { Button } from "@buildingai/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@buildingai/ui/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { cn } from "@buildingai/ui/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useWorkflowStore } from "@/pages/workflow/workspace/store";
import { VariableUtils } from "@/pages/workflow/workspace/utils";

import type { VariableReference, VariableType } from "../types/variable.types";
import { groupVariables, VARIABLE_TYPE_COLORS } from "../types/variable.types";

interface VariablePickerProps {
  value: VariableReference | null;
  onChange: (value: VariableReference | null) => void;
  placeholder?: string;
  typeFilter?: VariableType[];
}

export function VariablePicker({
  value,
  onChange,
  placeholder = "选择变量",
  typeFilter,
}: VariablePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);

  const availableVars = useMemo(
    () => (selectedNodeId ? VariableUtils.getAvailableVariables(selectedNodeId, nodes, edges) : []),
    [selectedNodeId, nodes, edges],
  );

  // 过滤变量
  const filteredVars = typeFilter
    ? availableVars.filter((v) => typeFilter.includes(v.variable.type) || v.variable.type === "any")
    : availableVars;

  // 按节点分组
  const grouped = groupVariables(filteredVars);

  // 查找当前选中的变量
  const selectedVar = value
    ? availableVars.find((v) => v.nodeId === value.nodeId && v.variable.name === value.varName)
    : null;

  const displayText = selectedVar
    ? `${selectedVar.nodeName} / ${selectedVar.variable.label || selectedVar.variable.name}`
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between font-normal"
        >
          {displayText ? (
            <span className="truncate">{displayText}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {value && (
              <X
                className="text-muted-foreground hover:text-foreground size-3.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索变量..." />
          <CommandList>
            <CommandEmpty>没有找到变量</CommandEmpty>

            {grouped.map((group) => (
              <CommandGroup key={group.nodeId} heading={group.nodeName}>
                {group.variables.map((variable) => {
                  const isSelected =
                    value?.nodeId === group.nodeId && value?.varName === variable.name;

                  return (
                    <CommandItem
                      key={`${group.nodeId}-${variable.name}`}
                      value={`${group.nodeName}-${variable.name}-${variable.label}`}
                      onSelect={() => {
                        onChange({ nodeId: group.nodeId, varName: variable.name });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn("mr-2 size-4", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      <div className="flex flex-1 items-center justify-between">
                        <span>{variable.label || variable.name}</span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px]",
                            VARIABLE_TYPE_COLORS[variable.type],
                          )}
                        >
                          {variable.type}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
