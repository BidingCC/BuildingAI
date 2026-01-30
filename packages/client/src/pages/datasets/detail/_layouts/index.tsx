import type { ReactNode } from "react";

import type { DocumentItem } from "../_components/documents";
import type { DatasetInfo } from "./content-navbar";
import { DatasetSidebar } from "./sidebar";

export { Content } from "./content";
export type { DatasetInfo };
export type { DocumentItem } from "../_components/documents";

export interface DatasetDetailLayoutProps {
  mode: "own" | "others";
  dataset: DatasetInfo;
  documents: DocumentItem[];
  children: ReactNode;
  onUpload?: (files: File[]) => void;
  onJoin?: () => void;
  onPublish?: () => void;
  onDocumentClick?: (document: DocumentItem) => void;
}

export function DatasetDetailLayout({
  mode,
  dataset,
  documents,
  children,
  onUpload,
  onJoin,
  onPublish,
  onDocumentClick,
}: DatasetDetailLayoutProps) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-96 shrink-0 border-r">
        <DatasetSidebar
          mode={mode}
          dataset={dataset}
          documents={documents}
          onUpload={onUpload}
          onJoin={onJoin}
          onPublish={onPublish}
          onDocumentClick={onDocumentClick}
        />
      </div>

      {/* Right: Content */}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
