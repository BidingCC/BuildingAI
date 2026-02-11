import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import type { LucideProps } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { memo } from "react";

interface LucideIconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
  fallbackClassName?: string;
}

/**
 * Dynamic Lucide icon with skeleton fallback on first load.
 * Uses DynamicIcon internally for fast cached rendering.
 */
export const LucideIcon = memo(({ name, fallbackClassName, ...props }: LucideIconProps) => (
  <DynamicIcon
    name={name}
    {...props}
    fallback={() => <Skeleton className={fallbackClassName ?? "size-4 shrink-0 rounded"} />}
  />
));

LucideIcon.displayName = "LucideIcon";

export type { IconName };
