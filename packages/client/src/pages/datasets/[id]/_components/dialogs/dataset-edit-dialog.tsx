import { createEmptyDataset, updateDataset } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { Label } from "@buildingai/ui/components/ui/label";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { UploadDropzone, UploadRoot, UploadTrigger } from "@buildingai/ui/components/ui/upload";
import { cn } from "@buildingai/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, UploadIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { DatasetEditFormValues } from "../../types";

export interface DatasetEditDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<DatasetEditFormValues>;
  onSuccess?: () => void;
}

const defaultForm: DatasetEditFormValues = {
  name: "",
  description: "",
};

export function DatasetEditDialog({
  mode,
  open,
  onOpenChange,
  initialValues,
  onSuccess,
}: DatasetEditDialogProps) {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<DatasetEditFormValues>(defaultForm);
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initialValues?.name ?? "",
        description: initialValues?.description ?? "",
      });
      setCoverUrl(initialValues?.coverUrl);
    }
  }, [open, initialValues?.name, initialValues?.description, initialValues?.coverUrl]);

  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      coverUrl,
    };

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const dataset = await createEmptyDataset(payload);
        onOpenChange(false);
        onSuccess?.();
        await navigate(`/datasets/${dataset.id}`);
      } else if (routeId) {
        await updateDataset(routeId, payload);
        onOpenChange(false);
        queryClient.invalidateQueries({ queryKey: ["datasets", routeId] });
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel = mode === "create" ? "创建中..." : "保存中...";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{mode === "create" ? "创建知识库" : "修改知识库"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-4 pt-6 pb-4">
          <FormField label="名称" required>
            <InputGroup>
              <InputGroupInput
                id="dataset-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="请输入知识库名称"
              />
              {form.name.length > 0 && (
                <InputGroupAddon align="inline-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setForm((p) => ({ ...p, name: "" }))}
                  >
                    <X className="size-4" />
                  </Button>
                </InputGroupAddon>
              )}
            </InputGroup>
          </FormField>

          <FormField label="封面">
            <CoverUpload
              coverUrl={coverUrl}
              isUploading={isCoverUploading}
              onUploadStart={() => setIsCoverUploading(true)}
              onUploadSuccess={(url) => {
                setCoverUrl(url);
                setIsCoverUploading(false);
              }}
              onUploadError={() => setIsCoverUploading(false)}
              onClear={() => setCoverUrl(undefined)}
            />
          </FormField>

          <FormField label="描述">
            <Textarea
              id="dataset-desc"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="为你的知识库填写描述"
              className="min-h-24 resize-none"
            />
          </FormField>
        </div>

        <DialogFooter className="px-4 py-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              取消
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {submitLabel}
              </>
            ) : (
              "确定"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {required && <span className="text-destructive">*</span>}
        {label}:
      </Label>
      {children}
    </div>
  );
}

function CoverUpload({
  coverUrl,
  isUploading,
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  onClear,
}: {
  coverUrl?: string;
  isUploading: boolean;
  onUploadStart: () => void;
  onUploadSuccess: (url: string) => void;
  onUploadError: () => void;
  onClear: () => void;
}) {
  const hasCover = Boolean(coverUrl);

  return (
    <UploadRoot
      accept="image/*"
      maxFiles={1}
      onUploadStart={onUploadStart}
      onUploadSuccess={(_, result) => onUploadSuccess(result.url)}
      onUploadError={onUploadError}
      onUploadComplete={onUploadError}
      onFilesChange={(files) => {
        if (files.length === 0) onClear();
      }}
    >
      <div className="bg-muted/30 relative size-24 shrink-0 overflow-hidden rounded-lg border">
        <UploadDropzone
          className={cn(
            "bg-muted/30 hover:bg-muted/50 absolute inset-0 cursor-pointer border-0 border-dashed",
            hasCover && "pointer-events-none z-0 opacity-0",
          )}
        >
          {!hasCover && (
            <div className="flex size-full flex-col items-center justify-center gap-1">
              {isUploading ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <UploadIcon className="text-muted-foreground size-6" />
              )}
              <span className="text-muted-foreground text-xs">上传封面</span>
            </div>
          )}
        </UploadDropzone>

        {hasCover && (
          <>
            <img src={coverUrl} alt="" className="size-full object-cover" />
            {isUploading && (
              <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )}
            <UploadTrigger asChild>
              <button
                type="button"
                className="bg-muted/90 text-muted-foreground hover:bg-muted hover:text-foreground absolute right-0 bottom-0 z-10 flex size-8 items-center justify-center rounded-tl-md"
              >
                <Pencil className="size-4" />
              </button>
            </UploadTrigger>
          </>
        )}
      </div>
    </UploadRoot>
  );
}
