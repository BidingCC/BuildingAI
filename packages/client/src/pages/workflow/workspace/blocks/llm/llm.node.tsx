import { Bot } from "lucide-react";

import type { NodeProps } from "../types.ts";
import type { LlmNodeData } from "./llm.types.ts";

export function LlmNode(props: NodeProps<LlmNodeData>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-semibold">{props.data.model}</span>
      </div>

      <div className="line-clamp-2 text-xs text-gray-600">
        {props.data.prompt || "未设置提示词"}
      </div>

      <div className="flex gap-3 text-xs text-gray-500">
        <span>Temperature: {props.data.temperature}</span>
        <span>Token: {props.data.maxTokens}</span>
      </div>
    </div>
  );
}
