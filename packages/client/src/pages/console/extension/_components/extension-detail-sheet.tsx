import {
  ExtensionStatus,
  ExtensionSupportTerminal,
  type ExtensionSupportTerminalType,
  ExtensionType,
  type ExtensionTypeType,
} from "@buildingai/constants/shared/extension.constant";
import {
  useExtensionByIdentifierQuery,
  useExtensionDetailQuery,
} from "@buildingai/services/console";
import SvgIcons from "@buildingai/ui/components/svg-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Separator } from "@buildingai/ui/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@buildingai/ui/components/ui/sheet";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { StatusBadge } from "@buildingai/ui/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { ExternalLink, Info, Loader2, Package, User } from "lucide-react";

import { useI18n } from "@buildingai/i18n";

type ExtensionDetailTarget = {
  id: string;
  identifier: string;
  isLocal: boolean;
};

type ExtensionDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ExtensionDetailTarget | null;
  defaultTab?: "overview" | "changelog";
};

/**
 * Reusable field item for the detail grid
 */
const DetailField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <span className="text-muted-foreground text-xs">{label}</span>
    <div className="text-foreground text-sm">{children}</div>
  </div>
);

export const ExtensionDetailSheet = ({
  open,
  onOpenChange,
  target,
  defaultTab = "overview",
}: ExtensionDetailSheetProps) => {
  const { t } = useI18n();
  const { data: localExtension, isLoading: localLoading } = useExtensionDetailQuery(
    target?.identifier ?? "",
    { enabled: open && !!target?.isLocal },
  );

  const { data: marketExtension, isLoading: marketLoading } = useExtensionByIdentifierQuery(
    target?.identifier ?? "",
    { enabled: open && !!target && !target.isLocal },
  );

  const extension = target?.isLocal ? localExtension : marketExtension;
  const detailLoading = target?.isLocal ? localLoading : marketLoading;

  const isLocal = target?.isLocal ?? false;
  const versionLists = extension?.versionLists;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 max-sm:w-full! max-sm:max-w-full max-sm:border-l-0!">
        {detailLoading || !extension ? (
          <>
            <SheetHeader className="flex gap-4">
              <SheetTitle className="flex items-center gap-2">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </SheetTitle>
              <SheetDescription asChild>
                <div className="bg-muted flex flex-col gap-2 rounded-lg p-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="flex gap-4">
              <SheetTitle className="flex items-center gap-2">
                <Avatar className="size-10 rounded-lg after:rounded-lg">
                  <AvatarImage src={extension.icon} alt={extension.name} className="rounded-lg" />
                  <AvatarFallback className="size-10 rounded-lg">
                    <SvgIcons.puzzle />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <span>
                    {extension.alias && extension.aliasShow ? extension.alias : extension.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">v{extension.version}</Badge>
                    <StatusBadge active={extension.status === ExtensionStatus.ENABLED} />
                  </div>
                </div>
              </SheetTitle>
              <SheetDescription className="bg-muted rounded-lg p-4" asChild>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    <Info className="size-3" />
                    <span className="text-xs">{t("extension.detail.description")}</span>
                  </div>
                  <div className="text-foreground">
                    {extension.description || t("extension.status.noDescription")}
                  </div>
                </div>
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue={defaultTab} className="flex flex-1 flex-col overflow-hidden px-4">
              <TabsList variant="line">
                <TabsTrigger value="overview">{t("extension.detail.overview")}</TabsTrigger>
                {!isLocal && (
                  <TabsTrigger value="changelog">{t("extension.actions.changelog")}</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="overview" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <DetailField label={t("extension.detail.identifier")}>
                      {extension.identifier}
                    </DetailField>
                    <DetailField label={t("extension.detail.currentVersion")}>
                      v{extension.version}
                    </DetailField>
                    <DetailField label={t("extension.detail.appType")}>
                      {extension.typeDesc || t("extension.type.unknown")}
                    </DetailField>
                    <DetailField label={t("extension.detail.appSource")}>
                      {extension.isLocal
                        ? t("extension.sourceOptions.local")
                        : t("extension.sourceOptions.market")}
                    </DetailField>
                    {extension.engine && (
                      <DetailField label={t("extension.detail.engine")}>
                        {extension.engine}
                      </DetailField>
                    )}
                    <DetailField label={t("extension.detail.compatibility")}>
                      <span
                        className={extension.isCompatible ? "text-green-600" : "text-destructive"}
                      >
                        {extension.isCompatible
                          ? t("extension.detail.compatible")
                          : t("extension.detail.incompatible")}
                      </span>
                    </DetailField>
                    {extension.hasUpdate && extension.latestVersion && (
                      <DetailField label={t("extension.detail.latestVersion")}>
                        <span className="text-blue-600">v{extension.latestVersion}</span>
                      </DetailField>
                    )}

                    <DetailField label={t("extension.detail.supportedTerminals")}>
                      <div className="flex flex-wrap gap-1">
                        {extension.supportTerminal?.length ? (
                          extension.supportTerminal.map((terminal) => (
                            <Badge key={terminal} variant="secondary">
                              {t(
                                `extension.terminalLabels.${terminal === ExtensionSupportTerminal.WEB ? "web" : terminal === ExtensionSupportTerminal.WEIXIN ? "weixin" : terminal === ExtensionSupportTerminal.H5 ? "h5" : terminal === ExtensionSupportTerminal.MP ? "mp" : "api"}`,
                              ) || t("extension.terminalLabels.unknown")}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </DetailField>

                    <DetailField label={t("extension.detail.author")}>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="size-5">
                          <AvatarImage src={extension.author?.avatar} />
                          <AvatarFallback>
                            <User className="size-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{extension.author?.name || t("extension.status.author")}</span>
                      </div>
                    </DetailField>

                    <DetailField label={t("extension.detail.homepage")}>
                      {extension.homepage ? (
                        <a
                          href={extension.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          {extension.homepage}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </DetailField>

                    <DetailField label={t("extension.detail.installTime")}>
                      {new Date(extension.createdAt).toLocaleString()}
                    </DetailField>
                    <DetailField label={t("extension.detail.updateTime")}>
                      {new Date(extension.updatedAt).toLocaleString()}
                    </DetailField>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="changelog" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="flex flex-col gap-4 py-4">
                    {versionLists?.length ? (
                      versionLists.map((ver, index) => (
                        <div key={ver.version} className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Package className="text-muted-foreground size-4" />
                            <span className="font-medium">v{ver.version}</span>
                            {ver.engine && (
                              <Badge variant="outline" className="text-xs">
                                {ver.engine}
                              </Badge>
                            )}
                            {index === 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {t("extension.status.latest")}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 pl-6">
                            {ver.features && (
                              <p className="text-muted-foreground text-sm">
                                <span className="text-foreground font-medium">
                                  {t("extension.status.newFeatures")}
                                </span>
                                {ver.features}
                              </p>
                            )}
                            {ver.optimize && (
                              <p className="text-muted-foreground text-sm">
                                <span className="text-foreground font-medium">
                                  {t("extension.status.optimize")}
                                </span>
                                {ver.optimize}
                              </p>
                            )}
                            {ver.fixs && (
                              <p className="text-muted-foreground text-sm">
                                <span className="text-foreground font-medium">
                                  {t("extension.status.fix")}
                                </span>
                                {ver.fixs}
                              </p>
                            )}
                          </div>
                          {ver.createdAt && (
                            <span className="text-muted-foreground pl-6 text-xs">
                              {new Date(ver.createdAt).toLocaleString()}
                            </span>
                          )}
                          {index < versionLists.length - 1 && <Separator />}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-sm">
                        {t("extension.empty.noChangelog")}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
