import { type UploadFileResult } from "@buildingai/services/shared";
import { cn } from "@buildingai/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Trash2, User } from "lucide-react";
import * as React from "react";

import { Spinner } from "./spinner";
import { useUpload } from "./upload";

const avatarUploadVariants = cva(
  "relative flex cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed transition-all",
  {
    variants: {
      variant: {
        default:
          "border-muted-foreground/25 bg-muted/50 hover:border-muted-foreground/50 hover:bg-muted",
        outline: "border-border bg-background hover:border-ring",
      },
      size: {
        sm: "size-16",
        default: "size-24",
        lg: "size-32",
        xl: "size-40",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface AvatarUploadProps extends VariantProps<typeof avatarUploadVariants> {
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

function AvatarUpload({
  className,
  variant,
  size,
  value,
  defaultValue,
  disabled,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024,
  placeholder,
  onChange,
  onUploadStart,
  onUploadError,
}: AvatarUploadProps) {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue);
  const [isHovering, setIsHovering] = React.useState(false);

  const currentValue = value ?? internalValue;

  const { isUploading, getRootProps, getInputProps } = useUpload({
    multiple: false,
    accept,
    maxSize,
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

  return (
    <div
      data-slot="avatar-upload"
      className={cn(
        avatarUploadVariants({ variant, size }),
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
          <img src={currentValue} alt="Avatar" className="size-full object-cover" />

          {/* Hover overlay */}
          {isHovering && !isUploading && (
            <div
              className="absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-black/50 backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="hover:text-destructive rounded-full p-0 text-white transition-colors"
                onClick={handleClear}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        (placeholder ?? (
          <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1">
            <User className="text-muted-foreground/50 size-2/3" />
          </div>
        ))
      )}

      {/* Loading overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 backdrop-blur">
          <Spinner className="text-white" />
        </div>
      )}
    </div>
  );
}

export { AvatarUpload, avatarUploadVariants };
