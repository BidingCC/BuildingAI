import { cn } from "@buildingai/ui/lib/utils";
import React from "react";

const PageContainer = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("m-4 mt-1 flex min-h-[calc(100vh-6.25rem)] flex-col", className)}>
      {children}
    </div>
  );
};

export { PageContainer };
