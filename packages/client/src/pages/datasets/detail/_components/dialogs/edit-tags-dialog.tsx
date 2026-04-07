import type { DatasetsDocument } from "@buildingai/services/web";
import { useBatchAddTagsDatasetsDocuments, useUpdateDocumentTags } from "@buildingai/services/web";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type EditTagsDialogMode = "single" | "batch";

export interface EditTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  mode: EditTagsDialogMode;
  document?: DatasetsDocument | null;
  documentIds?: string[];
  onSuccess?: () => void;
}

function parseTagInput(value: string): string[] {
  return value
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function EditTagsDialog({
  open,
  onOpenChange,
  datasetId,
  mode,
  document,
  documentIds = [],
  onSuccess,
}: EditTagsDialogProps) {
  const { t } = useI18n();
  const isSingle = mode === "single";
  const initialTags = isSingle ? (document?.tags ?? []).filter(Boolean) : [];
  const [tags, setTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState("");

  const updateTagsMutation = useUpdateDocumentTags(datasetId);
  const batchAddTagsMutation = useBatchAddTagsDatasetsDocuments(datasetId);

  useEffect(() => {
    if (open) {
      setTags(isSingle ? (document?.tags ?? []).filter(Boolean) : []);
      setInputValue("");
    }
  }, [open, isSingle, document?.tags, document?.id]);

  const addFromInput = useCallback(() => {
    const next = parseTagInput(inputValue);
    if (next.length === 0) return;
    setTags((prev) => [...prev, ...next].filter((v, i, a) => a.indexOf(v) === i));
    setInputValue("");
  }, [inputValue]);

  const removeTag = useCallback((index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addFromInput();
      }
    },
    [addFromInput],
  );

  const handleSubmit = useCallback(() => {
    if (!datasetId) return;
    if (isSingle && document?.id) {
      updateTagsMutation.mutate(
        { documentId: document.id, tags },
        {
          onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
          },
        },
      );
    } else if (!isSingle && documentIds.length > 0) {
      if (tags.length === 0) {
        onOpenChange(false);
        return;
      }
      batchAddTagsMutation.mutate(
        { documentIds, tags },
        {
          onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
          },
        },
      );
    }
  }, [
    datasetId,
    isSingle,
    document?.id,
    documentIds,
    tags,
    updateTagsMutation,
    batchAddTagsMutation,
    onOpenChange,
    onSuccess,
  ]);

  const pending = updateTagsMutation.isPending || batchAddTagsMutation.isPending;
  const canSubmit = isSingle ? true : tags.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSingle
              ? t("dataset.dialogs.editTags.title")
              : t("dataset.dialogs.editTags.batchTitle")}
          </DialogTitle>
          <DialogDescription>
            {isSingle
              ? t("dataset.dialogs.editTags.singleDesc")
              : t("dataset.dialogs.editTags.batchDesc", { count: documentIds.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex min-h-10 flex-wrap gap-2 rounded-md border p-2">
            {tags.map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="secondary" className="gap-1 py-0.5 pr-1 pl-2">
                {tag}
                <button
                  type="button"
                  className="hover:bg-muted rounded-full p-0.5"
                  onClick={() => removeTag(index)}
                  aria-label={`移除 ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("dataset.dialogs.editTags.inputHint")}
              className="h-7 min-w-[120px] flex-1 border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addFromInput}>
            {t("dataset.dialogs.editTags.add")}
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("dataset.dialogs.editTags.cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending || !canSubmit}>
            {pending
              ? t("dataset.dialogs.editTags.submitting")
              : t("dataset.dialogs.editTags.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
