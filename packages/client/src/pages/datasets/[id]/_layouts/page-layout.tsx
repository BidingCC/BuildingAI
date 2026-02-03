import type { ReactNode } from "react";

export interface PageLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

/**
 * 页面双栏布局
 * - 左侧：侧边栏（固定宽度）
 * - 右侧：主内容区（自适应）
 */
export function PageLayout({ sidebar, children }: PageLayoutProps) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-96 shrink-0 border-r">{sidebar}</div>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
