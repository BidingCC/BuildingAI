import { useI18n } from "@buildingai/i18n";
import { useAgentDetailQuery, useUpdatePublishConfigMutation } from "@buildingai/services/web";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import type { LucideIcon } from "lucide-react";
import { Copy, Earth, ExternalLink, FileCodeCorner, RefreshCw, SquareCode } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { EmbedPublishDialog } from "./embed-publish-dialog";

type PublishTab = "all" | "webapp";
type PublishDialogType = "embed" | null;

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function getSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return "";
}

function buildEmbedCode(publicLink: string): string {
  return [
    `<iframe`,
    `  src="${publicLink}"`,
    `  width="100%"`,
    `  height="720"`,
    `  style="border:0;border-radius:16px;overflow:hidden;background:#fff;"`,
    `  allow="clipboard-write; microphone; camera"`,
    `></iframe>`,
  ].join("\n");
}

function buildFloatingEmbedCode(publicLink: string, mode: "desktop" | "mobile"): string {
  const config =
    mode === "mobile"
      ? {
          width: "88vw",
          maxWidth: "360px",
          height: "72vh",
          right: "16px",
          bottom: "20px",
        }
      : {
          width: "420px",
          maxWidth: "calc(100vw - 32px)",
          height: "720px",
          right: "24px",
          bottom: "24px",
        };

  return [
    `<script>`,
    `  (() => {`,
    `    const iframe = document.createElement("iframe");`,
    `    iframe.src = "${publicLink}";`,
    `    iframe.allow = "clipboard-write; microphone; camera";`,
    `    iframe.style.position = "fixed";`,
    `    iframe.style.right = "${config.right}";`,
    `    iframe.style.bottom = "${config.bottom}";`,
    `    iframe.style.width = "${config.width}";`,
    `    iframe.style.maxWidth = "${config.maxWidth}";`,
    `    iframe.style.height = "${config.height}";`,
    `    iframe.style.border = "0";`,
    `    iframe.style.borderRadius = "20px";`,
    `    iframe.style.background = "#fff";`,
    `    iframe.style.boxShadow = "0 20px 50px rgba(15, 23, 42, 0.16)";`,
    `    iframe.style.zIndex = "2147483000";`,
    ``,
    `    document.body.appendChild(iframe);`,
    `  })();`,
    `</script>`,
  ].join("\n");
}

interface ChannelCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onOpen?: () => void;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionIcon?: LucideIcon;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionIcon?: LucideIcon;
  switchChecked?: boolean;
  onSwitchChange?: (checked: boolean) => void;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
  isRegeneratePending?: boolean;
}

