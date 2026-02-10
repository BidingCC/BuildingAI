import { useAssistantStore } from "@buildingai/stores";
import { useCallback, useEffect } from "react";

import type { Model } from "@/components/ask-assistant-ui";

interface UseChatModelOptions {
  models: Model[];
  selectedModelIdProp?: string;
  onSelectModelProp?: (modelId: string) => void;
}

interface UseChatModelReturn {
  selectedModelId: string;
  handleSelectModel: (modelId: string) => void;
}

export function useChatModel({
  models,
  selectedModelIdProp,
  onSelectModelProp,
}: UseChatModelOptions): UseChatModelReturn {
  const storeSelectedModelId = useAssistantStore((s) => s.selectedModelId);
  const setStoreSelectedModelId = useAssistantStore((s) => s.setSelectedModelId);

  const selectedModelId = selectedModelIdProp ?? storeSelectedModelId;

  // 同步模型选择状态
  useEffect(() => {
    if (models.length === 0 || selectedModelIdProp !== undefined) return;

    const currentId = storeSelectedModelId;
    const isValidModel = models.some((m) => m.id === currentId);
    const modelId = isValidModel ? currentId : models[0].id;

    if (modelId !== currentId || !currentId) {
      setStoreSelectedModelId(modelId);
    }
  }, [models, storeSelectedModelId, selectedModelIdProp, setStoreSelectedModelId]);

  const handleSelectModel = useCallback(
    (modelId: string) => {
      setStoreSelectedModelId(modelId);
      onSelectModelProp?.(modelId);
    },
    [setStoreSelectedModelId, onSelectModelProp],
  );

  return {
    selectedModelId,
    handleSelectModel: onSelectModelProp ?? handleSelectModel,
  };
}
