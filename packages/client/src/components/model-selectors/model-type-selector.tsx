import { useAiProvidersQuery } from "@buildingai/services/web";
import {
  ModelSelector as AIModelSelector,
  ModelSelectorContent as AIModelSelectorContent,
  ModelSelectorEmpty as AIModelSelectorEmpty,
  ModelSelectorInput as AIModelSelectorInput,
  ModelSelectorItem as AIModelSelectorItem,
  ModelSelectorName as AIModelSelectorName,
  ModelSelectorTrigger as AIModelSelectorTrigger,
} from "@buildingai/ui/components/ai-elements/model-selector";
import { Button } from "@buildingai/ui/components/ui/button";
import { cn } from "@buildingai/ui/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { convertProvidersToModels, type Model } from "@/components/ask-assistant-ui";
import { ProviderIcon } from "@/components/provider-icons";

const GROUP_ROW_HEIGHT = 28;
const MODEL_ROW_HEIGHT = 44;
const VIRTUAL_LIST_OVERSCAN = 5;
const CONTAINER_HEIGHT = 288;

export type ModelTypeForQuery = "llm" | "text-embedding" | "rerank";

export type ModelTypeSelectorProps = {
  modelType: ModelTypeForQuery;
  value?: string;
  onSelect: (modelId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

type Row =
  | { type: "group"; key: string; chef: string }
  | { type: "model"; key: string; model: Model };

interface ModelRowItemProps {
  model: Model;
  isSelected: boolean;
  onSelect: (modelId: string) => void;
}

const ModelRowItem = ({ model, isSelected, onSelect }: ModelRowItemProps) => (
  <AIModelSelectorItem onSelect={() => onSelect(model.id)} value={`${model.name} ${model.id}`}>
    <ProviderIcon provider={model.chefSlug} />
    <AIModelSelectorName>{model.name}</AIModelSelectorName>
    <div className="ml-auto">
      {isSelected ? <CheckIcon className="size-4" /> : <div className="size-4" />}
    </div>
  </AIModelSelectorItem>
);

export function ModelTypeSelector({
  modelType,
  value,
  onSelect,
  placeholder = "请选择模型",
  disabled = false,
  className,
}: ModelTypeSelectorProps) {
  const { data: providers = [], isLoading } = useAiProvidersQuery({
    supportedModelTypes: modelType,
  });

  const models = useMemo(() => convertProvidersToModels(providers), [providers]);
  const selectedModel = useMemo(() => models.find((m) => m.id === value), [models, value]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const handleSelect = useCallback(
    (modelId: string) => {
      onSelect(modelId);
      setOpen(false);
    },
    [onSelect],
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
    const byChef = new Map<string, Model[]>();
    for (const m of filteredModels) {
      const existing = byChef.get(m.chef);
      if (existing) existing.push(m);
      else byChef.set(m.chef, [m]);
    }
    const sortedChefs = Array.from(byChef.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    const out: Row[] = [];
    for (const chef of sortedChefs) {
      const list = byChef.get(chef);
      if (!list?.length) continue;
      out.push({ type: "group", key: `group:${chef}`, chef });
      for (const m of list) out.push({ type: "model", key: `model:${m.id}`, model: m });
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
    <AIModelSelector open={open} onOpenChange={setOpen}>
      <AIModelSelectorTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled || isLoading}
          className={cn("justify-start text-left", className)}
        >
          {isLoading ? "加载中..." : (selectedModel?.name ?? placeholder)}
          <ChevronDownIcon className="text-muted-foreground ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </AIModelSelectorTrigger>
      <AIModelSelectorContent commandProps={{ shouldFilter: false }}>
        <AIModelSelectorInput placeholder="搜索模型..." value={query} onValueChange={setQuery} />
        <div
          ref={parentRef}
          className="no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none"
          style={{ height: `${CONTAINER_HEIGHT}px` }}
        >
          {rows.length === 0 ? (
            <AIModelSelectorEmpty>暂无可用模型</AIModelSelectorEmpty>
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
                        isSelected={value === row.model.id}
                        onSelect={handleSelect}
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
}
