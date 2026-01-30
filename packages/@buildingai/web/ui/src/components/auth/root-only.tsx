import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { useAuthStore } from "@buildingai/stores";
import type { ReactNode } from "react";

export interface RootOnlyProps {
  children: ReactNode;
  /**
   * If true, show children when user is NOT root (reverse condition)
   * @default false
   */
  reverse?: boolean;
  /**
   * Fallback content when condition is not met
   */
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on root user status.
 * By default, shows children only when user is root.
 * Set `reverse` to true to show children only when user is NOT root.
 */
export function RootOnly({ children, reverse = false, fallback = null }: RootOnlyProps) {
  const { userInfo } = useAuthStore((state) => state.auth);

  const isRoot = userInfo?.isRoot === BooleanNumber.YES;
  const shouldRender = reverse ? !isRoot : isRoot;

  return shouldRender ? <>{children}</> : <>{fallback}</>;
}
