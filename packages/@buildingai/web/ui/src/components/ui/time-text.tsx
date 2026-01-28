import { cn } from "@buildingai/ui/lib/utils";
import * as React from "react";

type TimeLike = string | number | Date | null | undefined;

export interface TimeTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * 原始时间值，支持：
   * - 数据库时间字符串（如 "2025-01-01 12:30:00" 或 ISO 字符串）
   * - 时间戳（毫秒）
   * - Date 实例
   */
  value: TimeLike;
  /**
   * 当解析失败或没有值时显示的占位内容
   * @default "-"
   */
  fallback?: React.ReactNode;
  /**
   * 输出格式
   * - "datetime": YYYY-MM-DD HH:mm:ss
   * - "date": YYYY-MM-DD
   * - "time": HH:mm:ss
   * @default "datetime"
   */
  variant?: "datetime" | "date" | "time";
}

function parseToDate(value: TimeLike): Date | null {
  if (value == null) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // 字符串情况：兼容常见的数据库时间格式
  if (typeof value === "string") {
    if (!value.trim()) return null;

    // 如果是 "YYYY-MM-DD HH:mm:ss" 之类，转成 ISO 兼容格式
    const normalized = value.replace(" ", "T");
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;

    const d2 = new Date(value);
    return isNaN(d2.getTime()) ? null : d2;
  }

  return null;
}

function pad(num: number): string {
  return num < 10 ? `0${num}` : String(num);
}

function formatDate(date: Date, variant: NonNullable<TimeTextProps["variant"]>): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  if (variant === "date") {
    return `${year}-${month}-${day}`;
  }

  if (variant === "time") {
    return `${hours}:${minutes}:${seconds}`;
  }

  // datetime
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export const TimeText = React.forwardRef<HTMLSpanElement, TimeTextProps>(
  ({ value, fallback = "-", variant = "datetime", className, ...props }, ref) => {
    const date = parseToDate(value);

    const text = date ? formatDate(date, variant) : fallback;

    return (
      <span ref={ref} className={cn("tabular-nums", className)} {...props}>
        {text}
      </span>
    );
  },
);

TimeText.displayName = "TimeText";
