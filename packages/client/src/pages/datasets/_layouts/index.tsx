import { useSidebar } from "@buildingai/ui/components/ui/sidebar";
import { useLayoutEffect } from "react";
import { Outlet } from "react-router-dom";

import { DatasetsNavbar } from "./navbar";
import { DatasetsSidebar } from "./sidebar";

const KnowledgeLayout = () => {
  const { setTemporaryOpen } = useSidebar();

  useLayoutEffect(() => {
    setTemporaryOpen(false);
    return () => setTemporaryOpen(null); // Restore original state on unmount
  }, [setTemporaryOpen]);

  return (
    <div className="flex h-full">
      <DatasetsSidebar />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <DatasetsNavbar />
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default KnowledgeLayout;
