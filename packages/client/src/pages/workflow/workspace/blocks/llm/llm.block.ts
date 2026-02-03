import { Ghost } from "lucide-react";
import { createElement } from "react";

import {
  BlockBase,
  type InputVariablesConfig,
  type OutputVariablesConfig,
} from "../base/block.base";
import { LlmNodeComponent } from "./llm.node";
import { LlmPanelComponent } from "./llm.panel";
import type { LlmBlockData } from "./llm.types";

const LLM_OUTPUT_VARIABLES = [
  { name: "text", label: "生成内容", type: "string" as const },
  { name: "reasoning_content", label: "推理内容", type: "string" as const },
  { name: "usage", label: "模型用量信息", type: "object" as const },
];

export class LlmBlock extends BlockBase<LlmBlockData> {
  constructor() {
    super({
      type: "llm",
      name: "大语言模型",
      description: "调用 LLM 进行文本生成、对话、推理等任务",
      category: "ai",
      icon: createElement(Ghost),
      defaultData: () => ({
        modelConfig: {
          provider: "openai",
          model: "gpt-4-turbo-preview",
        },
        systemPrompt: "",
        userPrompt: "",
        context: null,
        messages: [],
        temperature: 0.7,
        maxTokens: 4096,
        outputFormat: "text",
        streaming: false,
        enableVision: false,
        enableReasoningSplit: false,
      }),
      handles: {
        target: true,
        source: true,
      },
    });
  }

  getOutputConfig(): OutputVariablesConfig {
    return {
      type: "fixed",
      variables: LLM_OUTPUT_VARIABLES,
    };
  }

  getInputConfig(): InputVariablesConfig {
    return { type: "none" };
  }

  get NodeComponent() {
    return LlmNodeComponent;
  }

  get PanelComponent() {
    return LlmPanelComponent;
  }

  validate(data: LlmBlockData) {
    const errors: string[] = [];

    // 验证模型配置
    if (!data.modelConfig.model) {
      errors.push("必须选择模型");
    }

    if (data.modelConfig.provider === "custom" && !data.modelConfig.apiEndpoint) {
      errors.push("自定义提供商需要指定 API 端点");
    }

    // 验证提示词
    if (!data.userPrompt || data.userPrompt.trim() === "") {
      errors.push("用户提示词不能为空");
    }

    // 验证参数范围
    if (data.temperature < 0 || data.temperature > 2) {
      errors.push("温度必须在 0-2 之间");
    }

    if (data.maxTokens < 1 || data.maxTokens > 100000) {
      errors.push("最大 Token 数必须在 1-100000 之间");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
