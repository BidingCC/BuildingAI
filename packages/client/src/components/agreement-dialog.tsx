import { useAgreementConfigQuery } from "@buildingai/services/web";
import { useI18n } from "@buildingai/i18n";
import { EditorContentRenderer } from "@buildingai/ui/components/editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";

type AgreementType = "service" | "privacy";

type AgreementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: AgreementType;
};

const AgreementDialog = ({ open, onOpenChange, type }: AgreementDialogProps) => {
  const { t } = useI18n();
  const { data, isLoading } = useAgreementConfigQuery();

  const agreement = data?.agreement;
  const serviceTitle = agreement?.serviceTitle || "用户协议";
  const serviceContent = agreement?.serviceContent || "";
  const privacyTitle = agreement?.privacyTitle || "隐私政策";
  const privacyContent = agreement?.privacyContent || "";

  const isService = type === "service";
  const currentTitle = isService ? serviceTitle : privacyTitle;
  const currentContent = isService ? serviceContent : privacyContent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="m-0 flex h-screen max-h-screen w-screen max-w-full! flex-col rounded-none p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{currentTitle}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full px-4 py-4 sm:px-6 sm:py-5">
          <div className="prose dark:prose-invert mx-auto max-w-prose">
            {isLoading && (
              <p className="text-muted-foreground text-xs sm:text-sm">{t("agreement.loadingContent")}</p>
            )}
            <div className="flex items-center justify-center pt-12 pb-6 text-lg font-medium">
              <h2 className="text-3xl font-normal">{currentTitle}</h2>
            </div>

            {!isLoading && currentContent && <EditorContentRenderer value={currentContent} />}

            {!isLoading && !currentContent && (
              <p className="text-muted-foreground text-xs sm:text-sm">
                {isService ? t("agreement.notConfiguredService") : t("agreement.notConfiguredPrivacy")}
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export { AgreementDialog };
export type { AgreementType };
