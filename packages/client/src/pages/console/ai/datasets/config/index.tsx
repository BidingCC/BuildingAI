import {
  RETRIEVAL_MODE,
  type RetrievalModeType,
} from "@buildingai/constants/shared/datasets.constants";
import {
  type UpdateDatasetsConfigDto,
  useDatasetsConfigQuery,
  useSetDatasetsConfigMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmbeddingModelSelector } from "@/components/model-selectors";
import { PageContainer } from "@/layouts/console/_components/page-container";

import {
  buildEmptyRetrievalConfig,
  type RetrievalConfig,
  RetrievalConfigSection,
} from "./retrieval-config";

const DatasetsConfigPage = () => {
  const [initialStorageMb, setInitialStorageMb] = useState(1024);
  const [embeddingModelId, setEmbeddingModelId] = useState("");
  const [retrieval, setRetrieval] = useState<RetrievalConfig>(
    buildEmptyRetrievalConfig(RETRIEVAL_MODE.HYBRID),
  );

  const { data, isLoading } = useDatasetsConfigQuery();

  const setConfigMutation = useSetDatasetsConfigMutation({
    onSuccess: () => {
      toast.success("保存成功");
    },
    onError: (e) => {
      toast.error(`保存失败: ${e.message}`);
    },
  });

  useEffect(() => {
    if (!data) return;
    setInitialStorageMb(data.initialStorageMb);
    setEmbeddingModelId(data.embeddingModelId ?? "");
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
      toast.error("请选择 Embedding 模型");
      return;
    }
    const dto: UpdateDatasetsConfigDto = {
      initialStorageMb,
      embeddingModelId: embeddingModelId.trim(),
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
        <span className="text-muted-foreground">加载中...</span>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6 pb-6">
        <h1 className="text-xl font-semibold">知识库设置</h1>

        <div className="space-y-2">
          <Label>知识库初始空间</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={initialStorageMb}
              onChange={(e) => setInitialStorageMb(Number(e.target.value) || 1)}
              className="w-90"
            />
            <span className="text-muted-foreground text-sm">M</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Embedding 模型 <span className="text-destructive">*</span>
          </Label>
          <EmbeddingModelSelector
            value={embeddingModelId || undefined}
            onSelect={setEmbeddingModelId}
            placeholder="请选择模型"
            className="w-90 text-left"
          />
        </div>

        <RetrievalConfigSection value={retrieval} onChange={setRetrieval} />

        <div className="flex justify-start">
          <Button onClick={handleSave} disabled={setConfigMutation.isPending}>
            {setConfigMutation.isPending ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default DatasetsConfigPage;
