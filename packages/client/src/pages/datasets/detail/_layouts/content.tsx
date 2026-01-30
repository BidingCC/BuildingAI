import type { ReactNode } from "react";

import type { DatasetEditFormValues } from "../_components/dataset-edit-dialog";
import { ContentNavbar, type DatasetInfo } from "./content-navbar";

export interface ContentProps {
  mode: "own" | "others";
  dataset: DatasetInfo;
  children: ReactNode;
  onEditSubmit?: (values: DatasetEditFormValues) => void;
}

export function Content({ mode, dataset, children, onEditSubmit }: ContentProps) {
  return (
    <div className="flex h-full flex-col">
      <ContentNavbar mode={mode} dataset={dataset} onEditSubmit={onEditSubmit} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
