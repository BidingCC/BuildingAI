import { cn } from "@buildingai/ui/lib/utils";
import * as React from "react";

type TimeLike = string | number | Date | null | undefined;

const VARIANT_FORMATS = {
  datetime: "YYYY-MM-DD HH:mm:ss",
  date: "YYYY-MM-DD",
  time: "HH:mm:ss",
} as const;

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
   * 预设格式快捷方式
   * - "datetime": YYYY-MM-DD HH:mm:ss
   * - "date": YYYY-MM-DD
   * - "time": HH:mm:ss
   * @default "datetime"
   */
  variant?: keyof typeof VARIANT_FORMATS;
  /**
   * 自定义格式字符串，优先级高于 variant
   * 支持的占位符：
   * - YYYY: 四位年份
   * - MM: 两位月份
   * - DD: 两位日期
   * - HH: 两位小时（24小时制）
   * - mm: 两位分钟
   * - ss: 两位秒
   * @example "YYYY/MM/DD" | "MM-DD HH:mm" | "YYYY年MM月DD日"
   */
  format?: string;
}

function parseToDate(value: TimeLike): Date | null {
  if (value == null) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Try ISO-compatible format first (replace space with T)
    const normalized = trimmed.replace(" ", "T");
    const d = new Date(normalized);
    if (!Number.isNaN(d.getTime())) return d;

    // Fallback to native parsing
    const d2 = new Date(trimmed);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }

  return null;
}

function pad(num: number): string {
  return num < 10 ? `0${num}` : String(num);
}

/**
 * Format date using a format string with placeholders
 */
function formatDate(date: Date, formatStr: string): string {
  const tokens: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };

  return formatStr.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => tokens[match] ?? match);
}

export const TimeText = React.forwardRef<HTMLSpanElement, TimeTextProps>(
  ({ value, fallback = "-", variant = "datetime", format, className, ...props }, ref) => {
    const text = React.useMemo(() => {
      const date = parseToDate(value);
      if (!date) return null;

      const formatStr = format ?? VARIANT_FORMATS[variant];
      return formatDate(date, formatStr);
    }, [value, variant, format]);

    return (
      <span ref={ref} className={cn("tabular-nums", className)} {...props}>
        {text ?? fallback}
      </span>
    );
  },
);

TimeText.displayName = "TimeText";
