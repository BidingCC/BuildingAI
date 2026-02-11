import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import type { ReactNode } from "react";

import { DocumentDropZone } from "../_components/document-drop-zone";
import { useDatasetDetailContext } from "../context";
import { useDocumentDrop } from "../hooks";

export interface ContentLayoutProps {
  children: ReactNode;
}

export function ContentLayout({ children }: ContentLayoutProps) {
  const { canManageDocuments, uploadDocuments } = useDatasetDetailContext();
  const { zoneRef, isOver, showDropZone, handlers } = useDocumentDrop({
    enabled: canManageDocuments,
    onDrop: uploadDocuments,
  });

  return (
    <div ref={zoneRef} className="relative flex h-full min-h-0 flex-col" {...handlers}>
      <ScrollArea className="min-h-0 flex-1">
        <div className="@container mx-auto w-full max-w-4xl px-6 pb-6">{children}</div>
      </ScrollArea>
      {canManageDocuments && <DocumentDropZone isOver={isOver} visible={showDropZone} />}
    </div>
  );
}
