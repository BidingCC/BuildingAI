import { cn } from "@buildingai/ui/lib/utils";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * 设置项组件属性
 */
interface SettingItemProps {
  /**
   * 设置项标题
   */
  title: string | ReactNode;
  /**
   * 设置项描述（可选）
   */
  description?: string | ReactNode;
  /**
   * 设置项图标（可选）
   */
  icon?: ReactNode;
  /**
   * 设置项额外内容（可选）
   */
  extra?: string | ReactNode;
  /**
   * 子元素，通常是控件
   */
  children?: ReactNode;
  /**
   * 链接地址（可选）
   */
  href?: string;
  /**
   * 链接打开方式（可选）
   */
  target?: React.HTMLAttributeAnchorTarget;
  className?: string;
  contentClassName?: string;
  /**
   * 点击事件（可选）
   */
  onClick?: () => void;
}

/**
 * 设置项组件
 * 用于在设置页面中显示一个设置项，包含标题、描述和控件
 */
export const SettingItem = ({
  title,
  description,
  icon,
  extra,
  children,
  href,
  target,
  className,
  contentClassName,
  onClick,
}: SettingItemProps) => {
  if (href && !onClick) {
    return (
      <Link to={href} target={target} className="group/setting-item block cursor-pointer px-4">
        <div
          className={cn(
            "border-border/60 flex items-center border-b py-3 group-last/setting-item:border-b-0",
            className,
          )}
        >
          {icon && <div className="mr-4 text-sm">{icon}</div>}
          <div className={cn("flex flex-col", contentClassName)}>
            <div className="text-sm">{title}</div>
            {description && (
              <div className="text-muted-foreground/70 mt-0.5 text-xs">{description}</div>
            )}
            {extra && <div className="text-muted-foreground/70 text-[11px]">{extra}</div>}
          </div>
          <div className="ml-auto flex items-center text-sm">{children}</div>
        </div>
      </Link>
    );
  }

  return (
    <div className={cn("group/setting-item px-4", onClick && "cursor-pointer")} onClick={onClick}>
      <div
        className={cn(
          "border-border/60 flex items-center border-b py-3 group-last/setting-item:border-b-0",
          className,
        )}
      >
        {icon && <div className="mr-4 text-sm">{icon}</div>}
        <div className={cn("flex flex-col", contentClassName)}>
          <div className="text-sm">{title}</div>
          {description && (
            <div className="text-muted-foreground/70 mt-0.5 text-xs">{description}</div>
          )}
          {extra && <div className="text-muted-foreground/70 text-[11px]">{extra}</div>}
        </div>
        <div className="ml-auto flex items-center text-sm">{children}</div>
      </div>
    </div>
  );
};

export const SettingItemLabel = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return <span className={cn("text-muted-foreground mb-2 text-sm", className)}>{children}</span>;
};

export const SettingItemGroup = ({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string | ReactNode;
}) => {
  return (
    <div className="flex flex-col">
      {label &&
        (typeof label === "string" ? (
          <span className="text-muted-foreground mb-2 text-sm">{label}</span>
        ) : (
          label
        ))}
      <div className={cn("bg-muted flex flex-col rounded-lg", className)}>{children}</div>
    </div>
  );
};
