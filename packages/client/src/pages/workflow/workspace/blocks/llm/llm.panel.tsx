import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
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
import { Textarea } from "@buildingai/ui/components/ui/textarea";

import { VarListReadonly } from "../../components/VarList";
import type { BlockPanelProps } from "../base/block.base";
import type { LlmBlockData } from "./llm.types";

export function LlmPanelComponent({ data, onChange }: BlockPanelProps<LlmBlockData>) {
  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>模型提供商</Label>
          <Select
            value={data.modelConfig.provider}
            onValueChange={(provider) =>
              onChange({ modelConfig: { ...data.modelConfig, provider } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="deepseek">DeepSeek</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>模型</Label>
          <Select
            value={data.modelConfig.model}
            onValueChange={(model) => onChange({ modelConfig: { ...data.modelConfig, model } })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
              <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>系统提示词</Label>
          <Textarea
            value={data.systemPrompt}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
            placeholder="定义 AI 的角色和行为..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>用户提示词</Label>
          <Textarea
            value={data.userPrompt}
            onChange={(e) => onChange({ userPrompt: e.target.value })}
            placeholder="输入提示词，可使用 {{变量名}} 引用变量..."
            rows={5}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>温度</Label>
            <span className="text-muted-foreground text-sm">{data.temperature}</span>
          </div>
          <Slider
            value={[data.temperature]}
            onValueChange={([temperature]) => onChange({ temperature })}
            min={0}
            max={2}
            step={0.1}
          />
        </div>

        <div className="space-y-2">
          <Label>最大 Token 数</Label>
          <Input
            type="number"
            value={data.maxTokens}
            onChange={(e) => onChange({ maxTokens: Number(e.target.value) })}
            min={1}
            max={100000}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>流式输出</Label>
          <Switch
            checked={data.streaming}
            onCheckedChange={(streaming) => onChange({ streaming })}
          />
        </div>
      </div>

      <Separator />

      <VarListReadonly title="输出变量" variables={data.outputs} />
    </div>
  );
}
