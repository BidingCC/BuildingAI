import {
  uploadFile,
  type UploadFileParams,
  type UploadFileResult,
  uploadFiles,
} from "@buildingai/services/shared";
import { cn } from "@buildingai/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { FileIcon, Loader2, UploadIcon, X } from "lucide-react";
import * as React from "react";

import { Button } from "./button";

// ============================================================================
// Types
// ============================================================================

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  result?: UploadFileResult;
  error?: string;
}

export interface UseUploadOptions {
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  params?: UploadFileParams;
  onUploadStart?: (files: File[]) => void;
  onUploadProgress?: (file: UploadFile) => void;
  onUploadSuccess?: (file: UploadFile, result: UploadFileResult) => void;
  onUploadError?: (file: UploadFile, error: Error) => void;
  onUploadComplete?: (files: UploadFile[]) => void;
  onFilesChange?: (files: UploadFile[]) => void;
}

export interface UseUploadReturn {
  files: UploadFile[];
  isUploading: boolean;
  isDragOver: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  openFileDialog: () => void;
  upload: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  getRootProps: () => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onClick: () => void;
  };
  getInputProps: () => {
    ref: React.RefObject<HTMLInputElement | null>;
    type: "file";
    multiple: boolean;
    accept?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    style: React.CSSProperties;
  };
}

// ============================================================================
// Hook: useUpload
// ============================================================================

/**
 * Headless upload hook that provides all upload logic and state management.
 * Use this hook to build custom upload UI components.
 */
