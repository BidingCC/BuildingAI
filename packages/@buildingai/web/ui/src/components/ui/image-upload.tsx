import {
  type UploadFileParams,
  type UploadFileResult,
  uploadInitFile,
} from "@buildingai/services/shared";
import { useConfigStore } from "@buildingai/stores";
import { cn } from "@buildingai/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ImagePlus, RotateCw, Trash2, X } from "lucide-react";
import * as React from "react";

import { useUpload } from "../upload";
import { Button } from "./button";
import { Spinner } from "./spinner";

const imageUploadVariants = cva(
  "relative flex cursor-pointer items-center justify-center  border border-dashed transition-all aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 aria-invalid:ring-[3px]",
  {
    variants: {
      variant: {
        default: "border-muted-foreground/25 bg-muted/50 hover:bg-muted",
        outline: "border-border bg-background",
      },
      size: {
        sm: "size-16",
        default: "size-20",
        lg: "size-24",
        xl: "size-32",
      },
      shape: {
        circle: "rounded-full",
        rounded: "rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "rounded",
    },
  },
);

export interface ImageUploadProps extends VariantProps<typeof imageUploadVariants> {
  className?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  accept?: string;
  maxSize?: number;
  params?: UploadFileParams;
  placeholder?: React.ReactNode;
  onChange?: (url: string | undefined, result?: UploadFileResult) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: Error) => void;
  /** Force mobile-style UI on desktop (persistent delete button + tap to reupload) */
  forceMobile?: boolean;
}

function ImageUpload({
  className,
  variant,
  size,
  shape,
  value,
  defaultValue,
  disabled,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024,
  params,
  placeholder,
  onChange,
  onUploadStart,
  onUploadError,
  forceMobile = false,
}: ImageUploadProps) {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue);
  const [isHovering, setIsHovering] = React.useState(false);
  const [isInitUploading, setIsInitUploading] = React.useState(false);
  const initInputRef = React.useRef<HTMLInputElement>(null);
  const isInitialized = useConfigStore((s) => s.config.isInitialized);

  const currentValue = value ?? internalValue;

  const {
    isUploading: isNormalUploading,
    getRootProps,
    getInputProps,
  } = useUpload({
    multiple: false,
    accept,
    maxSize,
    maxFiles: 1,
    params,
    onUploadStart: () => onUploadStart?.(),
    onUploadSuccess: (file, result) => {
      const url = result.url;
      setInternalValue(url);
      onChange?.(url, result);
    },
    onUploadError: (file, error) => {
      onUploadError?.(error);
    },
  });

  /**
   * Handle file upload during system initialization (no auth required)
   */
  const handleInitUpload = React.useCallback(
    async (file: File) => {
      if (maxSize && file.size > maxSize) {
        onUploadError?.(new Error(`File size exceeds ${maxSize} bytes`));
        return;
      }
      try {
        setIsInitUploading(true);
        onUploadStart?.();
        const result = await uploadInitFile(file, params);
        setInternalValue(result.url);
        onChange?.(result.url, result);
      } catch (err) {
        onUploadError?.(err instanceof Error ? err : new Error("Upload failed"));
      } finally {
        setIsInitUploading(false);
      }
    },
    [maxSize, onChange, onUploadStart, onUploadError, params],
  );

  const handleInitInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleInitUpload(file);
      e.target.value = "";
    },
    [handleInitUpload],
  );

  const isUploading = isInitialized === false ? isInitUploading : isNormalUploading;

  const resolvedRootProps = React.useMemo(() => {
    if (isInitialized === false) {
      return {
        onClick: () => initInputRef.current?.click(),
      };
    }
    return getRootProps();
  }, [isInitialized, getRootProps]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalValue(undefined);
    onChange?.(undefined);
  };

  const isDisabled = disabled || isUploading;
  const resolvedShape = shape ?? "rounded";

  return (
    <div
      data-slot="image-upload"
      className={cn(
        imageUploadVariants({ variant, size, shape }),
        currentValue && "border-solid border-transparent",
        isDisabled && "pointer-events-none opacity-50",
        className,
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...(isDisabled ? {} : resolvedRootProps)}
    >
      {isInitialized === false ? (
        <input
          ref={initInputRef}
          type="file"
          accept={accept}
          style={{ display: "none" }}
          onChange={handleInitInputChange}
          disabled={isDisabled}
        />
      ) : (
        <input {...getInputProps()} disabled={isDisabled} />
      )}

      {currentValue ? (
        <>
          <img
            src={currentValue}
            alt=""
            className={cn(
              "size-full object-cover",
              resolvedShape === "circle" ? "rounded-full" : "rounded-lg",
            )}
          />

          {/* Mobile: persistent close button at top-right, tap body to re-upload */}
          {!isUploading && (
            <button
              type="button"
              className={cn(
                "bg-destructive text-background absolute top-0.5 right-0.5 z-10 size-4 items-center justify-center rounded-full",
                forceMobile ? "flex" : "flex md:hidden",
              )}
              onClick={handleClear}
              aria-label="Remove image"
            >
              <X className="size-3 text-white" />
            </button>
          )}

          {/* Desktop: hover overlay with replace and delete actions */}
          {isHovering && !isUploading && !forceMobile && (
            <div
              className={cn(
                "absolute inset-0 hidden items-center justify-center gap-1 bg-black/50 md:flex",
                resolvedShape === "circle" ? "rounded-full" : "rounded-lg",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20! hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  resolvedRootProps.onClick();
                }}
                aria-label="Replace image"
              >
                <RotateCw className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="hover:text-destructive hover:bg-destructive/20! rounded-full p-1.5 text-white/80 transition-colors"
                onClick={handleClear}
                aria-label="Remove image"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        (placeholder ?? (
          <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1">
            <ImagePlus className="size-1/3 opacity-50" />
          </div>
        ))
      )}

      {/* Loading overlay */}
      {isUploading && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/30",
            resolvedShape === "circle" ? "rounded-full" : "rounded-lg",
          )}
        >
          <Spinner className="text-white" />
        </div>
      )}
    </div>
  );
}

export { ImageUpload, imageUploadVariants };
