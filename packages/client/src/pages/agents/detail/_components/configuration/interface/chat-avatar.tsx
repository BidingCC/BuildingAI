import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
  UploadDropzone,
  UploadInput,
  UploadRoot,
  useUploadField,
} from "@buildingai/ui/components/upload";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { memo, useCallback } from "react";

const AvatarPreview = memo(({ url, onClear }: { url: string; onClear: () => void }) => {
  const { openFileDialog, clearFiles } = useUploadField();
  const handleDelete = useCallback(() => {
    clearFiles();
    onClear();
  }, [clearFiles, onClear]);

  return (
    <div className="relative h-24 w-24 shrink-0 rounded-lg">
      <img src={url} alt="" className="h-full w-full rounded-lg object-cover" />
      <div className="absolute right-[-10px] bottom-0 flex flex-col gap-0.5">
        <Button
          type="button"
          size="icon-xs"
          variant="default"
          onClick={(e) => {
            e.stopPropagation();
            openFileDialog();
          }}
          aria-label={t("agent.detail.interface.replaceImage")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="default"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          aria-label={t("agent.detail.interface.deleteImage")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});
AvatarPreview.displayName = "AvatarPreview";

export const ChatAvatar = memo(
  ({
    value,
    enabled,
    onChange,
    onEnabledChange,
  }: {
    value: string;
    enabled: boolean;
    onChange: (value: string) => void;
    onEnabledChange: (enabled: boolean) => void;
  }) => {
    const { t } = useI18n();
    const handleToggle = useCallback(
      (checked: boolean) => {
        onEnabledChange(checked);
        if (!checked) onChange("");
      },
      [onChange, onEnabledChange],
    );

    return (
      <div className="bg-secondary rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">{t("agent.detail.interface.chatAvatar")}</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("agent.detail.interface.chatAvatarDesc")}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>

        {enabled && (
          <div className="mt-3">
            <UploadRoot
              accept="image/*"
              maxFiles={1}
              onUploadSuccess={(_file, result) => onChange(result.url)}
              onUploadError={(_file, error) => {
                console.error("[ChatAvatar] Upload failed:", error);
              }}
            >
              <UploadInput />
              {value ? (
                <AvatarPreview url={value} onClear={() => onChange("")} />
              ) : (
                <UploadDropzone className="border-muted-foreground/40 flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors">
                  <Plus className="text-muted-foreground h-5 w-5" />
                  <span className="text-muted-foreground text-xs">
                    {t("agent.detail.interface.addImage")}
                  </span>
                </UploadDropzone>
              )}
            </UploadRoot>
          </div>
        )}
      </div>
    );
  },
);

ChatAvatar.displayName = "ChatAvatar";
