import { useCallback, useEffect, useRef } from "react";

export interface ViewportSlackProps {
  children: React.ReactNode;
  isLast?: boolean;
  getViewportHeight?: () => number;
  getBottomAreaHeight?: () => number;
  fillClampThreshold?: string;
  fillClampOffset?: string;
}

const parseCssLength = (value: string, element: HTMLElement): number => {
  const match = value.match(/^([\d.]+)(em|px|rem)$/);
  if (!match) return 0;

  const num = parseFloat(match[1]!);
  const unit = match[2];

  if (unit === "px") return num;
  if (unit === "em") {
    const fontSize = parseFloat(getComputedStyle(element).fontSize) || 16;
    return num * fontSize;
  }
  if (unit === "rem") {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return num * rootFontSize;
  }
  return 0;
};

export const ViewportSlack = ({
  children,
  isLast = false,
  getViewportHeight,
  getBottomAreaHeight,
  fillClampThreshold = "10em",
  fillClampOffset = "6em",
}: ViewportSlackProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const updateMinHeight = useCallback(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    if (!isLast) {
      el.style.minHeight = "";
      el.style.flexShrink = "";
      el.style.transition = "";
      return;
    }

    const viewportHeight = getViewportHeight?.() ?? window.innerHeight;
    const bottomAreaHeight = getBottomAreaHeight?.() ?? 0;

    if (viewportHeight > 0 && bottomAreaHeight > 0) {
      const offset = parseCssLength(fillClampOffset, el);
      const clampAdjustment = offset;

      const minHeight = Math.max(0, viewportHeight - bottomAreaHeight - clampAdjustment);
      el.style.minHeight = `${minHeight}px`;
      el.style.flexShrink = "0";
      el.style.transition = "min-height 0s";
    } else {
      el.style.minHeight = "";
      el.style.flexShrink = "";
      el.style.transition = "";
    }
  }, [isLast, getViewportHeight, getBottomAreaHeight, fillClampThreshold, fillClampOffset]);

  useEffect(() => {
    updateMinHeight();

    if (!isLast) return;

    let rafId: number;
    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateMinHeight);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isLast, updateMinHeight]);

  return <div ref={ref}>{children}</div>;
};
