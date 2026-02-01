import { useState } from "react";

import type { BlockPanelComponent } from "../base/block.base";
import type { LlmBlockData, LlmProvider } from "./llm.types";
import { PRESET_MODELS } from "./llm.types";

export const LlmPanelComponent: BlockPanelComponent<LlmBlockData> = ({ data, onChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleProviderChange = (provider: LlmProvider) => {
    const defaultModel = PRESET_MODELS[provider][0].value;
    onChange({
      modelConfig: {
        ...data.modelConfig,
        provider,
        model: defaultModel,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold">模型配置</label>

        <div>
          <label className="text-xs text-gray-600">提供商</label>
          <select
            value={data.modelConfig.provider}
            onChange={(e) => handleProviderChange(e.target.value as LlmProvider)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-600">模型</label>
          <select
            value={data.modelConfig.model}
            onChange={(e) =>
              onChange({
                modelConfig: { ...data.modelConfig, model: e.target.value },
              })
            }
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {PRESET_MODELS[data.modelConfig.provider].map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {data.modelConfig.provider === "custom" && (
          <div>
            <label className="text-xs text-gray-600">API 端点</label>
            <input
              type="text"
              value={data.modelConfig.apiEndpoint || ""}
              onChange={(e) =>
                onChange({
                  modelConfig: {
                    ...data.modelConfig,
                    apiEndpoint: e.target.value,
                  },
                })
              }
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="https://api.example.com/v1"
            />
          </div>
        )}
      </div>

      {/* 提示词配置 */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">提示词</label>

        <div>
          <label className="text-xs text-gray-600">系统提示词（可选）</label>
          <textarea
            value={data.systemPrompt || ""}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
            rows={3}
            placeholder="定义 AI 助手的角色和行为..."
          />
        </div>

        <div>
          <label className="text-xs text-gray-600">用户提示词 *</label>
          <textarea
            value={data.userPrompt}
            onChange={(e) => onChange({ userPrompt: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
            rows={5}
            placeholder="输入你的提示词，使用 {{变量名}} 引用其他节点的输出..."
          />
          <div className="mt-1 text-xs text-gray-500">
            提示：使用 {"{{"} 和 {"}}"} 包裹变量名，如 {"{{input}}"}
          </div>
        </div>
      </div>

      {/* 基础参数 */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">参数配置</label>

        <div>
          <label className="flex items-center justify-between text-xs text-gray-600">
            <span>温度 (Temperature)</span>
            <span className="font-medium">{data.temperature}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={data.temperature}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>精确</span>
            <span>创造</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600">最大 Token 数</label>
          <input
            type="number"
            value={data.maxTokens}
            onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) || 1000 })}
            className="w-full rounded border px-3 py-2 text-sm"
            min={1}
            max={100000}
          />
        </div>
      </div>

      {/* 高级参数（折叠） */}
      <div className="space-y-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between text-sm font-semibold text-gray-700"
        >
          <span>高级参数</span>
          <span>{showAdvanced ? "▼" : "▶"}</span>
        </button>

        {showAdvanced && (
          <div className="space-y-2 border-l-2 border-gray-200 pl-3">
            <div>
              <label className="flex items-center justify-between text-xs text-gray-600">
                <span>Top P</span>
                <span className="font-medium">{data.topP ?? 1}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={data.topP ?? 1}
                onChange={(e) => onChange({ topP: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs text-gray-600">
                <span>频率惩罚</span>
                <span className="font-medium">{data.frequencyPenalty ?? 0}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={data.frequencyPenalty ?? 0}
                onChange={(e) => onChange({ frequencyPenalty: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs text-gray-600">
                <span>存在惩罚</span>
                <span className="font-medium">{data.presencePenalty ?? 0}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={data.presencePenalty ?? 0}
                onChange={(e) => onChange({ presencePenalty: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* 输出配置 */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">输出配置</label>

        <div>
          <label className="text-xs text-gray-600">输出格式</label>
          <select
            value={data.outputFormat}
            onChange={(e) =>
              onChange({
                outputFormat: e.target.value as LlmBlockData["outputFormat"],
              })
            }
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="text">纯文本</option>
            <option value="json">JSON</option>
            <option value="structured">结构化</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="streaming"
            checked={data.streaming ?? false}
            onChange={(e) => onChange({ streaming: e.target.checked })}
            className="h-4 w-4"
          />
          <label htmlFor="streaming" className="text-sm text-gray-700">
            启用流式输出
          </label>
        </div>

        <div>
          <label className="text-xs text-gray-600">输出变量名</label>
          <input
            type="text"
            value={data.outputVariable || ""}
            onChange={(e) => onChange({ outputVariable: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="llm_output"
          />
        </div>
      </div>
    </div>
  );
};
