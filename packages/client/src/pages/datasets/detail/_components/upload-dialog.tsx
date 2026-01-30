import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { cn } from "@buildingai/ui/lib/utils";
import { ArrowUp } from "lucide-react";
import { useCallback, useState } from "react";

export interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload?: (files: File[]) => void;
}

export function UploadDialog({ open, onOpenChange, onUpload }: UploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onUpload?.(Array.from(e.dataTransfer.files));
        onOpenChange(false);
      }
    },
    [onUpload, onOpenChange],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onUpload?.(Array.from(e.target.files));
        onOpenChange(false);
      }
    },
    [onUpload, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-0 shadow-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上传文件</DialogTitle>
          <DialogDescription>支持文件、视频、音频、图片等62种格式</DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "rounded-lg p-8 text-center transition-colors",
            isDragging ? "bg-primary/5" : "bg-muted/30 hover:bg-muted/50",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            className="hidden"
            id="file-upload-dialog"
            onChange={handleFileSelect}
            accept="*/*"
          />
          <label
            htmlFor="file-upload-dialog"
            className="flex cursor-pointer flex-col items-center gap-3"
          >
            <div className="bg-muted rounded-full p-4">
              <ArrowUp className="text-muted-foreground size-6" />
            </div>
            <div className="text-sm font-semibold">拖入文件或从本地上传</div>
            <Button variant="ghost" size="sm" asChild>
              <span>选择文件</span>
            </Button>
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
