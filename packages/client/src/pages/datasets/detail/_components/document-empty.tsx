import { useI18n } from "@buildingai/i18n";
import { Upload } from "lucide-react";

interface DocumentEmptyProps {
  canUpload?: boolean;
}

export function DocumentEmpty({ canUpload }: DocumentEmptyProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
      <div className="bg-muted rounded-full p-4">
        <Upload className="text-muted-foreground size-8" />
      </div>
      <p className="text-muted-foreground text-sm">
        {canUpload ? t("dataset.document.clickToUpload") : t("dataset.document.noDocuments")}
      </p>
    </div>
  );
}
