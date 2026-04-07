import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { cn } from "@buildingai/ui/lib/utils";
import { ArrowUp } from "lucide-react";
import { useCallback, useState } from "react";

export interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload?: (files: File[]) => void;
  onUploadUrl?: (url: string) => void;
}

export function UploadDialog({ open, onOpenChange, onUpload, onUploadUrl }: UploadDialogProps) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [url, setUrl] = useState("");

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

  const handleUploadUrl = useCallback(() => {
    const value = url.trim();
    if (!value) return;
    onUploadUrl?.(value);
    setUrl("");
    onOpenChange(false);
  }, [url, onUploadUrl, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-0 shadow-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dataset.dialogs.upload.title")}</DialogTitle>
          <DialogDescription>{t("dataset.dialogs.upload.supportedFormats")}</DialogDescription>
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
            <div className="text-sm font-semibold">{t("dataset.dialogs.upload.dragOrSelect")}</div>
            <Button variant="ghost" size="sm" asChild>
              <span>{t("dataset.dialogs.upload.selectFiles")}</span>
            </Button>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Input
            placeholder={t("dataset.dialogs.upload.urlPlaceholder")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button variant="outline" onClick={handleUploadUrl} disabled={!url.trim()}>
            {t("dataset.dialogs.upload.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
