import { useI18n } from "@buildingai/i18n";
import type { ModelRouting } from "@buildingai/types";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@buildingai/ui/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { HelpCircle, Settings2 } from "lucide-react";
import { memo, useCallback } from "react";

import { ModelSelector as AIModelSelector } from "@/components/ask-assistant-ui/components/model-selector";

type MemoryConfig = { maxUserMemories?: number; maxAgentMemories?: number } | null;
const MEMORY_DEFAULT = 20;
const MEMORY_MIN = 1;
const MEMORY_MAX = 200;

type ModelSlot = {
  key: keyof ModelRouting | "chat";
  titleKey: string;
  descriptionKey: string;
  tooltipKey: string;
  modelType?: "llm" | "text-embedding" | "rerank";
};

function createModelSlots(t: (key: string) => string): ModelSlot[] {
  return [
    {
      key: "chat",
      titleKey: "agent.detail.model.chatModel",
      descriptionKey: "agent.detail.model.chatModelDesc",
      tooltipKey: "agent.detail.model.chatModelTooltip",
      modelType: "llm",
    },
    {
      key: "memoryModel",
      titleKey: "agent.detail.model.memoryExtractionModel",
      descriptionKey: "agent.detail.model.memoryExtractionModelDesc",
      tooltipKey: "agent.detail.model.memoryModelTooltip",
      modelType: "llm",
    },
    {
      key: "planningModel",
      titleKey: "agent.detail.model.planningModel",
      descriptionKey: "agent.detail.model.planningModelDesc",
      tooltipKey: "agent.detail.model.planningModelTooltip",
      modelType: "llm",
    },
    {
      key: "titleModel",
      titleKey: "agent.detail.model.titleModel",
      descriptionKey: "agent.detail.model.titleModelDesc",
      tooltipKey: "agent.detail.model.titleModelTooltip",
      modelType: "llm",
    },
  ];
}

interface ModelSelectorPanelProps {
  chatModelId?: string;
  modelRouting?: ModelRouting | null;
  memoryConfig?: MemoryConfig;
  onChatModelChange: (id: string) => void;
  onModelRoutingChange: (routing: ModelRouting) => void;
  onMemoryConfigChange?: (config: MemoryConfig) => void;
}

export const ModelSelector = memo(
  ({
    chatModelId,
    modelRouting,
    memoryConfig,
    onChatModelChange,
    onModelRoutingChange,
    onMemoryConfigChange,
  }: ModelSelectorPanelProps) => {
    const { t } = useI18n();
    const MODEL_SLOTS = useMemo(() => createModelSlots(t), [t]);

    const getSlotValue = useCallback(
      (key: ModelSlot["key"]): string => {
        if (key === "chat") return chatModelId ?? "";
        return modelRouting?.[key]?.modelId ?? "";
      },
      [chatModelId, modelRouting],
    );

    const handleSlotChange = useCallback(
      (key: ModelSlot["key"], modelId: string) => {
        if (key === "chat") {
          onChatModelChange(modelId);
          return;
        }
        const next: ModelRouting = { ...modelRouting };
        if (modelId) {
          next[key] = { modelId };
        } else {
          delete next[key];
        }
        onModelRoutingChange(next);
      },
      [modelRouting, onChatModelChange, onModelRoutingChange],
    );

    const maxUser = memoryConfig?.maxUserMemories ?? MEMORY_DEFAULT;
    const maxAgent = memoryConfig?.maxAgentMemories ?? MEMORY_DEFAULT;
    const updateMemory = useCallback(
      (field: "maxUserMemories" | "maxAgentMemories", value: number) => {
        const v = Math.min(MEMORY_MAX, Math.max(MEMORY_MIN, value));
        onMemoryConfigChange?.({
          maxUserMemories:
            field === "maxUserMemories" ? v : (memoryConfig?.maxUserMemories ?? MEMORY_DEFAULT),
          maxAgentMemories:
            field === "maxAgentMemories" ? v : (memoryConfig?.maxAgentMemories ?? MEMORY_DEFAULT),
        });
      },
      [memoryConfig, onMemoryConfigChange],
    );

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t("agent.detail.model.modelRouting")}</h3>
          <p className="text-muted-foreground text-xs">
            {t("agent.detail.model.modelRoutingDesc")}
          </p>
        </div>

        {MODEL_SLOTS.map((slot) => (
          <div
            key={slot.key}
            className="bg-secondary flex items-center justify-between rounded-lg px-3 py-2.5"
          >
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1.5">
                <Label className="text-sm font-medium">{t(slot.titleKey)}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      aria-label={t("common.help")}
                    >
                      <HelpCircle className="text-muted-foreground h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {t(slot.tooltipKey)}
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">{t(slot.descriptionKey)}</p>
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-2">
              {slot.key === "memoryModel" && onMemoryConfigChange && (
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="hover:bg-primary/10 hover:text-primary h-8 w-8"
                          aria-label={t("agent.detail.model.memoryConfig")}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-background text-xs">
                        {t("agent.detail.model.memoryConfig")}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent align="end" className="w-64">
                    <PopoverHeader>
                      <PopoverTitle className="text-sm">
                        {t("agent.detail.model.memoryConfig")}
                      </PopoverTitle>
                    </PopoverHeader>
                    <div className="grid gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">{t("agent.detail.model.maxUserMemories")}</Label>
                        <Input
                          type="number"
                          min={MEMORY_MIN}
                          max={MEMORY_MAX}
                          value={maxUser}
                          onChange={(e) =>
                            updateMemory(
                              "maxUserMemories",
                              parseInt(e.target.value, 10) || MEMORY_DEFAULT,
                            )
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">
                          {t("agent.detail.model.maxAgentMemories")}
                        </Label>
                        <Input
                          type="number"
                          min={MEMORY_MIN}
                          max={MEMORY_MAX}
                          value={maxAgent}
                          onChange={(e) =>
                            updateMemory(
                              "maxAgentMemories",
                              parseInt(e.target.value, 10) || MEMORY_DEFAULT,
                            )
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <div className="w-56">
                <AIModelSelector
                  modelType={slot.modelType}
                  value={getSlotValue(slot.key)}
                  onSelect={(id) => handleSlotChange(slot.key, id)}
                  triggerVariant="button"
                  placeholder={
                    slot.key === "chat"
                      ? t("agent.detail.model.selectModel")
                      : t("agent.detail.model.notEnabled")
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  },
);

ModelSelector.displayName = "ModelSelector";
