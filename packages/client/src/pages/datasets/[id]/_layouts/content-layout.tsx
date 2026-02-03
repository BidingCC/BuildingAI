import type { Dataset } from "@buildingai/services/web";
import type { ReactNode } from "react";

import { ContentHeader } from "../_components/header";

export interface ContentLayoutProps {
  dataset: Dataset | undefined;
  children: ReactNode;
}

export function ContentLayout({ dataset, children }: ContentLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <ContentHeader dataset={dataset} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
