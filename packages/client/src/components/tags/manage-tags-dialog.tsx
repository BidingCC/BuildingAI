import type { TagTypeType } from "@buildingai/constants";
import {
  type ConsoleTag,
  useConsoleTagsQuery,
  useCreateConsoleTagMutation,
  useDeleteConsoleTagMutation,
  useUpdateConsoleTagMutation,
} from "@buildingai/services/console";
import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface ManageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TagTypeType;
  onClose?: () => void;
}

export function ManageTagsDialog({ open, onOpenChange, type, onClose }: ManageTagsDialogProps) {
  const { t } = useI18n();
  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const { confirm } = useAlertDialog();

  const { data: tags = [], refetch } = useConsoleTagsQuery(type, { enabled: open });
  const createMutation = useCreateConsoleTagMutation(type);
  const updateMutation = useUpdateConsoleTagMutation();
  const deleteMutation = useDeleteConsoleTagMutation();

  const handleAdd = useCallback(() => {
    const name = newTagName.trim();
    if (!name) return;
    createMutation.mutate(
      { name },
      {
        onSuccess: () => {
          setNewTagName("");
          refetch();
          toast.success(t("common.tags.added"));
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }, [newTagName, createMutation, refetch]);

  const startEdit = useCallback((tag: ConsoleTag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
  }, []);

  const submitEdit = useCallback(
    (id: string) => {
      const name = editName.trim();
      if (!name) return;
      updateMutation.mutate(
        { id, name },
        {
          onSuccess: () => {
            setEditingId(null);
            setEditName("");
            refetch();
            toast.success(t("tags.updated"));
          },
          onError: (e) => toast.error(e.message),
        },
      );
    },
    [editName, updateMutation, refetch],
  );

  const handleDelete = useCallback(
    async (tag: ConsoleTag) => {
      try {
        await confirm({
          title: t("common.tags.deleteTitle"),
          description: t("common.tags.deleteConfirm"),
          confirmText: t("action.delete"),
          confirmVariant: "destructive",
        });
      } catch {
        return;
      }
      deleteMutation.mutate(tag.id, {
        onSuccess: () => {
          refetch();
          toast.success(t("common.tags.deleted"));
        },
        onError: (e) => toast.error(e.message),
      });
    },
    [confirm, deleteMutation, refetch],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setEditingId(null);
        setNewTagName("");
        onClose?.();
      }
      onOpenChange(next);
    },
    [onOpenChange, onClose],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("common.tags.manageTags")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder={t("common.tags.newTagName")}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleAdd}
              disabled={!newTagName.trim() || createMutation.isPending}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="flex max-h-60 flex-wrap gap-2 overflow-y-auto rounded-md border p-2">
            {tags.length === 0 ? (
              <p className="text-muted-foreground w-full py-4 text-center text-sm">{t("common.tags.noTags")}</p>
            ) : (
              tags.map((tag) =>
                editingId === tag.id ? (
                  <div key={tag.id} className="flex items-center gap-1">
                    <Input
                      className="h-8 w-32"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitEdit(tag.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => submitEdit(tag.id)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div
                    key={tag.id}
                    className="border-input bg-muted/30 flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                  >
                    <span>{tag.name}</span>
                    {tag.bindingCount != null && (
                      <span className="text-muted-foreground text-xs">{tag.bindingCount}</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => startEdit(tag)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-6"
                      onClick={() => handleDelete(tag)}
                      disabled={(tag.bindingCount ?? 0) > 0}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ),
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
