import type { InputVariable, VariableDefinition } from "@/pages/workflow/workspace/types";

export interface ModelConfig {
  provider: string;
  model: string;
  apiEndpoint?: string;
}

export interface LlmBlockData {
  modelConfig: ModelConfig;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  outputFormat: "text" | "json";
  streaming: boolean;
  enableVision: boolean;
  enableReasoningSplit: boolean;
  inputs: InputVariable[];
  outputs: VariableDefinition[];
}