function ChannelCard({
  icon: Icon,
  title,
  description,
  onOpen,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionIcon: PrimaryActionIcon = Copy,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionIcon: SecondaryActionIcon = ExternalLink,
  switchChecked,
  onSwitchChange,
  onRegenerate,
  showRegenerate,
  isRegeneratePending,
}: ChannelCardProps) {
  return (
    <Card
      className={`rounded-2xl transition-all ${
        onOpen ? "group hover:border-primary/40 hover:bg-muted/40 cursor-pointer" : ""
      }`}
      onClick={onOpen}
    >
      <CardContent className="flex h-full min-h-26 flex-col justify-between px-5">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-medium">{title}</h3>
                <div
                  className="flex shrink-0 items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onSwitchChange && (
                    <Switch
                      checked={switchChecked ?? false}
                      onCheckedChange={onSwitchChange}
                      disabled={isRegeneratePending}
                    />
                  )}
                </div>
              </div>
              <p className="text-muted-foreground line-clamp-2 text-sm">{description}</p>
            </div>
          </div>
        </div>

        <div className="text-muted-foreground mt-6 flex flex-wrap items-center justify-end gap-4 text-sm">
          <button
            type="button"
            className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              onPrimaryAction();
            }}
          >
            <PrimaryActionIcon className="size-3.5" />
            {primaryActionLabel}
          </button>

          {showRegenerate && onRegenerate && (
            <button
              type="button"
              className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
              onClick={onRegenerate}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              {t("agent.detail.publish.regenerate")}
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction ? (
            <button
              type="button"
              className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
              onClick={(event) => {
                event.stopPropagation();
                onSecondaryAction();
              }}
            >
              <SecondaryActionIcon className="size-3.5" />
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Publish() {
  const { t } = useI18n();
  const { id } = useParams();
  const agentId = id ?? "";
  const [activeTab, setActiveTab] = useState<PublishTab>("all");
  const [dialogType, setDialogType] = useState<PublishDialogType>(null);

  const { data: agent, isLoading } = useAgentDetailQuery(agentId, {
    refetchOnWindowFocus: false,
  });

  const updatePublishConfigMutation = useUpdatePublishConfigMutation(agentId);

  const siteOrigin = useMemo(() => getSiteOrigin(), []);

  const publicLink = useMemo(() => {
    if (!agent?.publishConfig?.accessToken || !siteOrigin) return "";
    return joinUrl(
      siteOrigin,
      `/agents/${agent.id}/${encodeURIComponent(agent.publishConfig.accessToken)}`,
    );
  }, [agent?.publishConfig?.accessToken, siteOrigin]);

  const embedCode = useMemo(() => buildEmbedCode(publicLink || "<PUBLIC_AGENT_URL>"), [publicLink]);
  const floatingEmbedCode = useMemo(
    () => buildFloatingEmbedCode(publicLink || "<PUBLIC_AGENT_URL>", "desktop"),
    [publicLink],
  );
  const mobileFloatingEmbedCode = useMemo(
    () => buildFloatingEmbedCode(publicLink || "<PUBLIC_AGENT_URL>", "mobile"),
    [publicLink],
  );

  const handleCopy = useCallback(async (value: string, successMessage: string) => {
    if (!value) {
      toast.error(t("agent.detail.publish.noContentToCopy"));
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error(t("agent.detail.publish.copyFailed"));
    }
  }, []);

  const handleOpenPublicLink = useCallback(() => {
    if (!publicLink) {
      toast.error(t("agent.detail.publish.pleasePublishFirst"));
      return;
    }
    window.open(publicLink, "_blank", "noopener,noreferrer");
  }, [publicLink]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as PublishTab);
  }, []);

  const handleCopyPublishedValue = useCallback(
    async (value: string, successMessage: string) => {
      await handleCopy(value, successMessage);
    },
    [handleCopy],
  );

  return (
    <>
      <div className="flex h-full flex-col overflow-y-auto px-6 py-4">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">{t("agent.detail.publish.title")}</h1>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
              <TabsList className="w-fit rounded-xl">
                <TabsTrigger value="all">{t("agent.detail.publish.all")}</TabsTrigger>
                <TabsTrigger value="webapp">{t("agent.detail.publish.webappTab")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-52 rounded-2xl" />
              <div className="space-y-4">
                <Skeleton className="h-6 w-24" />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Skeleton className="h-40 rounded-2xl" />
                  <Skeleton className="h-40 rounded-2xl" />
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-40 rounded-2xl" />
              </div>
            </div>
          ) : (
            <>
              {(activeTab === "all" || activeTab === "webapp") && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{t("agent.detail.publish.webapp")}</h2>
                    <Badge variant="secondary">2</Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    <ChannelCard
                      icon={Earth}
                      title={t("agent.detail.publish.webPage")}
                      description={t("agent.detail.publish.webPageDesc")}
                      primaryActionLabel={t("agent.detail.publish.copyLink")}
                      onPrimaryAction={() =>
                        handleCopyPublishedValue(publicLink, t("agent.detail.publish.linkCopied"))
                      }
                      secondaryActionLabel={t("agent.detail.publish.previewExperience")}
                      onSecondaryAction={handleOpenPublicLink}
                      switchChecked={agent?.publishConfig?.enableSite ?? false}
                      onSwitchChange={(checked) =>
                        updatePublishConfigMutation.mutate({ enableSite: checked })
                      }
                      onRegenerate={() =>
                        updatePublishConfigMutation.mutate({ regenerateAccessToken: true })
                      }
                      showRegenerate={agent?.publishConfig?.enableSite ?? false}
                      isRegeneratePending={updatePublishConfigMutation.isPending}
                    />
                    <ChannelCard
                      icon={SquareCode}
                      title={t("agent.detail.publish.jsEmbed")}
                      description={t("agent.detail.publish.jsEmbedDesc")}
                      onOpen={() => setDialogType("embed")}
                      primaryActionLabel={t("agent.detail.publish.copyIframe")}
                      onPrimaryAction={() =>
                        handleCopyPublishedValue(
                          embedCode,
                          t("agent.detail.publish.embedCodeCopied"),
                        )
                      }
                      secondaryActionLabel={t("agent.detail.publish.viewCode")}
                      onSecondaryAction={() => setDialogType("embed")}
                      secondaryActionIcon={FileCodeCorner}
                    />
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <EmbedPublishDialog
        open={dialogType === "embed"}
        onOpenChange={(open) => setDialogType(open ? "embed" : null)}
        isPending={false}
        publicLink={publicLink}
        iframeCode={embedCode}
        floatingScriptCode={floatingEmbedCode}
        mobileScriptCode={mobileFloatingEmbedCode}
        onPublish={() => {}}
        onCopy={(value, successMessage) => void handleCopyPublishedValue(value, successMessage)}
      />
    </>
  );
}
