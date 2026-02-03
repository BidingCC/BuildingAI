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
import { Slider } from "@buildingai/ui/components/ui/slider";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { cn } from "@buildingai/ui/lib/utils";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Eye,
  HelpCircle,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { FixedOutputVars } from "../../components/DynamicVarLists";
import { VariablePicker } from "../../components/VariablePicker";
import { useWorkflowStore } from "../../store";
import type { VariableReference } from "../../types/variable.types";
import type { BlockPanelComponent } from "../base/block.base";
import type { LlmBlockData, LlmProvider, Message, MessageRole } from "./llm.types";
import { PRESET_MODELS } from "./llm.types";

const LLM_OUTPUTS = [
  { name: "text", label: "生成内容", type: "string" as const },
  { name: "reasoning_content", label: "推理内容", type: "string" as const },
  { name: "usage", label: "模型用量信息", type: "object" as const },
];

export const LlmPanelComponent: BlockPanelComponent<LlmBlockData> = ({ data, onChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const availableVars = useWorkflowStore((state) =>
    state.getAvailableVariablesForNode(selectedNodeId!),
  );

  const handleContextChange = (ref: VariableReference | null) => {
    onChange({ context: ref });
  };

  const handleAddMessage = () => {
    const newMessage: Message = {
      role: "user",
      content: "",
      enableJinja: false,
    };
    onChange({ messages: [...data.messages, newMessage] });
  };

  const handleUpdateMessage = (index: number, updates: Partial<Message>) => {
    const newMessages = [...data.messages];
    newMessages[index] = { ...newMessages[index], ...updates };
    onChange({ messages: newMessages });
  };

  const handleRemoveMessage = (index: number) => {
    onChange({ messages: data.messages.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="text-muted-foreground size-4" />
            <span className="text-sm font-medium">模型</span>
            <span className="text-destructive text-xs">*</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <Sparkles className="size-4" />
            </div>

            <Select
              value={`${data.modelConfig.provider}:${data.modelConfig.model}`}
              onValueChange={(v) => {
                const [provider, model] = v.split(":");
                onChange({
                  modelConfig: {
                    ...data.modelConfig,
                    provider: provider as LlmProvider,
                    model,
                  },
                });
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRESET_MODELS).map(([provider, models]) => (
                  <div key={provider}>
                    <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                      {provider.toUpperCase()}
                    </div>
                    {models.map((model) => (
                      <SelectItem key={model.value} value={`${provider}:${model.value}`}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="shrink-0">
              <Settings2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <div className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">上下文</span>
            <HelpCircle className="text-muted-foreground size-3.5" />
          </div>
          <VariablePicker
            availableVars={availableVars}
            value={data.context}
            onChange={handleContextChange}
            placeholder="设置变量值"
          />
        </div>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {/* System Prompt */}
          <MessageEditor
            role="system"
            content={data.systemPrompt || ""}
            onContentChange={(content) => onChange({ systemPrompt: content })}
            availableVars={availableVars}
            label="SYSTEM"
          />

          {data.messages.map((msg, index) => (
            <MessageEditor
              key={index}
              role={msg.role}
              content={msg.content}
              enableJinja={msg.enableJinja}
              onContentChange={(content) => handleUpdateMessage(index, { content })}
              onRoleChange={(role) => handleUpdateMessage(index, { role })}
              onRemove={() => handleRemoveMessage(index)}
              availableVars={availableVars}
              removable
            />
          ))}

          {/* 添加消息按钮 */}
          <Button type="button" variant="outline" className="w-full" onClick={handleAddMessage}>
            <Plus className="mr-2 size-4" />
            添加消息
          </Button>
        </div>
      </div>

      <Separator />

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Eye className="text-muted-foreground size-4" />
            <span className="text-sm">视觉</span>
            <HelpCircle className="text-muted-foreground size-3.5" />
          </div>
          <Switch
            checked={data.enableVision}
            onCheckedChange={(checked) => onChange({ enableVision: checked })}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Sparkles className="text-muted-foreground size-4" />
            <span className="text-sm">启用推理标签分离</span>
            <HelpCircle className="text-muted-foreground size-3.5" />
          </div>
          <Switch
            checked={data.enableReasoningSplit}
            onCheckedChange={(checked) => onChange({ enableReasoningSplit: checked })}
          />
        </div>
      </div>

      <Separator />

      <div className="p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className="font-medium">高级参数</span>
          {showAdvanced ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4">
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">温度</span>
                <span className="text-sm">{data.temperature}</span>
              </div>
              <Slider
                value={[data.temperature]}
                onValueChange={([v]) => onChange({ temperature: v })}
                min={0}
                max={2}
                step={0.1}
              />
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <span className="text-muted-foreground text-sm">最大 Token</span>
              <Input
                type="number"
                value={data.maxTokens}
                onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) || 1000 })}
                min={1}
                max={100000}
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="p-4">
        <FixedOutputVars title="输出变量" outputs={LLM_OUTPUTS} />
      </div>
    </div>
  );
};

interface MessageEditorProps {
  role: MessageRole;
  content: string;
  enableJinja?: boolean;
  onContentChange: (content: string) => void;
  onRoleChange?: (role: MessageRole) => void;
  onRemove?: () => void;
  availableVars: any[];
  label?: string;
  removable?: boolean;
}

function MessageEditor({
  role,
  content,
  onContentChange,
  onRemove,
  availableVars,
  label,
  removable,
}: MessageEditorProps) {
  const roleColors: Record<MessageRole, string> = {
    system: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    user: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    assistant: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  };

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={cn("rounded px-2 py-0.5 text-xs font-medium", roleColors[role])}>
            {label || role.toUpperCase()}
          </span>
          <HelpCircle className="text-muted-foreground size-3.5" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{content.length}</span>
          {removable && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive size-7"
              onClick={onRemove}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-3">
        <VarPromptInput
          value={content}
          onChange={onContentChange}
          availableVars={availableVars}
          placeholder={role === "system" ? "定义 AI 助手的角色和行为..." : "输入提示词内容..."}
          rows={role === "system" ? 3 : 5}
        />
      </div>
    </div>
  );
}

function VarPromptInput(props: any) {
  return (
    <textarea
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      rows={props.rows || 4}
      className="w-full resize-none rounded border-0 bg-transparent text-sm outline-none"
    />
  );
}
