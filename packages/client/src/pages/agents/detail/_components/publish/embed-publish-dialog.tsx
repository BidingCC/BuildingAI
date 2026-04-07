import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Copy } from "lucide-react";
import { useMemo, useState } from "react";

function getEmbedModes(t: ReturnType<typeof useI18n>["t"]) {
  return [
    {
      value: "inline",
      title: t("agent.detail.embed.pageEmbed"),
      description: t("agent.detail.embed.pageEmbedDesc"),
    },
    {
      value: "float-desktop",
      title: t("agent.detail.embed.desktopFloat"),
      description: t("agent.detail.embed.desktopFloatDesc"),
    },
    {
      value: "float-mobile",
      title: t("agent.detail.embed.mobileFloat"),
      description: t("agent.detail.embed.mobileFloatDesc"),
    },
  ] as const;
}

type EmbedMode = (typeof EMBED_MODES)[number]["value"];

interface EmbedPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  publicLink: string;
  iframeCode: string;
  floatingScriptCode: string;
  mobileScriptCode: string;
  onPublish: () => void;
  onCopy: (value: string, successMessage: string) => void | Promise<void>;
}

function PreviewCard({ selected, mode }: { selected: boolean; mode: EmbedMode }) {
  const isInline = mode === "inline";
  const isDesktop = mode === "float-desktop";

  return (
    <div
      className={`relative h-31 overflow-hidden rounded-2xl border bg-[#F7F8FA] p-3 transition-all ${
        selected ? "border-[#4F7CFF] ring-1 ring-[#4F7CFF]/20" : "border-transparent"
      }`}
    >
      <div className="space-y-1">
        <div className="h-1.5 w-8 rounded-full bg-[#D8DCE5]" />
        <div className="h-1.5 w-14 rounded-full bg-[#E4E7EE]" />
      </div>

      {isInline ? (
        <div className="mt-4 flex h-[78px] items-start justify-center">
          <div className="h-full w-[82%] rounded-xl border border-[#B8C9FF] bg-white p-3 shadow-[0_6px_18px_rgba(79,124,255,0.12)]">
            <div className="mb-2 flex items-center gap-2">
              <div className="size-5 rounded-full bg-[#CFE0FF]" />
              <div className="h-2 w-18 rounded-full bg-[#E7EBF3]" />
            </div>
            <div className="space-y-1">
              <div className="h-2 w-full rounded-full bg-[#EEF1F6]" />
              <div className="h-2 w-3/4 rounded-full bg-[#EEF1F6]" />
            </div>
          </div>
        </div>
      ) : null}

      {isDesktop ? (
        <div className="relative mt-4 h-[78px]">
          <div className="absolute right-3 bottom-2 h-16 w-20 rounded-xl border border-[#B8C9FF] bg-white p-2 shadow-[0_6px_18px_rgba(79,124,255,0.16)]">
            <div className="mb-2 flex items-center gap-1.5">
              <div className="size-4 rounded-full bg-[#CFE0FF]" />
              <div className="h-1.5 w-10 rounded-full bg-[#E7EBF3]" />
            </div>
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-[#EEF1F6]" />
              <div className="h-1.5 w-2/3 rounded-full bg-[#EEF1F6]" />
            </div>
          </div>
          <div className="absolute right-1 bottom-0 flex size-4 items-center justify-center rounded-full bg-[#4F7CFF] text-white shadow-sm">
            <div className="size-1.5 rounded-full bg-white" />
          </div>
        </div>
      ) : null}

      {mode === "float-mobile" ? (
        <div className="relative mt-3 flex h-[82px] items-start justify-end">
          <div className="mr-4 h-[76px] w-[46px] rounded-[12px] border border-[#B8C9FF] bg-white p-1.5 shadow-[0_6px_18px_rgba(79,124,255,0.16)]">
            <div className="mb-1.5 flex items-center gap-1">
              <div className="size-3 rounded-full bg-[#CFE0FF]" />
              <div className="h-1.5 w-5 rounded-full bg-[#E7EBF3]" />
            </div>
            <div className="space-y-1">
              <div className="h-1 w-full rounded-full bg-[#EEF1F6]" />
              <div className="h-1 w-2/3 rounded-full bg-[#EEF1F6]" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * JS 嵌入发布弹框，按原型展示嵌入方式选择和对应代码。
 */
export function EmbedPublishDialog({
  open,
  onOpenChange,
  isPending,
  publicLink,
  iframeCode,
  floatingScriptCode,
  mobileScriptCode,
  onPublish,
  onCopy,
}: EmbedPublishDialogProps) {
  const { t } = useI18n();
  const embedModes = getEmbedModes(t);
  const [selectedMode, setSelectedMode] = useState<EmbedMode>("inline");

  const currentCode = useMemo(() => {
    if (selectedMode === "float-desktop") return floatingScriptCode;
    if (selectedMode === "float-mobile") return mobileScriptCode;
    return iframeCode;
  }, [floatingScriptCode, iframeCode, mobileScriptCode, selectedMode]);

  const currentTitle = useMemo(() => {
    if (selectedMode === "float-desktop") {
      return t("agent.detail.embed.floatDesktopCode");
    }
    if (selectedMode === "float-mobile") {
      return t("agent.detail.embed.floatMobileCode");
    }
    return t("agent.detail.embed.iframeCode");
  }, [selectedMode, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full gap-0 rounded-[24px] p-0 md:max-w-4xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold">
            <span>{t("agent.detail.embed.title")}</span>
          </DialogTitle>
          <p className="text-muted-foreground text-sm">{t("agent.detail.embed.selectMethod")}</p>
        </DialogHeader>

        <div className="max-h-[78vh] space-y-6 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            {embedModes.map((item) => {
              const selected = selectedMode === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  className="space-y-3 text-left"
                  onClick={() => setSelectedMode(item.value)}
                >
                  <PreviewCard selected={selected} mode={item.value} />
                  <div className="space-y-1 px-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-muted-foreground text-xs leading-5">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-background rounded-2xl border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{currentTitle}</div>
                <div className="text-muted-foreground mt-1 text-xs break-all">
                  {publicLink || t("agent.detail.embed.showPublicLink")}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="bg-background size-9 shrink-0"
                onClick={() => onCopy(currentCode, t("agent.detail.embed.embedCodeCopied"))}
              >
                <Copy className="size-4" />
              </Button>
            </div>

            <div className="bg-background overflow-hidden rounded-xl border">
              <pre className="overflow-x-auto p-4 text-xs leading-6 whitespace-pre-wrap">
                <code>{currentCode}</code>
              </pre>
            </div>
          </div>

          <div className="bg-muted/20 text-muted-foreground rounded-2xl border px-4 py-3 text-xs leading-6">
            {selectedMode === "inline"
              ? t("agent.detail.embed.recommendIframe")
              : t("agent.detail.embed.floatNote")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
