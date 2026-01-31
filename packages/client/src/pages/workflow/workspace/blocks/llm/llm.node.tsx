import type { FunctionComponent } from "react";

import type { BlockNodeProps } from "../base/block.base";
import type { LlmBlockData } from "./llm.types";

/**
 * LLM Node 组件
 */
export const LlmNodeComponent: FunctionComponent<BlockNodeProps<LlmBlockData>> = ({ data }) => {
  const { modelConfig, temperature, maxTokens, streaming, outputFormat } = data;

  return (
    <div className="space-y-2 text-xs">
      {/* 模型信息 */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-700">模型:</span>
        <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">{modelConfig.model}</span>
      </div>

      {/* 参数配置 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1">
          <span className="text-gray-600">温度:</span>
          <span className="font-medium">{temperature}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-600">Token:</span>
          <span className="font-medium">{maxTokens}</span>
        </div>
      </div>

      {/* 输出配置 */}
      <div className="flex items-center gap-2">
        <span className="text-gray-600">格式:</span>
        <span className="rounded bg-gray-100 px-2 py-1">{outputFormat}</span>
        {streaming && <span className="rounded bg-green-100 px-2 py-1 text-green-700">流式</span>}
      </div>

      {/* 提示词预览 */}
      {data.userPrompt && (
        <div className="rounded border border-gray-200 bg-gray-50 p-2">
          <div className="text-gray-500">提示词:</div>
          <div className="line-clamp-2 text-gray-700">
            {data.userPrompt.substring(0, 60)}
            {data.userPrompt.length > 60 ? "..." : ""}
          </div>
        </div>
      )}
    </div>
  );
};
