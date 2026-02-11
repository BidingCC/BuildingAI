import { type UploadFileResult } from "@buildingai/services/shared";
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
  placeholder?: React.ReactNode;
  onChange?: (url: string | undefined, result?: UploadFileResult) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: Error) => void;
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
  placeholder,
  onChange,
  onUploadStart,
  onUploadError,
}: ImageUploadProps) {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue);
  const [isHovering, setIsHovering] = React.useState(false);

  const currentValue = value ?? internalValue;

  const { isUploading, getRootProps, getInputProps } = useUpload({
    multiple: false,
    accept,
    maxSize,
    maxFiles: 1,
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
      {...(isDisabled ? {} : getRootProps())}
    >
      <input {...getInputProps()} disabled={isDisabled} />

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
              className="bg-destructive text-background absolute top-0.5 right-0.5 z-10 flex size-4 items-center justify-center rounded-full md:hidden"
              onClick={handleClear}
              aria-label="Remove image"
            >
              <X className="size-3 text-white" />
            </button>
          )}

          {/* Desktop: hover overlay with replace and delete actions */}
          {isHovering && !isUploading && (
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
                  const rootProps = getRootProps();
                  rootProps.onClick();
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
