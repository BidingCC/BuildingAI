import { RETRIEVAL_MODE } from "@buildingai/constants/shared/datasets.constants";
import { useI18n } from "@buildingai/i18n";
import { Card, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { cn } from "@buildingai/ui/lib/utils";
import { Boxes, FileText, Layers } from "lucide-react";

import { RetrievalParams } from "./retrieval-params";
import type { RetrievalConfig } from "./types";
import { buildEmptyRetrievalConfig } from "./types";

type Props = {
  value: RetrievalConfig;
  onChange: (v: RetrievalConfig | ((prev: RetrievalConfig) => RetrievalConfig)) => void;
  className?: string;
};

export function RetrievalConfigSection({ value, onChange, className }: Props) {
  const { t } = useI18n();

  const retrievalOptions = [
    {
      mode: RETRIEVAL_MODE.VECTOR,
      title: t("ai.dataset.retrieval.vectorSearch"),
      desc: t("ai.dataset.retrieval.vectorSearchDesc"),
      icon: Layers,
    },
    {
      mode: RETRIEVAL_MODE.FULL_TEXT,
      title: t("ai.dataset.retrieval.fullTextSearch"),
      desc: t("ai.dataset.retrieval.fullTextSearchDesc"),
      icon: FileText,
    },
    {
      mode: RETRIEVAL_MODE.HYBRID,
      title: t("ai.dataset.retrieval.hybridSearch"),
      desc: t("ai.dataset.retrieval.hybridSearchDesc"),
      icon: Boxes,
    },
  ] as const;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium">{t("ai.dataset.retrieval.retrievalSettings")}</h2>
      <p className="text-muted-foreground text-sm">{t("ai.dataset.retrieval.selectModeHint")}</p>
      <div className={cn("flex min-w-0 flex-col gap-3", className ?? "w-full lg:w-lg")}>
        {retrievalOptions.map(({ mode, title, desc, icon: Icon }) => {
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
                      {t("ai.dataset.retrieval.currentlyUsing")}
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
