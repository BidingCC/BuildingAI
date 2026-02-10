import {
  ModelSelector as AIModelSelector,
  ModelSelectorContent as AIModelSelectorContent,
  ModelSelectorEmpty as AIModelSelectorEmpty,
  ModelSelectorInput as AIModelSelectorInput,
  ModelSelectorItem as AIModelSelectorItem,
  ModelSelectorName as AIModelSelectorName,
  ModelSelectorTrigger as AIModelSelectorTrigger,
} from "@buildingai/ui/components/ai-elements/model-selector";
import { PromptInputButton as AIPromptInputButton } from "@buildingai/ui/components/ai-elements/prompt-input";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AudioLinesIcon,
  CheckIcon,
  ChevronDownIcon,
  FileIcon,
  ImageIcon,
  VideoIcon,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { ProviderIcon } from "../../provider-icons";

const GROUP_ROW_HEIGHT = 28;
const MODEL_ROW_HEIGHT = 44;
const VIRTUAL_LIST_OVERSCAN = 5;
const CONTAINER_HEIGHT = 288;

export interface ModelData {
  id: string;
  name: string;
  chef: string;
  chefSlug: string;
  providers: string[];
  features?: string[];
  billingRule?: {
    power: number;
    tokens: number;
  };
}

export interface ModelSelectorProps {
  models: ModelData[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Row =
  | { type: "group"; key: string; chef: string }
  | { type: "model"; key: string; model: ModelData };

interface ModelRowItemProps {
  model: ModelData;
  isSelected: boolean;
  onSelect: (modelId: string) => void;
}

const ModelRowItem = ({ model, isSelected, onSelect }: ModelRowItemProps) => {
  const features = model.features ?? [];
  const hasVision = features.includes("vision");
  const hasVideo = features.includes("video");
  const hasAudio = features.includes("audio");
  const powerText = model.billingRule?.power ? `${model.billingRule.power} 积分` : "免费";

  return (
    <AIModelSelectorItem onSelect={() => onSelect(model.id)} value={`${model.name} ${model.id}`}>
      <ProviderIcon provider={model.chefSlug} />
      <AIModelSelectorName>
        {model.name}
        <Badge variant="secondary" className="text-muted-foreground ml-1.5 text-xs">
          {powerText}
        </Badge>
      </AIModelSelectorName>
      <div className="ml-auto flex items-center gap-1.5">
        {hasVision && (
          <ImageIcon aria-label="支持多模态（图像）" className="text-muted-foreground size-3.5" />
        )}
        {hasVideo && (
          <VideoIcon aria-label="支持视频输入" className="text-muted-foreground size-4" />
        )}
        {hasAudio && (
          <AudioLinesIcon
            aria-label="支持音频输入/输出"
            className="text-muted-foreground size-3.5"
          />
        )}
        <FileIcon aria-label="支持文件处理" className="text-muted-foreground size-3.5" />
        {isSelected ? <CheckIcon className="size-4" /> : <div className="size-4" />}
      </div>
    </AIModelSelectorItem>
  );
};

export const ModelSelector = ({
  models,
  selectedModelId,
  onModelChange,
  open,
  onOpenChange,
}: ModelSelectorProps) => {
  const selectedModel = useMemo(
    () => models.find((m) => m.id === selectedModelId),
    [models, selectedModelId],
  );
  const [query, setQuery] = useState("");
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleModelSelect = useCallback(
    (modelId: string) => {
      onModelChange(modelId);
      onOpenChange?.(false);
    },
    [onModelChange, onOpenChange],
  );

  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredModels = useMemo(() => {
    if (!normalizedQuery) return models;
    return models.filter((m) => {
      const searchText = `${m.name} ${m.id} ${m.chef}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [models, normalizedQuery]);

  const rows = useMemo<Row[]>(() => {
    if (filteredModels.length === 0) return [];

    const byChef = new Map<string, ModelData[]>();
    for (const m of filteredModels) {
      const existing = byChef.get(m.chef);
      if (existing) {
        existing.push(m);
      } else {
        byChef.set(m.chef, [m]);
      }
    }

    const sortedChefs = Array.from(byChef.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );

    const out: Row[] = [];
    for (const chef of sortedChefs) {
      const list = byChef.get(chef);
      if (!list?.length) continue;
      out.push({ type: "group", key: `group:${chef}`, chef });
      for (const m of list) {
        out.push({ type: "model", key: `model:${m.id}`, model: m });
      }
    }
    return out;
  }, [filteredModels]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.type === "group" ? GROUP_ROW_HEIGHT : MODEL_ROW_HEIGHT),
    overscan: VIRTUAL_LIST_OVERSCAN,
  });

  useEffect(() => {
    if (!open) return;
    const rafId = requestAnimationFrame(() => {
      parentRef.current?.scrollTo({ top: 0 });
      setTimeout(() => virtualizer.measure(), 0);
    });
    return () => cancelAnimationFrame(rafId);
  }, [open, normalizedQuery, virtualizer]);

  return (
    <AIModelSelector open={open} onOpenChange={onOpenChange}>
      <AIModelSelectorTrigger asChild>
        <AIPromptInputButton>
          {selectedModel?.chefSlug && (
            <ProviderIcon className="size-5" provider={selectedModel.chefSlug} />
          )}
          {selectedModel?.name && (
            <AIModelSelectorName>
              {selectedModel.name}
              <Badge variant="secondary" className="text-muted-foreground ml-1.5 text-xs">
                {selectedModel.billingRule?.power
                  ? `${selectedModel.billingRule.power} 积分`
                  : "免费"}
              </Badge>
            </AIModelSelectorName>
          )}
          <ChevronDownIcon className="text-muted-foreground size-4" />
        </AIPromptInputButton>
      </AIModelSelectorTrigger>
      <AIModelSelectorContent commandProps={{ shouldFilter: false }}>
        <AIModelSelectorInput
          placeholder="Search models..."
          value={query}
          onValueChange={setQuery}
        />

        <div
          ref={parentRef}
          className="no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none"
          style={{ height: `${CONTAINER_HEIGHT}px` }}
        >
          {rows.length === 0 ? (
            <AIModelSelectorEmpty>No models found.</AIModelSelectorEmpty>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.type === "group" ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                        {row.chef}
                      </div>
                    ) : (
                      <ModelRowItem
                        model={row.model}
                        isSelected={selectedModelId === row.model.id}
                        onSelect={handleModelSelect}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AIModelSelectorContent>
    </AIModelSelector>
  );
};
