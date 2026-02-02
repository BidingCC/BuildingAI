import type { Dataset } from "@buildingai/services/web";
import type { ReactNode } from "react";

import { ContentHeader } from "../_components/header";

export interface ContentLayoutProps {
  dataset: Dataset | undefined;
  children: ReactNode;
  onDelete?: () => void;
}

/**
 * 内容区布局
 * - 顶部：头部（标题、操作按钮）
 * - 主体：内容区
 */
export function ContentLayout({ dataset, children, onDelete }: ContentLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <ContentHeader dataset={dataset} onDelete={onDelete} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
