import {
  RETRIEVAL_MODE,
  type RetrievalModeType,
} from "@buildingai/constants/shared/datasets.constants";
import { useI18n } from "@buildingai/i18n";
import {
  type UpdateDatasetsConfigDto,
  useDatasetsConfigQuery,
  useSetDatasetsConfigMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ModelSelector } from "@/components/ask-assistant-ui";
import { PageContainer } from "@/layouts/console/_components/page-container";

import {
  buildEmptyRetrievalConfig,
  type RetrievalConfig,
  RetrievalConfigSection,
} from "./retrieval-config";

const DatasetsConfigPage = () => {
  const { t } = useI18n();
  const [initialStorageMb, setInitialStorageMb] = useState(1024);
  const [embeddingModelId, setEmbeddingModelId] = useState("");
  const [textModelId, setTextModelId] = useState("");
  const [squarePublishSkipReview, setSquarePublishSkipReview] = useState(false);
  const [retrieval, setRetrieval] = useState<RetrievalConfig>(
    buildEmptyRetrievalConfig(RETRIEVAL_MODE.HYBRID),
  );

  const { data, isLoading } = useDatasetsConfigQuery();

  const setConfigMutation = useSetDatasetsConfigMutation({
    onSuccess: () => {
      toast.success(t("ai.dataset.config.saveSuccess"));
    },
    onError: (e) => {
      toast.error(t("ai.dataset.config.saveFailed", { error: e.message }));
    },
  });

  useEffect(() => {
    if (!data) return;
    setInitialStorageMb(data.initialStorageMb);
    setEmbeddingModelId(data.embeddingModelId ?? "");
    setTextModelId(data.textModelId ?? "");
    setSquarePublishSkipReview(data.squarePublishSkipReview ?? false);
    const rc = data.defaultRetrievalConfig;
    if (rc) {
      setRetrieval({
        retrievalMode: rc.retrievalMode,
        strategy: rc.strategy ?? "weighted_score",
        topK: rc.topK ?? 3,
        scoreThreshold: rc.scoreThreshold ?? 0.5,
        scoreThresholdEnabled: rc.scoreThresholdEnabled ?? false,
        weightConfig: {
          semanticWeight: rc.weightConfig?.semanticWeight ?? 0.7,
          keywordWeight: rc.weightConfig?.keywordWeight ?? 0.3,
        },
        rerankConfig: {
          enabled: rc.rerankConfig?.enabled ?? false,
          modelId: rc.rerankConfig?.modelId ?? "",
        },
      });
    }
  }, [data]);

  const handleSave = () => {
    if (!embeddingModelId?.trim()) {
      toast.error(t("ai.dataset.config.selectEmbeddingModel"));
      return;
    }
    const dto: UpdateDatasetsConfigDto = {
      initialStorageMb,
      embeddingModelId: embeddingModelId.trim(),
      textModelId: textModelId.trim() || undefined,
      squarePublishSkipReview,
      defaultRetrievalConfig: {
        retrievalMode: retrieval.retrievalMode as RetrievalModeType,
        strategy: retrieval.strategy,
        topK: retrieval.topK,
        scoreThreshold: retrieval.scoreThreshold,
        scoreThresholdEnabled: retrieval.scoreThresholdEnabled,
        weightConfig: retrieval.weightConfig,
        rerankConfig: retrieval.rerankConfig,
      },
    };
    setConfigMutation.mutate(dto);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-muted-foreground">{t("ai.dataset.list.empty.loading")}</span>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="min-w-0 space-y-6 pb-6">
        <h1 className="text-xl font-semibold">{t("ai.dataset.config.title")}</h1>

        <div className="space-y-2">
          <Label>{t("ai.dataset.config.publishWithoutReview.label")}</Label>
          <div className="flex items-center gap-2">
            <Switch
              checked={squarePublishSkipReview}
              onCheckedChange={setSquarePublishSkipReview}
            />
            <span className="text-muted-foreground text-sm">
              {squarePublishSkipReview
                ? t("ai.dataset.config.publishWithoutReview.enabled")
                : t("ai.dataset.config.publishWithoutReview.disabled")}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("ai.dataset.config.initialStorage")}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={initialStorageMb}
              onChange={(e) => setInitialStorageMb(Number(e.target.value) || 1)}
              className="w-full sm:w-90"
            />
            <span className="text-muted-foreground text-sm">
              {t("ai.dataset.config.storageUnit")}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            {t("ai.dataset.config.embeddingModel")} <span className="text-destructive">*</span>
          </Label>
          <ModelSelector
            modelType="text-embedding"
            value={embeddingModelId || undefined}
            onSelect={setEmbeddingModelId}
            placeholder={t("ai.dataset.config.selectModel")}
            triggerVariant="button"
            className="w-full text-left sm:w-90"
          />
        </div>

        <div className="space-y-2">
          <Label>{t("ai.dataset.config.summaryModel")}</Label>
          <ModelSelector
            modelType="llm"
            value={textModelId || undefined}
            onSelect={setTextModelId}
            placeholder={t("ai.dataset.config.selectModelOptional")}
            triggerVariant="button"
            className="w-full text-left sm:w-90"
          />
          <p className="text-muted-foreground text-sm">
            {t("ai.dataset.config.summaryDescription")}
          </p>
        </div>

        <RetrievalConfigSection value={retrieval} onChange={setRetrieval} />

        <PermissionGuard permissions="datasets-config:set">
          <div className="bg-background sticky bottom-0 z-2 flex justify-start py-4">
            <Button onClick={handleSave} disabled={setConfigMutation.isPending}>
              {setConfigMutation.isPending
                ? t("ai.dataset.config.savingLabel")
                : t("ai.dataset.config.save")}
            </Button>
          </div>
        </PermissionGuard>
      </div>
    </PageContainer>
  );
};

export default DatasetsConfigPage;
