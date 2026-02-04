import { Bot } from "lucide-react";
import { createElement } from "react";

import { BlockBase } from "../base/block.base";
import { LlmNodeComponent } from "./llm.node";
import { LlmPanelComponent } from "./llm.panel";
import type { LlmBlockData } from "./llm.types";

export class LlmBlock extends BlockBase<LlmBlockData> {
  constructor() {
    super({
      type: "llm",
      name: "大语言模型",
      description: "调用 LLM 进行文本生成、对话、推理等任务",
      category: "ai",
      icon: createElement(Bot),
      defaultData: () => ({
        inputs: [],
        outputs: [
          { name: "text", type: "string", label: "生成内容" },
          { name: "reasoning_content", type: "string", label: "推理内容" },
          { name: "usage", type: "object", label: "用量信息" },
        ],
        modelConfig: { provider: "openai", model: "gpt-4o" },
        systemPrompt: "",
        userPrompt: "",
        temperature: 0.7,
        maxTokens: 4096,
        outputFormat: "text",
        streaming: false,
        enableVision: false,
        enableReasoningSplit: false,
      }),
      handles: { target: true, source: true },
    });
  }

  get NodeComponent() {
    return LlmNodeComponent;
  }

  get PanelComponent() {
    return LlmPanelComponent;
  }

  validate(data: LlmBlockData) {
    const errors: string[] = [];

    if (!data.modelConfig.model) {
      errors.push("必须选择模型");
    }

    if (data.temperature < 0 || data.temperature > 2) {
      errors.push("温度必须在 0-2 之间");
    }

    if (data.maxTokens < 1 || data.maxTokens > 100000) {
      errors.push("最大 Token 数必须在 1-100000 之间");
    }

    return { valid: !errors.length, errors: errors.length ? errors : undefined };
  }
}
