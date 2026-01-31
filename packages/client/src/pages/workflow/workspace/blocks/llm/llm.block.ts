import { BlockBase } from "../base/block.base";
import { LlmNodeComponent } from "./llm.node";
import { LlmPanelComponent } from "./llm.panel";
import type { LlmBlockData } from "./llm.types";

/**
 * LLM Block 类
 * 用于调用大语言模型进行文本生成
 */
export class LlmBlock extends BlockBase<LlmBlockData> {
  constructor() {
    super({
      type: "llm",
      label: "大语言模型",
      description: "调用 LLM 进行文本生成、对话、推理等任务",
      category: "ai",
      icon: "🤖",
      defaultData: () => ({
        modelConfig: {
          provider: "openai",
          model: "gpt-4-turbo-preview",
        },
        userPrompt: "",
        temperature: 0.7,
        maxTokens: 1000,
        outputFormat: "text",
        streaming: false,
      }),
      handles: {
        target: true,
        source: true,
      },
    });
  }

  get NodeComponent() {
    return LlmNodeComponent;
  }

  get PanelComponent() {
    return LlmPanelComponent;
  }

  /**
   * 验证 LLM 配置
   */
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

    if (data.topP !== undefined && (data.topP < 0 || data.topP > 1)) {
      errors.push("Top P 必须在 0-1 之间");
    }

    if (
      data.frequencyPenalty !== undefined &&
      (data.frequencyPenalty < 0 || data.frequencyPenalty > 2)
    ) {
      errors.push("频率惩罚必须在 0-2 之间");
    }

    if (
      data.presencePenalty !== undefined &&
      (data.presencePenalty < 0 || data.presencePenalty > 2)
    ) {
      errors.push("存在惩罚必须在 0-2 之间");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 数据转换
   * 可用于在保存前清理或转换数据
   */
  transform(data: LlmBlockData): LlmBlockData {
    return {
      ...data,
      // 移除未定义的可选字段
      systemPrompt: data.systemPrompt || undefined,
      topP: data.topP ?? undefined,
      frequencyPenalty: data.frequencyPenalty ?? undefined,
      presencePenalty: data.presencePenalty ?? undefined,
      outputVariable: data.outputVariable || undefined,
    };
  }
}
