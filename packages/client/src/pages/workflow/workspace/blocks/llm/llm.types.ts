import type { BasicNodeData } from "../../types.ts";

export interface LlmNodeData extends BasicNodeData {
  model: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}
