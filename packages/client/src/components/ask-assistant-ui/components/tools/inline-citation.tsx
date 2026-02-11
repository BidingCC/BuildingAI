"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { memo, useMemo } from "react";

import type { KnowledgeReferenceItem } from "./knowledge-references";

export interface InlineCitationProps {
  index: number;
  references: KnowledgeReferenceItem[];
}

export const InlineCitation = memo(function InlineCitation({
  index,
  references,
}: InlineCitationProps) {
  const ref = useMemo(() => references.find((r) => r.index === index), [references, index]);

  if (!ref) {
    return <sup className="text-muted-foreground text-[10px]">[{index}]</sup>;
  }

  const title = ref.title || ref.source || "Unknown";
  const link = ref.href || ref.sourceUrl;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary/10 text-primary hover:bg-primary/20 ml-0.5 inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold no-underline transition-colors"
          >
            {index}
          </a>
        ) : (
          <span className="bg-primary/10 text-primary hover:bg-primary/20 ml-0.5 inline-flex size-5 cursor-default items-center justify-center rounded-full text-[10px] font-semibold transition-colors">
            {index}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium">{title}</p>
        {ref.content && (
          <p className="text-muted-foreground mt-1 text-xs">
            {ref.content.length > 120 ? `${ref.content.slice(0, 120)}...` : ref.content}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
});
