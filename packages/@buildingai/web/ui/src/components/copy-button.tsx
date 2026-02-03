"use client";

import { cn } from "@buildingai/ui/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { Check, Copy } from "lucide-react";
import * as React from "react";

import { Button, type buttonVariants } from "./ui/button";

type CopyButtonProps = Omit<React.ComponentProps<"button">, "onClick"> &
  VariantProps<typeof buttonVariants> & {
    value: string;
    onCopy?: (value: string) => void;
    onCopyError?: (error: Error) => void;
    timeout?: number;
    iconClassName?: string;
  };

/**
 * A button component that copies text to clipboard with visual feedback.
 * Inherits all Button props for full customization.
 */
function CopyButton({
  value,
  onCopy,
  onCopyError,
  timeout = 2000,
  className,
  iconClassName,
  variant = "ghost",
  size = "icon-sm",
  children,
  ...props
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = React.useCallback(async () => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      onCopy?.(value);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, timeout);
    } catch (error) {
      onCopyError?.(error instanceof Error ? error : new Error("Failed to copy"));
    }
  }, [value, timeout, onCopy, onCopyError]);

  const IconComponent = isCopied ? Check : Copy;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleCopy}
      {...props}
    >
      {children ?? <IconComponent className={cn("size-4", iconClassName)} />}
    </Button>
  );
}

export { CopyButton };
export type { CopyButtonProps };
