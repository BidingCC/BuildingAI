/**
 * LLM 提供商类型
 */
export type LlmProvider = "openai" | "anthropic" | "custom";

/**
 * 模型配置
 */
export interface ModelConfig {
  provider: LlmProvider;
  model: string;
  apiKey?: string;
  apiEndpoint?: string;
}

/**
 * 消息角色
 */
export type MessageRole = "system" | "user" | "assistant";

/**
 * 消息内容
 */
export interface Message {
  role: MessageRole;
  content: string;
}

/**
 * LLM 输出格式
 */
export type OutputFormat = "text" | "json" | "structured";

/**
 * LLM Block 数据结构
 */
export interface LlmBlockData {
  // 模型配置
  modelConfig: ModelConfig;
  
  // 提示词配置
  systemPrompt?: string;
  userPrompt: string;
  
  // 参数配置
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  
  // 输出配置
  outputFormat: OutputFormat;
  streaming?: boolean;
  
  // 变量绑定
  inputVariables?: string[];
  outputVariable?: string;
}

/**
 * 预设模型配置
 */
export const PRESET_MODELS: Record<LlmProvider, Array<{ value: string; label: string }>> = {
  openai: [
    { value: "gpt-4-turbo-preview", label: "GPT-4 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
    { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  ],
  custom: [
    { value: "custom-model", label: "自定义模型" },
  ],
};
