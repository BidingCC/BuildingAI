import { cn } from "@buildingai/ui/lib/utils";
import { IconCircleCheckFilled, IconXboxXFilled } from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { Badge } from "./badge";

const statusIconVariants = cva("", {
  variants: {
    variant: {
      success: "fill-green-500 dark:fill-green-400",
      destructive: "fill-destructive",
      muted: "fill-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "success",
  },
});

type StatusBadgeProps = {
  active?: boolean;
  children?: ReactNode;
  activeText?: string;
  inactiveText?: string;
  activeVariant?: VariantProps<typeof statusIconVariants>["variant"];
  inactiveVariant?: VariantProps<typeof statusIconVariants>["variant"];
  className?: string;
};

/**
 * A reusable status indicator badge with configurable active/inactive states.
 * Supports custom text, icon color variants, and className overrides.
 */
function StatusBadge({
  active = true,
  children,
  activeText = "已启用",
  inactiveText = "已禁用",
  activeVariant = "success",
  inactiveVariant = "destructive",
  className,
}: StatusBadgeProps) {
  const variant = active ? activeVariant : inactiveVariant;
  const Icon = active ? IconCircleCheckFilled : IconXboxXFilled;
  const text = children ?? (active ? activeText : inactiveText);

  return (
    <Badge variant="outline" className={cn("text-muted-foreground pr-1.5 pl-1", className)}>
      <Icon className={cn(statusIconVariants({ variant }))} />
      {text}
    </Badge>
  );
}

export { StatusBadge, statusIconVariants };
