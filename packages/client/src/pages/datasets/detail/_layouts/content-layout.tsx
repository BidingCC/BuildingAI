import type { Dataset } from "@buildingai/services/web";
import type { ReactNode } from "react";

import { ContentHeader } from "../_components/header";

export interface ContentLayoutProps {
  dataset: Dataset | undefined;
  children: ReactNode;
}

export function ContentLayout({ dataset, children }: ContentLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContentHeader dataset={dataset} />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
