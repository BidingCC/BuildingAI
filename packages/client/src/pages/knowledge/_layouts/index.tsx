import { useSidebar } from "@buildingai/ui/components/ui/sidebar";
import React, { useLayoutEffect } from "react";
import { Outlet } from "react-router-dom";

import { KnowledgeNavbar } from "./navbar";
import { KnowledgeSidebar } from "./sidebar";

const KnowledgeLayout = () => {
  const { setTemporaryOpen } = useSidebar();

  useLayoutEffect(() => {
    setTemporaryOpen(false);
    return () => setTemporaryOpen(null); // Restore original state on unmount
  }, [setTemporaryOpen]);

  return (
    <div className="flex h-full">
      <KnowledgeSidebar />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <KnowledgeNavbar />
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default KnowledgeLayout;