export function useUpload(options: UseUploadOptions = {}): UseUploadReturn {
  const {
    multiple = false,
    accept,
    maxSize,
    maxFiles,
    params,
    onUploadStart,
    onUploadSuccess,
    onUploadError,
    onUploadComplete,
    onFilesChange,
  } = options;

  const [files, setFiles] = React.useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isUploading = files.some((f) => f.status === "uploading");

  const updateFiles = React.useCallback(
    (updater: (prev: UploadFile[]) => UploadFile[]) => {
      setFiles((prev) => {
        const next = updater(prev);
        onFilesChange?.(next);
        return next;
      });
    },
    [onFilesChange],
  );

  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const validateFile = React.useCallback(
    (file: File): string | null => {
      if (maxSize && file.size > maxSize) {
        return `File size exceeds ${formatFileSize(maxSize)}`;
      }
      return null;
    },
    [maxSize],
  );

  const upload = React.useCallback(
    async (newFiles: File[]) => {
      if (newFiles.length === 0) return;

      let filesToUpload = newFiles;
      if (maxFiles) {
        const remainingSlots = maxFiles - files.length;
        filesToUpload = newFiles.slice(0, Math.max(0, remainingSlots));
      }

      if (filesToUpload.length === 0) return;

      // Validate all files first
      const validFiles: File[] = [];
      const uploadFileItems: UploadFile[] = [];

      for (const file of filesToUpload) {
        const uploadFileItem: UploadFile = {
          id: generateId(),
          file,
          status: "idle",
          progress: 0,
        };
        uploadFileItems.push(uploadFileItem);

        const validationError = validateFile(file);
        if (validationError) {
          uploadFileItem.status = "error";
          uploadFileItem.error = validationError;
          onUploadError?.(uploadFileItem, new Error(validationError));
        } else {
          validFiles.push(file);
        }
      }

      updateFiles((prev) => [...prev, ...uploadFileItems]);
      onUploadStart?.(filesToUpload);

      if (validFiles.length === 0) {
        onUploadComplete?.(uploadFileItems);
        return;
      }

      // Set valid files to uploading status
      const validFileIds = uploadFileItems.filter((f) => f.status !== "error").map((f) => f.id);

      updateFiles((prev) =>
        prev.map((f) =>
          validFileIds.includes(f.id) ? { ...f, status: "uploading" as UploadStatus } : f,
        ),
      );

      try {
        // Use batch upload API for multiple files, single upload for one file
        const results =
          validFiles.length === 1
            ? [await uploadFile(validFiles[0]!, params)]
            : await uploadFiles(validFiles, params);

        // Match results with upload file items
        let resultIndex = 0;
        for (const uploadFileItem of uploadFileItems) {
          if (uploadFileItem.status === "error") continue;

          const result = results[resultIndex++];
          if (result) {
            const successFile: UploadFile = {
              ...uploadFileItem,
              status: "success",
              progress: 100,
              result,
            };
            updateFiles((prev) => prev.map((f) => (f.id === uploadFileItem.id ? successFile : f)));
            onUploadSuccess?.(successFile, result);
            uploadFileItem.status = "success";
            uploadFileItem.result = result;
          }
        }
      } catch (err) {
        // If batch upload fails, mark all uploading files as error
        const error = err instanceof Error ? err : new Error("Upload failed");
        for (const uploadFileItem of uploadFileItems) {
          if (uploadFileItem.status === "uploading") {
            const errorFile: UploadFile = {
              ...uploadFileItem,
              status: "error",
              error: error.message,
            };
            updateFiles((prev) => prev.map((f) => (f.id === uploadFileItem.id ? errorFile : f)));
            onUploadError?.(errorFile, error);
            uploadFileItem.status = "error";
            uploadFileItem.error = error.message;
          }
        }
      }

      onUploadComplete?.(uploadFileItems);
    },
    [
      files.length,
      maxFiles,
      params,
      validateFile,
      updateFiles,
      onUploadStart,
      onUploadSuccess,
      onUploadError,
      onUploadComplete,
    ],
  );

  const removeFile = React.useCallback(
    (id: string) => {
      updateFiles((prev) => prev.filter((f) => f.id !== id));
    },
    [updateFiles],
  );

  const clearFiles = React.useCallback(() => {
    updateFiles(() => []);
  }, [updateFiles]);

  const openFileDialog = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (!multiple && droppedFiles.length > 0) {
        upload([droppedFiles[0]!]);
      } else {
        upload(droppedFiles);
      }
    },
    [multiple, upload],
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      upload(selectedFiles);
      e.target.value = "";
    },
    [upload],
  );

  const getRootProps = React.useCallback(
    () => ({
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onClick: openFileDialog,
    }),
    [handleDragOver, handleDragLeave, handleDrop, openFileDialog],
  );

  const getInputProps = React.useCallback(
    () => ({
      ref: inputRef,
      type: "file" as const,
      multiple,
      accept,
      onChange: handleInputChange,
      style: { display: "none" } as React.CSSProperties,
    }),
    [multiple, accept, handleInputChange],
  );

  return {
    files,
    isUploading,
    isDragOver,
    inputRef,
    openFileDialog,
    upload,
    removeFile,
    clearFiles,
    getRootProps,
    getInputProps,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileIcon(_mimeType: string): React.ReactNode {
  return <FileIcon className="size-4" />;
}

// ============================================================================
// Context
// ============================================================================

interface UploadContextValue extends UseUploadReturn {
  disabled?: boolean;
}

const UploadContext = React.createContext<UploadContextValue | null>(null);

function useUploadContext() {
  const context = React.useContext(UploadContext);
  if (!context) {
    throw new Error("Upload components must be used within an UploadRoot");
  }
  return context;
}

// ============================================================================
// Compound Components (Headless)
// ============================================================================

interface UploadRootProps extends UseUploadOptions {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

function UploadRoot({ children, disabled, className, ...options }: UploadRootProps) {
  const upload = useUpload(options);

  return (
    <UploadContext.Provider value={{ ...upload, disabled }}>
      <div data-slot="upload" className={className}>
        {children}
      </div>
    </UploadContext.Provider>
  );
}

interface UploadDropzoneProps {
  children?: React.ReactNode;
  className?: string;
  activeClassName?: string;
  disabledClassName?: string;
}

function UploadDropzone({
  children,
  className,
  activeClassName,
  disabledClassName,
}: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragOver, isUploading, disabled } = useUploadContext();

  const isDisabled = disabled || isUploading;

  return (
    <div
      data-slot="upload-dropzone"
      data-drag-over={isDragOver || undefined}
      data-disabled={isDisabled || undefined}
      className={cn(className, isDragOver && activeClassName, isDisabled && disabledClassName)}
      {...(isDisabled ? {} : getRootProps())}
    >
      <input {...getInputProps()} disabled={isDisabled} />
      {children}
    </div>
  );
}

interface UploadTriggerProps {
  children?: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

function UploadTrigger({ children, className, asChild }: UploadTriggerProps) {
  const { openFileDialog, isUploading, disabled } = useUploadContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => !disabled && !isUploading && openFileDialog(),
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      data-slot="upload-trigger"
      className={className}
      disabled={disabled || isUploading}
      onClick={openFileDialog}
    >
      {children ?? (
        <>
          <UploadIcon className="size-4" />
          Select Files
        </>
      )}
    </Button>
  );
}

interface UploadFileListProps {
  children?: (file: UploadFile, index: number) => React.ReactNode;
  className?: string;
  emptyContent?: React.ReactNode;
}

function UploadFileList({ children, className, emptyContent }: UploadFileListProps) {
  const { files } = useUploadContext();

  if (files.length === 0 && emptyContent) {
    return <>{emptyContent}</>;
  }

  return (
    <div data-slot="upload-file-list" className={className}>
      {files.map((file, index) =>
        children ? children(file, index) : <UploadFileItem key={file.id} file={file} />,
      )}
    </div>
  );
}

interface UploadFileItemProps {
  file: UploadFile;
  children?: React.ReactNode;
  className?: string;
}

function UploadFileItem({ file, children, className }: UploadFileItemProps) {
  const { removeFile } = useUploadContext();

  if (children) {
    return (
      <div data-slot="upload-file-item" data-status={file.status} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div
      data-slot="upload-file-item"
      data-status={file.status}
      className={cn(
        "flex items-center gap-3 rounded-md border p-3",
        file.status === "error" && "border-destructive/50 bg-destructive/5",
        file.status === "success" && "border-green-500/50 bg-green-500/5",
        className,
      )}
    >
      <div className="shrink-0">{getFileIcon(file.file.type)}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.file.name}</p>
        <p className="text-muted-foreground text-xs">
          {formatFileSize(file.file.size)}
          {file.status === "error" && file.error && (
            <span className="text-destructive ml-2">{file.error}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {file.status === "uploading" && <Loader2 className="size-4 animate-spin" />}
        <button
          type="button"
          onClick={() => removeFile(file.id)}
          className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Styled Preset Component
// ============================================================================

const uploadDropzoneVariants = cva(
  "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/30 hover:bg-muted/50",
        outline: "border-border hover:border-ring bg-background",
      },
      size: {
        sm: "min-h-24 gap-1 p-4",
        default: "min-h-40 gap-2 p-6",
        lg: "min-h-60 gap-3 p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface UploadProps extends UseUploadOptions, VariantProps<typeof uploadDropzoneVariants> {
  className?: string;
  dropzoneClassName?: string;
  fileListClassName?: string;
  disabled?: boolean;
  placeholder?: React.ReactNode;
  showFileList?: boolean;
}

/**
 * Pre-styled upload component with sensible defaults.
 * For full customization, use the headless components (UploadRoot, UploadDropzone, etc.)
 */
function Upload({
  className,
  dropzoneClassName,
  fileListClassName,
  disabled,
  variant,
  size,
  placeholder,
  showFileList = true,
  ...options
}: UploadProps) {
  return (
    <UploadRoot disabled={disabled} className={cn("space-y-4", className)} {...options}>
      <UploadDropzone
        className={cn(
          uploadDropzoneVariants({ variant, size }),
          "data-drag-over:border-primary data-drag-over:bg-primary/5",
          "data-disabled:pointer-events-none data-disabled:opacity-50",
          dropzoneClassName,
        )}
      >
        {placeholder ?? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="bg-muted rounded-full p-3">
              <UploadIcon className="text-muted-foreground size-6" />
            </div>
            <div>
              <p className="text-sm font-medium">Drop files here or click to upload</p>
              <p className="text-muted-foreground text-xs">
                {options.accept ? `Accepts: ${options.accept}` : "Supports all file types"}
              </p>
            </div>
          </div>
        )}
      </UploadDropzone>

      {showFileList && <UploadFileList className={cn("space-y-2", fileListClassName)} />}
    </UploadRoot>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  Upload,
  UploadDropzone,
  uploadDropzoneVariants,
  UploadFileItem,
  UploadFileList,
  UploadRoot,
  UploadTrigger,
};

export type { UploadFileParams, UploadFileResult };
