import { RETRIEVAL_MODE } from "@buildingai/constants/shared/datasets.constants";
import { CardContent } from "@buildingai/ui/components/ui/card";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Slider } from "@buildingai/ui/components/ui/slider";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import { HelpCircle, Layers, Scale } from "lucide-react";

import { RerankModelSelector } from "@/components/model-selectors";

import type { RetrievalConfig } from "./types";

type Props = {
  value: RetrievalConfig;
  onChange: (v: RetrievalConfig | ((prev: RetrievalConfig) => RetrievalConfig)) => void;
};

const TopKField = ({ value, onChange }: Props) => (
  <div className="space-y-2">
    <Label>Top K</Label>
    <div className="flex items-center gap-3">
      <Slider
        min={1}
        max={20}
        step={1}
        value={[value.topK ?? 3]}
        onValueChange={([v]) => onChange((r) => ({ ...r, topK: v }))}
      />
      <Input
        type="number"
        min={1}
        max={20}
        className="w-16"
        value={value.topK ?? 3}
        onChange={(e) =>
          onChange((r) => ({
            ...r,
            topK: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
          }))
        }
      />
    </div>
  </div>
);

const ScoreThresholdField = ({ value, onChange }: Props) => {
  const enabled = value.scoreThresholdEnabled ?? false;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Label>Score 阈值</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground">
                <HelpCircle className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>用于设置文本片段筛选的相似度阈值。</TooltipContent>
          </Tooltip>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onChange((r) => ({ ...r, scoreThresholdEnabled: v }))}
        />
      </div>
      <div className={cn("flex items-center gap-3", !enabled && "opacity-50")}>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[value.scoreThreshold ?? 0.5]}
          onValueChange={([v]) => onChange((r) => ({ ...r, scoreThreshold: v }))}
          disabled={!enabled}
        />
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          className="w-16"
          value={value.scoreThreshold ?? 0.5}
          onChange={(e) =>
            onChange((r) => ({
              ...r,
              scoreThreshold: Math.min(1, Math.max(0, Number(e.target.value) || 0)),
            }))
          }
          disabled={!enabled}
        />
      </div>
    </div>
  );
};

export function RetrievalParams({ value, onChange }: Props) {
  const isVector = value.retrievalMode === RETRIEVAL_MODE.VECTOR;
  const isFullText = value.retrievalMode === RETRIEVAL_MODE.FULL_TEXT;
  const isHybrid = value.retrievalMode === RETRIEVAL_MODE.HYBRID;
  const hybridWeight = value.strategy === "weighted_score";

  return (
    <CardContent className="space-y-3 pt-0 text-sm">
      {isVector && (
        <>
          <div className="flex items-center justify-between">
            <Label>Rerank 模型</Label>
            <Switch
              checked={value.rerankConfig?.enabled ?? false}
              onCheckedChange={(v) =>
                onChange((r) => ({
                  ...r,
                  rerankConfig: {
                    ...r.rerankConfig,
                    enabled: v,
                    modelId: r.rerankConfig?.modelId ?? "",
                  },
                }))
              }
            />
          </div>
          {value.rerankConfig?.enabled && (
            <RerankModelSelector
              value={value.rerankConfig?.modelId || undefined}
              onSelect={(v) =>
                onChange((r) => ({
                  ...r,
                  rerankConfig: { ...r.rerankConfig, enabled: true, modelId: v },
                }))
              }
              placeholder="请选择模型"
              className="w-full"
            />
          )}
          <TopKField value={value} onChange={onChange} />
          <ScoreThresholdField value={value} onChange={onChange} />
        </>
      )}

      {isFullText && (
        <>
          <div className="flex items-center justify-between">
            <Label>Rerank 模型</Label>
            <Switch
              checked={value.rerankConfig?.enabled ?? false}
              onCheckedChange={(v) =>
                onChange((r) => ({
                  ...r,
                  rerankConfig: {
                    ...r.rerankConfig,
                    enabled: v,
                    modelId: r.rerankConfig?.modelId ?? "",
                  },
                }))
              }
            />
          </div>
          {value.rerankConfig?.enabled && (
            <RerankModelSelector
              value={value.rerankConfig?.modelId || undefined}
              onSelect={(v) =>
                onChange((r) => ({
                  ...r,
                  rerankConfig: { ...r.rerankConfig, enabled: true, modelId: v },
                }))
              }
              placeholder="请选择模型"
              className="w-full"
            />
          )}
          <TopKField value={value} onChange={onChange} />
        </>
      )}

      {isHybrid && (
        <>
          <div className="flex gap-4">
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                hybridWeight ? "border-primary bg-primary/10" : "border-border",
              )}
              onClick={() =>
                onChange((r) => ({
                  ...r,
                  strategy: "weighted_score" as const,
                }))
              }
            >
              <Scale className="size-4" />
              权重设置
            </button>
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                !hybridWeight ? "border-primary bg-primary/10" : "border-border",
              )}
              onClick={() =>
                onChange((r) => ({
                  ...r,
                  strategy: "rerank" as const,
                }))
              }
            >
              <Layers className="size-4" />
              Rerank 模型
            </button>
          </div>
          {hybridWeight && (
            <>
              <p className="text-muted-foreground text-sm">调整语义与关键词权重，控制排序偏向</p>
              <div className="space-y-2">
                <Label>语义</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={[value.weightConfig?.semanticWeight ?? 0.7]}
                    onValueChange={([v]) =>
                      onChange((r) => ({
                        ...r,
                        weightConfig: {
                          semanticWeight: v,
                          keywordWeight: 1 - v,
                        },
                      }))
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-16"
                    value={value.weightConfig?.semanticWeight ?? 0.7}
                    onChange={(e) => {
                      const v = Math.min(1, Math.max(0, Number(e.target.value) || 0));
                      onChange((r) => ({
                        ...r,
                        weightConfig: { semanticWeight: v, keywordWeight: 1 - v },
                      }));
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>关键词</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={[value.weightConfig?.keywordWeight ?? 0.3]}
                    onValueChange={([v]) =>
                      onChange((r) => ({
                        ...r,
                        weightConfig: {
                          semanticWeight: 1 - v,
                          keywordWeight: v,
                        },
                      }))
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-16"
                    value={value.weightConfig?.keywordWeight ?? 0.3}
                    onChange={(e) => {
                      const v = Math.min(1, Math.max(0, Number(e.target.value) || 0));
                      onChange((r) => ({
                        ...r,
                        weightConfig: { semanticWeight: 1 - v, keywordWeight: v },
                      }));
                    }}
                  />
                </div>
              </div>
            </>
          )}
          {!hybridWeight && (
            <RerankModelSelector
              value={value.rerankConfig?.modelId || undefined}
              onSelect={(v) =>
                onChange((r) => ({
                  ...r,
                  rerankConfig: { ...r.rerankConfig, enabled: true, modelId: v },
                }))
              }
              placeholder="请选择模型"
              className="w-full"
            />
          )}
          <TopKField value={value} onChange={onChange} />
          <ScoreThresholdField value={value} onChange={onChange} />
        </>
      )}
    </CardContent>
  );
}
