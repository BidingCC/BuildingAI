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
import { Slider } from "@buildingai/ui/components/ui/slider";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useCallback, useEffect, useState } from "react";

import { useWorkflowStore } from "../../store/store";
import type { PanelProps } from "../types.ts";
import type { LlmNodeData } from "./llm.types.ts";

export function LlmPanel(props: PanelProps<LlmNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  // 本地表单状态
  const [formData, setFormData] = useState({
    model: props.data.model,
    systemPrompt: props.data.systemPrompt,
    prompt: props.data.prompt,
    temperature: props.data.temperature,
    maxTokens: props.data.maxTokens,
  });
  const [isDirty, setIsDirty] = useState(false);

  // 当选中的节点变化时，重置表单数据
  useEffect(() => {
    setFormData({
      model: props.data.model,
      systemPrompt: props.data.systemPrompt,
      prompt: props.data.prompt,
      temperature: props.data.temperature,
      maxTokens: props.data.maxTokens,
    });
    setIsDirty(false);
  }, [props.id]);

  const handleModelChange = useCallback((model: string) => {
    setFormData((prev) => ({ ...prev, model }));
    setIsDirty(true);
  }, []);

  const handleSystemPromptChange = useCallback((systemPrompt: string) => {
    setFormData((prev) => ({ ...prev, systemPrompt }));
    setIsDirty(true);
  }, []);

  const handlePromptChange = useCallback((prompt: string) => {
    setFormData((prev) => ({ ...prev, prompt }));
    setIsDirty(true);
  }, []);

  const handleTemperatureChange = useCallback((temperature: number[]) => {
    setFormData((prev) => ({ ...prev, temperature: temperature[0] }));
    setIsDirty(true);
  }, []);

  const handleMaxTokensChange = useCallback((maxTokens: number) => {
    setFormData((prev) => ({ ...prev, maxTokens }));
    setIsDirty(true);
  }, []);

  // 保存到节点数据
  const handleSave = useCallback(() => {
    updateNodeData(props.id, formData);
    setIsDirty(false);
  }, [formData, props.id, updateNodeData]);

  // 取消编辑
  const handleCancel = useCallback(() => {
    setFormData({
      model: props.data.model,
      systemPrompt: props.data.systemPrompt,
      prompt: props.data.prompt,
      temperature: props.data.temperature,
      maxTokens: props.data.maxTokens,
    });
    setIsDirty(false);
  }, [props.data]);

  return (
    <div className="space-y-4">
      <div>
        <Label>模型</Label>
        <Select value={formData.model} onValueChange={handleModelChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
            <SelectItem value="claude-3">Claude 3</SelectItem>
            <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>系统提示词 (可选)</Label>
        <Textarea
          placeholder="你是一个有帮助的助手..."
          value={formData.systemPrompt}
          onChange={(e) => handleSystemPromptChange(e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label>用户提示词</Label>
        <Textarea
          placeholder="输入你的提示词..."
          value={formData.prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          rows={5}
        />
      </div>

      <div>
        <Label>温度 (Temperature)</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[formData.temperature]}
            onValueChange={handleTemperatureChange}
            max={2}
            step={0.1}
            className="flex-1"
          />
          <span className="w-12 text-right font-mono text-sm">
            {formData.temperature.toFixed(1)}
          </span>
        </div>
      </div>

      <div>
        <Label>最大 Token 数</Label>
        <Input
          type="number"
          placeholder="2000"
          value={formData.maxTokens}
          onChange={(e) => handleMaxTokensChange(Number(e.target.value))}
        />
      </div>

      {/* 保存/取消按钮 */}
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
