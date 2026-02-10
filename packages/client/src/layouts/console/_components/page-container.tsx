import { cn } from "@buildingai/ui/lib/utils";
import React from "react";

const PageContainer = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn("min-h-inset m-4 mt-1 flex flex-col", className)}>{children}</div>;
};

export { PageContainer };
