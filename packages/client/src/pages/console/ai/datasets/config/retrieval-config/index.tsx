import { RETRIEVAL_MODE } from "@buildingai/constants/shared/datasets.constants";
import { Card, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { cn } from "@buildingai/ui/lib/utils";
import { Boxes, FileText, Layers } from "lucide-react";

import { RetrievalParams } from "./retrieval-params";
import type { RetrievalConfig } from "./types";
import { buildEmptyRetrievalConfig } from "./types";

const RETRIEVAL_OPTIONS = [
  {
    mode: RETRIEVAL_MODE.VECTOR,
    title: "向量检索",
    desc: "通过生成查询与文档内容的向量表示，并计算相似度来检索相关文档片段",
    icon: Layers,
  },
  {
    mode: RETRIEVAL_MODE.FULL_TEXT,
    title: "全文检索",
    desc: "索引文档中的所有词汇，允许用户查询任何词汇，并返回包含这些词汇的文本片段",
    icon: FileText,
  },
  {
    mode: RETRIEVAL_MODE.HYBRID,
    title: "混合检索",
    desc: "同时执行全文检索和向量检索，并用重排序策略，从而兼具两者优势",
    icon: Boxes,
  },
] as const;

type Props = {
  value: RetrievalConfig;
  onChange: (v: RetrievalConfig | ((prev: RetrievalConfig) => RetrievalConfig)) => void;
};

export function RetrievalConfigSection({ value, onChange }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium">检索设置</h2>
      <p className="text-muted-foreground text-sm">选择一种检索方式并配置参数，点击卡片可切换</p>
      <div className="flex w-lg flex-col gap-3">
        {RETRIEVAL_OPTIONS.map(({ mode, title, desc, icon: Icon }) => {
          const active = value.retrievalMode === mode;
          return (
            <Card
              key={mode}
              size="sm"
              className={cn("cursor-pointer transition-colors", active && "ring-primary ring-2")}
              onClick={() =>
                onChange((prev) => ({
                  ...buildEmptyRetrievalConfig(mode),
                  retrievalMode: mode,
                  strategy: prev.strategy,
                  topK: prev.topK,
                  scoreThreshold: prev.scoreThreshold,
                  scoreThresholdEnabled: prev.scoreThresholdEnabled,
                  weightConfig: prev.weightConfig,
                  rerankConfig: prev.rerankConfig,
                }))
              }
            >
              <CardHeader className="pt-0 pb-1.5">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="text-muted-foreground size-4" />
                  {title}
                  {active && (
                    <span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-xs">
                      当前使用
                    </span>
                  )}
                </CardTitle>
                <p className="text-muted-foreground text-xs">{desc}</p>
              </CardHeader>
              {active && <RetrievalParams value={value} onChange={onChange} />}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export type { RetrievalConfig } from "./types";
export { buildEmptyRetrievalConfig } from "./types";
