import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@buildingai/ui/components/ui/sheet";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const SIDEBAR_COLLAPSED_BREAKPOINT = 1200;

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < SIDEBAR_COLLAPSED_BREAKPOINT : true,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SIDEBAR_COLLAPSED_BREAKPOINT - 1}px)`);
    const onChange = () => setCollapsed(window.innerWidth < SIDEBAR_COLLAPSED_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setCollapsed(window.innerWidth < SIDEBAR_COLLAPSED_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return collapsed;
}

export interface PageLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

type DocSidebarContextValue = { openDocSidebar: () => void };

const DocSidebarContext = createContext<DocSidebarContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useDocSidebar() {
  return useContext(DocSidebarContext);
}

export function PageLayout({ sidebar, children }: PageLayoutProps) {
  const sidebarCollapsed = useSidebarCollapsed();
  const [sheetOpen, setSheetOpen] = useState(false);
  const openDocSidebar = useCallback(() => setSheetOpen(true), []);

  if (!sidebarCollapsed) {
    return (
      <div className="flex h-full overflow-hidden">
        <div className="w-96 shrink-0 border-r">{sidebar}</div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    );
  }

  return (
    <DocSidebarContext.Provider value={{ openDocSidebar }}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="left"
          className="h-dvh max-w-full p-0 data-[side=left]:w-full! **:data-[slot=sheet-close]:top-auto **:data-[slot=sheet-close]:right-4 **:data-[slot=sheet-close]:bottom-4"
          aria-describedby={undefined}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>文档列表</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col overflow-hidden">{sidebar}</div>
        </SheetContent>
      </Sheet>
    </DocSidebarContext.Provider>
  );
}
