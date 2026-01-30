import type { ReactNode } from "react";

import { ContentNavbar, type DatasetInfo } from "./content-navbar";

export interface ContentProps {
  mode: "own" | "others";
  dataset: DatasetInfo;
  children: ReactNode;
}

export function Content({ mode, dataset, children }: ContentProps) {
  return (
    <div className="flex h-full flex-col">
      <ContentNavbar mode={mode} dataset={dataset} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
