"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import { ChevronDown, Lightbulb } from "lucide-react";
import { memo, useMemo } from "react";

export interface KnowledgeReferenceItem {
  id?: string;
  index?: number;
  title?: string;
  source?: string;
  content?: string;
  format?: string;
  href?: string;
  sourceUrl?: string;
  score?: number;
  relevanceScore?: number;
  highlight?: string;
}

interface ToolPartData {
  output?: unknown;
}

function isKnowledgeOutput(output: unknown): output is KnowledgeReferenceItem[] {
  if (!Array.isArray(output)) return false;
  return output.every(
    (item) =>
      item != null &&
      typeof item === "object" &&
      (typeof (item as KnowledgeReferenceItem).title === "string" ||
        typeof (item as KnowledgeReferenceItem).source === "string"),
  );
}

export interface KnowledgeReferencesProps {
  toolPart: ToolPartData;
  className?: string;
  defaultOpen?: boolean;
}

export const KnowledgeReferences = memo(function KnowledgeReferences({
  toolPart,
  className,
  defaultOpen = true,
}: KnowledgeReferencesProps) {
  const items = useMemo(() => {
    const output = toolPart.output;
    if (!isKnowledgeOutput(output)) return [];
    return output.filter(
      (item): item is KnowledgeReferenceItem =>
        item != null &&
        typeof item === "object" &&
        (typeof item.title === "string" || typeof item.source === "string"),
    );
  }, [toolPart]);

  if (items.length === 0) return null;

  const label = `已在知识库中检索到 ${items.length} 篇资料作为参考`;

  return (
    <Collapsible defaultOpen={defaultOpen} className={cn("group not-prose", className)}>
      <CollapsibleTrigger className="bg-muted/40 hover:bg-muted/60 flex cursor-pointer items-center gap-2.5 rounded-xl border-0 px-3.5 py-2.5 text-left transition-colors outline-none">
        <Lightbulb className="text-muted-foreground size-4 shrink-0" />
        <span className="text-muted-foreground flex-1 text-sm font-medium">{label}</span>
        <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="bg-muted/40 mt-2 flex flex-col rounded-xl p-2">
          {items.map((item, index) => {
            const key = item.id ?? `ref-${index}-${String(item.title).slice(0, 40)}`;
            const title = item.title || item.source || "无标题";
            const rawContent = typeof item.content === "string" ? item.content : "";
            const contentPreview =
              rawContent.length > 100 ? `${rawContent.slice(0, 100)}...` : rawContent;
            const cell = (
              <>
                <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-foreground text-sm">{title}</span>
              </>
            );
            const link = item.href || item.sourceUrl;
            const inner = link ? (
              <a
                href={link}
                className="hover:bg-muted flex items-center gap-2 rounded-md p-2 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {cell}
              </a>
            ) : (
              <div className="hover:bg-muted flex items-center gap-2 rounded-md p-2 transition-colors">
                {cell}
              </div>
            );
            const wrapped = contentPreview ? (
              <Tooltip>
                <TooltipTrigger asChild>{inner}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {contentPreview}
                </TooltipContent>
              </Tooltip>
            ) : (
              inner
            );
            return <li key={key}>{wrapped}</li>;
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
});
