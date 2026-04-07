import {
  RETRIEVAL_MODE,
  type RetrievalModeType,
} from "@buildingai/constants/shared/datasets.constants";
import { useI18n } from "@buildingai/i18n";
import {
  type SetDatasetVectorConfigDto,
  useConsoleDatasetDetailQuery,
  useSetDatasetVectorConfigMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Label } from "@buildingai/ui/components/ui/label";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ModelSelector } from "@/components/ask-assistant-ui";
import {
  buildEmptyRetrievalConfig,
  type RetrievalConfig,
  RetrievalConfigSection,
} from "@/pages/console/ai/datasets/config/retrieval-config";

type VectorConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string | null;
  datasetName: string;
  onSuccess?: () => void;
};

export function VectorConfigDialog({
  open,
  onOpenChange,
  datasetId,
  datasetName,
  onSuccess,
}: VectorConfigDialogProps) {
  const { t } = useI18n();
  const [embeddingModelId, setEmbeddingModelId] = useState("");
  const [retrieval, setRetrieval] = useState<RetrievalConfig>(() =>
    buildEmptyRetrievalConfig(RETRIEVAL_MODE.HYBRID),
  );

  const { data, isLoading } = useConsoleDatasetDetailQuery(open ? datasetId : null);
  const setConfigMutation = useSetDatasetVectorConfigMutation({
    onSuccess: () => {
      toast.success(t("ai.vector.saved"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(t("ai.vector.saveFailed", { error: e.message })),
  });

  useEffect(() => {
    if (!data) return;
    setEmbeddingModelId(data.embeddingModelId ?? "");
    const rc = data.retrievalConfig as Record<string, unknown> | undefined;
    if (rc && typeof rc === "object") {
      setRetrieval({
        retrievalMode: (rc.retrievalMode as string) ?? RETRIEVAL_MODE.HYBRID,
        strategy: (rc.strategy as RetrievalConfig["strategy"]) ?? "weighted_score",
        topK: (rc.topK as number) ?? 3,
        scoreThreshold: (rc.scoreThreshold as number) ?? 0.5,
        scoreThresholdEnabled: (rc.scoreThresholdEnabled as boolean) ?? false,
        weightConfig: {
          semanticWeight: (rc.weightConfig as { semanticWeight?: number })?.semanticWeight ?? 0.7,
          keywordWeight: (rc.weightConfig as { keywordWeight?: number })?.keywordWeight ?? 0.3,
        },
        rerankConfig: {
          enabled: (rc.rerankConfig as { enabled?: boolean })?.enabled ?? false,
          modelId: (rc.rerankConfig as { modelId?: string })?.modelId ?? "",
        },
      });
    }
  }, [data]);

  const handleSave = () => {
    if (!datasetId) return;
    if (!embeddingModelId?.trim()) {
      toast.error(t("ai.vector.selectEmbeddingModel"));
      return;
    }
    const dto: SetDatasetVectorConfigDto = {
      embeddingModelId: embeddingModelId.trim(),
      retrievalMode: retrieval.retrievalMode as RetrievalModeType,
      retrievalConfig: {
        retrievalMode: retrieval.retrievalMode,
        strategy: retrieval.strategy,
        topK: retrieval.topK,
        scoreThreshold: retrieval.scoreThreshold,
        scoreThresholdEnabled: retrieval.scoreThresholdEnabled,
        weightConfig: retrieval.weightConfig,
        rerankConfig: retrieval.rerankConfig,
      },
    };
    setConfigMutation.mutate({ id: datasetId, dto });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-[min(32rem,90vw)]">
        <DialogHeader>
          <DialogTitle>{t("ai.vector.title", { name: datasetName })}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <div className="min-w-0 space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                {t("ai.vector.embeddingModel")} <span className="text-destructive">*</span>
              </Label>
              <ModelSelector
                modelType="text-embedding"
                value={embeddingModelId || undefined}
                onSelect={setEmbeddingModelId}
                placeholder={t("ai.vector.selectModel")}
                triggerVariant="button"
                className="w-full text-left"
              />
            </div>
            <RetrievalConfigSection value={retrieval} onChange={setRetrieval} className="w-full" />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("ai.vector.cancel")}
          </Button>
          <Button disabled={isLoading || setConfigMutation.isPending} onClick={handleSave}>
            {setConfigMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("ai.vector.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
