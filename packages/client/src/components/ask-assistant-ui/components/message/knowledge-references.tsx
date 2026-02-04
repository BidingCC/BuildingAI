"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import { cn } from "@buildingai/ui/lib/utils";
import type { UIMessage } from "ai";
import { ChevronDown, Lightbulb } from "lucide-react";
import { memo, useMemo } from "react";

export interface KnowledgeReferencesProps {
  parts: UIMessage["parts"];
  className?: string;
  defaultOpen?: boolean;
}

export const KnowledgeReferences = memo(function KnowledgeReferences({
  parts,
  className,
  defaultOpen = true,
}: KnowledgeReferencesProps) {
  const items = useMemo(() => {
    const part = parts?.find((p) => (p as { type?: string }).type === "tool-getInformation");
    const output = (part as { output?: { title: string; content?: string }[] })?.output;
    return Array.isArray(output) ? output : [];
  }, [parts]);

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
          {items.map((item, index) => (
            <li key={`${index}-${item.title.slice(0, 40)}`}>
              <div className="hover:bg-muted flex items-center gap-2 rounded-md p-2 transition-colors">
                <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-foreground text-sm">{item.title || "无标题"}</span>
              </div>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
});
