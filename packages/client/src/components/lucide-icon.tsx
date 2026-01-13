import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import type { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { lazy, memo, Suspense } from "react";

type IconName = keyof typeof dynamicIconImports;

interface LucideIconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

const iconCache = new Map<IconName, React.LazyExoticComponent<React.ComponentType<LucideProps>>>();

function getIconComponent(name: IconName) {
  if (!iconCache.has(name)) {
    iconCache.set(name, lazy(dynamicIconImports[name]));
  }
  return iconCache.get(name)!;
}

/**
 * Cached dynamic Lucide icon component to prevent flickering on re-renders.
 */
export const LucideIcon = memo(({ name, ...props }: LucideIconProps) => {
  const IconComponent = getIconComponent(name);

  return (
    <Suspense fallback={<Skeleton className="size-4 shrink-0 rounded" />}>
      <IconComponent {...props} />
    </Suspense>
  );
});

LucideIcon.displayName = "LucideIcon";
