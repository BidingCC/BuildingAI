"use client";

import { useI18n } from "@buildingai/i18n";
import { useCreateConsoleTagMutation } from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export type AddTagDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function AddTagDialog({ open, onOpenChange, onSuccess }: AddTagDialogProps) {
  const { t } = useI18n();
  const [tagName, setTagName] = useState("");
  const createMutation = useCreateConsoleTagMutation("app-center" as any, {
    onSuccess: () => {
      toast.success(t("decorate.apps.addTag.createSuccess"));
      setTagName("");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(
        t("decorate.apps.addTag.createFailed", { message: error.message || "Unknown error" }),
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = tagName.trim();
    if (!name) {
      toast.error(t("decorate.apps.addTag.nameRequired"));
      return;
    }
    createMutation.mutate({ name });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-md flex-col">
        <DialogHeader>
          <DialogTitle>{t("decorate.apps.addTag.title")}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-5 py-2" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="tag-name">{t("decorate.apps.addTag.name")}</Label>
            <Input
              id="tag-name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder={t("decorate.apps.addTag.namePlaceholder")}
              disabled={createMutation.isPending}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTagName("");
                onOpenChange(false);
              }}
              disabled={createMutation.isPending}
            >
              {t("decorate.apps.addTag.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !tagName.trim()}>
              {createMutation.isPending
                ? t("decorate.apps.addTag.creating")
                : t("decorate.apps.addTag.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
