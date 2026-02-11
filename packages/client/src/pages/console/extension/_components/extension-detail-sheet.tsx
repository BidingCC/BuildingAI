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
import { IconPuzzle } from "@tabler/icons-react";
import { ExternalLink, Info, Loader2, Package, User } from "lucide-react";

const TERMINAL_LABEL_MAP: Record<ExtensionSupportTerminalType, string> = {
  [ExtensionSupportTerminal.WEB]: "Web端",
  [ExtensionSupportTerminal.WEIXIN]: "公众号",
  [ExtensionSupportTerminal.H5]: "H5",
  [ExtensionSupportTerminal.MP]: "小程序",
  [ExtensionSupportTerminal.API]: "API端",
};

const TYPE_LABEL_MAP: Record<ExtensionTypeType, string> = {
  [ExtensionType.APPLICATION]: "应用插件",
  [ExtensionType.FUNCTIONAL]: "功能插件",
};

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
                    <IconPuzzle />
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
                    <span className="text-xs">应用描述</span>
                  </div>
                  <div className="text-foreground">{extension.description || "暂无描述"}</div>
                </div>
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue={defaultTab} className="flex flex-1 flex-col overflow-hidden px-4">
              <TabsList variant="line">
                <TabsTrigger value="overview">详情</TabsTrigger>
                {!isLocal && <TabsTrigger value="changelog">更新日志</TabsTrigger>}
              </TabsList>

              <TabsContent value="overview" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <DetailField label="标识符">{extension.identifier}</DetailField>
                    <DetailField label="当前版本">v{extension.version}</DetailField>
                    <DetailField label="应用类型">
                      {extension.typeDesc || TYPE_LABEL_MAP[extension.type] || "未知"}
                    </DetailField>
                    <DetailField label="应用来源">
                      {extension.isLocal ? "本地" : "应用市场"}
                    </DetailField>
                    {extension.engine && (
                      <DetailField label="引擎要求">{extension.engine}</DetailField>
                    )}
                    <DetailField label="兼容性">
                      <span
                        className={extension.isCompatible ? "text-green-600" : "text-destructive"}
                      >
                        {extension.isCompatible ? "兼容" : "不兼容"}
                      </span>
                    </DetailField>
                    {extension.hasUpdate && extension.latestVersion && (
                      <DetailField label="最新版本">
                        <span className="text-blue-600">v{extension.latestVersion}</span>
                      </DetailField>
                    )}

                    <DetailField label="支持终端">
                      <div className="flex flex-wrap gap-1">
                        {extension.supportTerminal?.length ? (
                          extension.supportTerminal.map((terminal) => (
                            <Badge key={terminal} variant="secondary">
                              {TERMINAL_LABEL_MAP[terminal] || "未知"}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </DetailField>

                    <DetailField label="作者">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="size-5">
                          <AvatarImage src={extension.author?.avatar} />
                          <AvatarFallback>
                            <User className="size-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{extension.author?.name || "未知作者"}</span>
                      </div>
                    </DetailField>

                    <DetailField label="主页">
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

                    <DetailField label="安装时间">
                      {new Date(extension.createdAt).toLocaleString()}
                    </DetailField>
                    <DetailField label="更新时间">
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
                                最新
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 pl-6">
                            {ver.features && (
                              <p className="text-muted-foreground text-sm">
                                <span className="text-foreground font-medium">新功能：</span>
                                {ver.features}
                              </p>
                            )}
                            {ver.optimize && (
                              <p className="text-muted-foreground text-sm">
                                <span className="text-foreground font-medium">优化：</span>
                                {ver.optimize}
                              </p>
                            )}
                            {ver.fixs && (
                              <p className="text-muted-foreground text-sm">
                                <span className="text-foreground font-medium">修复：</span>
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
                        暂无更新日志
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
