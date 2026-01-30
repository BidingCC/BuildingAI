import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Loader2, Pencil, UploadIcon, X } from "lucide-react";
import { useEffect, useState } from "react";

export interface DatasetEditFormValues {
  name: string;
  coverUrl?: string;
  description: string;
}

export interface DatasetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValues?: Partial<DatasetEditFormValues>;
  onSubmit?: (values: DatasetEditFormValues) => void;
}

export function DatasetEditDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
}: DatasetEditDialogProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [coverUrl, setCoverUrl] = useState<string | undefined>(initialValues?.coverUrl);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? "");
      setDescription(initialValues?.description ?? "");
      setCoverUrl(initialValues?.coverUrl);
    }
  }, [open, initialValues?.name, initialValues?.description, initialValues?.coverUrl]);

  const handleConfirm = () => {
    onSubmit?.({ name, coverUrl, description });
    onOpenChange(false);
  };

  const hasCover = Boolean(coverUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{mode === "create" ? "创建知识库" : "修改知识库"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-4 pt-6 pb-4">
          <div className="space-y-2">
            <Label htmlFor="dataset-name">
              <span className="text-destructive">*</span>名称:
            </Label>
            <InputGroup>
              <InputGroupInput
                id="dataset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入知识库名称"
              />
              {name.length > 0 && (
                <InputGroupAddon align="inline-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setName("")}
                  >
                    <X className="size-4" />
                  </Button>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>

          <div className="space-y-2">
            <Label>封面:</Label>
            <UploadRoot
              accept="image/*"
              maxFiles={1}
              onUploadStart={() => setIsCoverUploading(true)}
              onUploadSuccess={(_, result) => {
                setCoverUrl(result.url);
                setIsCoverUploading(false);
              }}
              onUploadError={() => setIsCoverUploading(false)}
              onUploadComplete={() => setIsCoverUploading(false)}
              onFilesChange={(files) => {
                if (files.length === 0) setCoverUrl(undefined);
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
                      {isCoverUploading ? (
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
                    {isCoverUploading && (
                      <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
                        <Loader2 className="size-6 animate-spin" />
                      </div>
                    )}
                    <UploadTrigger asChild>
                      <button
                        type="button"
                        className="bg-muted/90 text-muted-foreground hover:bg-muted hover:text-foreground absolute right-0 bottom-0 z-10 flex size-8 items-center justify-center rounded-tl-md transition-colors"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </UploadTrigger>
                  </>
                )}
              </div>
            </UploadRoot>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataset-desc">描述:</Label>
            <Textarea
              id="dataset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="为你的知识库填写描述"
              className="min-h-24 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>确定</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
