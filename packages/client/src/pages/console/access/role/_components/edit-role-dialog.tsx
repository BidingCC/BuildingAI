import { useI18n } from "@buildingai/i18n";
import type { RoleEntity } from "@buildingai/services/console";
import { useCreateRoleMutation, useUpdateRoleMutation } from "@buildingai/services/console";
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
import { Label } from "@buildingai/ui/components/ui/label";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  role?: RoleEntity | null;
}

/**
 * 创建角色弹框组件
 */
export const EditRoleDialog = ({ open, onOpenChange, onSuccess, role }: CreateRoleDialogProps) => {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const isEdit = useMemo(() => !!role?.id, [role?.id]);

  const createMutation = useCreateRoleMutation({
    onSuccess: () => {
      toast.success(t("access.role.toast.createSuccess"));
      handleClose();
      onSuccess?.();
    },
  });

  const updateMutation = useUpdateRoleMutation({
    onSuccess: () => {
      toast.success(t("access.role.toast.updateSuccess"));
      handleClose();
      onSuccess?.();
    },
  });

  useEffect(() => {
    if (!open) return;

    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
  }, [open, role?.id, role?.name, role?.description]);

  const handleClose = () => {
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t("access.role.validation.nameRequired"));
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
    };

    if (isEdit && role?.id) {
      updateMutation.mutate({
        id: role.id,
        ...payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("access.menu.form.editTitle") : t("access.menu.form.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? t("access.role.form.editDescription")
                : t("access.role.form.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                <span className="text-destructive">*</span>
                {t("access.role.form.name")}
              </Label>
              <Input
                id="name"
                placeholder={t("access.role.form.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t("access.role.form.description")}</Label>
              <Textarea
                id="description"
                placeholder={t("access.role.form.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("access.menu.form.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? t("access.menu.form.saving")
                  : t("access.role.form.creating")
                : t("access.menu.form.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
