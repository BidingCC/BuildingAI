import type { VariableReference } from "../../types/variable.types";

export type LlmProvider = "openai" | "anthropic" | "custom";

export interface ModelConfig {
  provider: LlmProvider;
  model: string;
  apiKey?: string;
  apiEndpoint?: string;
}

export type MessageRole = "system" | "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
  enableJinja?: boolean;
}

export type OutputFormat = "text" | "json" | "structured";

export interface LlmBlockData {
  modelConfig: ModelConfig;
  context?: VariableReference | null;
  systemPrompt?: string;
  userPrompt: string;
  messages: Message[];
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  outputFormat: OutputFormat;
  streaming?: boolean;
  enableVision?: boolean;
  enableReasoningSplit?: boolean;
}

export const PRESET_MODELS: Record<LlmProvider, Array<{ value: string; label: string }>> = {
  openai: [
    { value: "gpt-4-turbo-preview", label: "GPT-4 Turbo" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "o1", label: "o1" },
    { value: "o1-mini", label: "o1-mini" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  ],
  custom: [{ value: "custom-model", label: "自定义模型" }],
};
