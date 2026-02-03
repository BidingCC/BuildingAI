import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { cn } from "@buildingai/ui/lib/utils";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { VariablePicker } from "../../components/VariablePicker";
import { useWorkflowStore } from "../../store";
import type { VariableReference, VariableType } from "../../types/variable.types";
import { VARIABLE_TYPE_COLORS } from "../../types/variable.types";
import type { BlockPanelComponent } from "../base/block.base";
import type { OutputBlockData, OutputVarConfig } from "./output.types";

export const OutputPanelComponent: BlockPanelComponent<OutputBlockData> = ({ data, onChange }) => {
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const availableVars = useWorkflowStore((state) =>
    state.getAvailableVariablesForNode(selectedNodeId!),
  );

  const handleAdd = () => {
    const newOutput: OutputVarConfig = {
      name: `output_${data.outputs.length + 1}`,
      label: `输出 ${data.outputs.length + 1}`,
      type: "string",
      ref: { nodeId: "", varName: "" },
    };
    onChange({ outputs: [...data.outputs, newOutput] });
  };

  const handleRemove = (index: number) => {
    onChange({ outputs: data.outputs.filter((_, i) => i !== index) });
  };

  const handleUpdate = (index: number, updates: Partial<OutputVarConfig>) => {
    const newOutputs = [...data.outputs];
    newOutputs[index] = { ...newOutputs[index], ...updates };
    onChange({ outputs: newOutputs });
  };

  const handleRefChange = (index: number, ref: VariableReference | null) => {
    if (ref) {
      // 自动从引用的变量获取类型
      const referencedVar = availableVars.find(
        (v) => v.nodeId === ref.nodeId && v.variable.name === ref.varName,
      );
      handleUpdate(index, {
        ref,
        type: referencedVar?.variable.type || "any",
      });
    } else {
      handleUpdate(index, {
        ref: { nodeId: "", varName: "" },
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <div className="space-y-2">
          <span className="text-sm font-medium">输出格式</span>
          <Select
            value={data.format || "json"}
            onValueChange={(format) => onChange({ format: format as OutputBlockData["format"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="text">纯文本</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">输出变量</span>
              <span className="text-destructive ml-1 text-xs">*</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="h-8 gap-1"
            >
              <Plus className="size-4" />
              添加
            </Button>
          </div>

          {data.outputs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-muted-foreground text-sm">
                暂无输出变量，
                <button type="button" onClick={handleAdd} className="text-primary hover:underline">
                  点击添加
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.outputs.map((output, index) => (
                <OutputVarItem
                  key={index}
                  config={output}
                  availableVars={availableVars}
                  onNameChange={(name) => handleUpdate(index, { name })}
                  onRefChange={(ref) => handleRefChange(index, ref)}
                  onTypeChange={(type) => handleUpdate(index, { type })}
                  onRemove={() => handleRemove(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-xs">
          <p>选择要输出的变量，这些变量将作为工作流的最终输出结果。</p>
        </div>
      </div>
    </div>
  );
};

interface OutputVarItemProps {
  config: OutputVarConfig;
  availableVars: any[];
  onNameChange: (name: string) => void;
  onRefChange: (ref: VariableReference | null) => void;
  onTypeChange: (type: VariableType) => void;
  onRemove: () => void;
}

function OutputVarItem({
  config,
  availableVars,
  onNameChange,
  onRefChange,
  onRemove,
}: OutputVarItemProps) {
  const hasValidRef = config.ref?.nodeId && config.ref?.varName;

  return (
    <div className="group bg-card rounded-lg border">
      <div className="flex items-center gap-2 p-2">
        <GripVertical className="text-muted-foreground size-4 cursor-grab opacity-0 group-hover:opacity-100" />

        <Input
          value={config.name}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-8 w-28 font-mono text-sm"
          placeholder="输出名"
        />

        <div className="flex-1">
          <VariablePicker
            availableVars={availableVars}
            value={hasValidRef ? config.ref : null}
            onChange={onRefChange}
            placeholder="选择引用变量"
          />
        </div>

        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
            VARIABLE_TYPE_COLORS[config.type],
          )}
        >
          {config.type}
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
    </div>
  );
}
