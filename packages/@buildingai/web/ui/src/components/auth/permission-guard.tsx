import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { useAuthStore } from "@buildingai/stores";
import type { ReactNode } from "react";
import { toast } from "sonner";

export interface PermissionGuardProps {
  children: ReactNode;
  /**
   * Permission code(s) required to render children.
   * Can be a single code or an array of codes.
   * User must have ALL specified permissions (AND logic).
   */
  permissions: string | string[];
  /**
   * If true, user only needs ONE of the specified permissions (OR logic).
   * @default false
   */
  any?: boolean;
  /**
   * If true, children are visible but interactions are blocked with toast.
   * If false, hide children when permission is denied.
   * @default false
   */
  blockOnly?: boolean;
  /**
   * If true, show toast when interaction is blocked.
   * @default true
   */
  showToast?: boolean;
  /**
   * Custom toast message when permission is denied.
   * @default "无权限执行此操作"
   */
  toastMessage?: string;
  /**
   * Fallback content when permission is denied and hidden is true.
   */
  fallback?: ReactNode;
  /**
   * Callback when interaction is blocked due to permission denial.
   */
  onDenied?: () => void;
}

/**
 * Conditionally render or block interactions based on user permissions.
 * Root users bypass all permission checks.
 *
 * By default, children are hidden when permission is denied.
 * Set `blockOnly` to true to show children but block interactions with toast.
 */
export function PermissionGuard({
  children,
  permissions,
  any = false,
  blockOnly = false,
  showToast = true,
  toastMessage = "无权限执行此操作",
  fallback = null,
  onDenied,
}: PermissionGuardProps) {
  const { userInfo } = useAuthStore((state) => state.auth);

  const isRoot = userInfo?.isRoot === BooleanNumber.YES;
  const userPermissions = userInfo?.permissionsCodes ?? [];

  const permissionList = Array.isArray(permissions) ? permissions : [permissions];

  const hasPermission = any
    ? permissionList.some((p) => userPermissions.includes(p))
    : permissionList.every((p) => userPermissions.includes(p));

  const isAllowed = isRoot || hasPermission;

  if (!isAllowed && !blockOnly) {
    return <>{fallback}</>;
  }

  if (!isAllowed) {
    const handleInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (showToast) {
        toast.error(toastMessage);
      }
      onDenied?.();
    };

    return (
      <div onClick={handleInteraction} onKeyDown={handleInteraction} className="cursor-not-allowed">
        <div className="pointer-events-none">{children}</div>
      </div>
    );
  }

  return <>{children}</>;
}
