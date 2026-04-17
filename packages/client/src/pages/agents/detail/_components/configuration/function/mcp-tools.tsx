import { type McpServer, useMcpServerQuery, useMcpServersAllQuery } from "@buildingai/services/web";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
// import { Switch } from "@buildingai/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Hammer,
  HelpCircle,
  Plus,
  Settings2,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

type McpTab = "all" | "user" | "system";

function coerceIds(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0) return [];
  const ids = input.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  return Array.from(new Set(ids));
}

function serverDisplayName(server: McpServer) {
  const alias = (server.alias ?? "").trim();
  return alias ? `${server.name} (${alias})` : server.name;
}

export type ToolConfigValue = {
  /** 是否开启工具执行前人工审批 */
  requireApproval?: boolean;
  toolTimeout?: number;
};

export const McpTools = memo(
  ({
    value,
    onChange,
    toolConfig,
    onToolConfigChange,
  }: {
    value: string[];
    onChange: (value: string[]) => void;
    toolConfig?: ToolConfigValue | null;
    onToolConfigChange?: (v: ToolConfigValue | null) => void;
  }) => {
    const { data: servers = [], isLoading } = useMcpServersAllQuery();

    const [selectedIds, setSelectedIds] = useState<string[]>(() => coerceIds(value));
    const [dialogOpen, setDialogOpen] = useState(false);
    const [draftIds, setDraftIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<McpTab>("all");
    const [keyword, setKeyword] = useState("");
    const [toolsDialogServer, setToolsDialogServer] = useState<McpServer | null>(null);
    const [toolsDialogOpen, setToolsDialogOpen] = useState(false);
    const toolsDialogCleanupTimerRef = useRef<number | null>(null);
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [draftRequireApproval, setDraftRequireApproval] = useState(false);
    const [draftToolTimeout, setDraftToolTimeout] = useState<number>(30000);

    const { data: toolsDialogServerDetail, isLoading: isToolsDialogLoading } = useMcpServerQuery(
      toolsDialogServer?.id ?? "",
      {
        enabled: toolsDialogOpen && !!toolsDialogServer?.id,
      },
    );

    const toolsDialogTools = toolsDialogServerDetail?.tools ?? toolsDialogServer?.tools ?? [];

    useEffect(() => {
      setSelectedIds(coerceIds(value));
    }, [value]);

    const selectedServers = useMemo(() => {
      if (!selectedIds.length) return [];
      const map = new Map(servers.map((s) => [s.id, s] as const));
      return selectedIds.map((id) => map.get(id)).filter((x): x is McpServer => Boolean(x));
    }, [selectedIds, servers]);

    const openAddDialog = useCallback(() => {
      setKeyword("");
      setDraftIds(selectedIds);
      setActiveTab("all");
      setDialogOpen(true);
    }, [selectedIds]);

    const openSettingsDialog = useCallback(() => {
      setDraftRequireApproval(toolConfig?.requireApproval ?? false);
      setDraftToolTimeout(
        typeof toolConfig?.toolTimeout === "number" && toolConfig.toolTimeout > 0
          ? toolConfig.toolTimeout
          : 30000,
      );
      setSettingsDialogOpen(true);
    }, [toolConfig]);

    const saveToolConfig = useCallback(() => {
      const next: ToolConfigValue = {
        requireApproval: draftRequireApproval || undefined,
        toolTimeout: draftToolTimeout > 0 ? draftToolTimeout : undefined,
      };
      onToolConfigChange?.(
        next.requireApproval === undefined && next.toolTimeout === undefined ? null : next,
      );
      setSettingsDialogOpen(false);
    }, [draftRequireApproval, draftToolTimeout, onToolConfigChange]);

    const handleToggleSelect = useCallback((id: string) => {
      setDraftIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }, []);

    const handleClearSelected = useCallback(() => {
      setDraftIds([]);
    }, []);

    const submit = useCallback(() => {
      const next = coerceIds(draftIds);
      setSelectedIds(next);
      onChange(next);
      setDialogOpen(false);
    }, [draftIds, onChange]);

    const removeOne = useCallback(
      (id: string) => {
        setSelectedIds((prev) => {
          const next = prev.filter((x) => x !== id);
          onChange(next);
          return next;
        });
      },
      [onChange],
    );

    const filteredServers = useMemo(() => {
      const q = keyword.trim().toLowerCase();
      const base =
        activeTab === "user"
          ? servers.filter((s) => s.type === "user")
          : activeTab === "system"
            ? servers.filter((s) => s.type === "system")
            : servers;
      if (!q) return base;
      return base.filter((s) => {
        const name = `${s.name ?? ""} ${s.alias ?? ""} ${s.description ?? ""}`.toLowerCase();
        return name.includes(q);
      });
    }, [activeTab, keyword, servers]);

    return (
      <div className="bg-secondary rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-medium">工具</h3>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="text-muted-foreground h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-background text-xs">
                    集成外部工具和服务，扩展智能体能力（如天气查询、文件处理等）
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              选择该智能体可使用的工具，工具会在对话中自动可用。
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onToolConfigChange != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={openSettingsDialog}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-background text-xs">工具执行配置</div>
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="ghost"
              size="xs"
              className="hover:bg-primary/10 hover:text-primary"
              onClick={openAddDialog}
            >
              <Plus className="h-4 w-4" />
              <span>添加</span>
            </Button>
          </div>
        </div>

        {selectedServers.length > 0 ? (
          <div className="mt-3 space-y-2">
            {selectedServers.map((server) => (
              <div
                key={server.id}
                className="group/mcp-server bg-background relative flex items-start gap-2 rounded-md px-3 py-2"
              >
                <div className="mt-0.5 shrink-0">
                  <Wrench className="text-muted-foreground h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0 truncate text-sm font-medium">
                      {serverDisplayName(server)}
                    </div>
                    {server.isDisabled ? (
                      <Badge variant="secondary" className="text-muted-foreground">
                        已禁用
                      </Badge>
                    ) : server.connectable ? (
                      <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        可连通
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-destructive">
                        <CircleAlert className="mr-1 h-3.5 w-3.5" />
                        不能连通
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground px-0 hover:px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (toolsDialogCleanupTimerRef.current) {
                          window.clearTimeout(toolsDialogCleanupTimerRef.current);
                          toolsDialogCleanupTimerRef.current = null;
                        }
                        setToolsDialogServer(server);
                        setToolsDialogOpen(true);
                      }}
                    >
                      <Hammer className="h-4 w-4" />
                      查看工具({(server.tools?.length ?? 0).toString()})
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  {server.description && (
                    <div className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {server.description}
                    </div>
                  )}
                </div>

                <div className="absolute top-1 right-1 flex items-center opacity-0 transition-opacity group-hover/mcp-server:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                    onClick={() => removeOne(server.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground bg-background mt-3 flex items-center justify-between rounded-md px-3 py-2">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="text-sm">未选择工具</span>
            </div>
            <Badge variant="outline">0</Badge>
          </div>
        )}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setKeyword("");
              setDraftIds([]);
              setActiveTab("all");
            }
          }}
        >
          <DialogContent className="gap-0 p-0 sm:max-w-md">
            <DialogHeader className="px-4 pt-4">
              <DialogTitle>选择 工具</DialogTitle>
            </DialogHeader>
            <div className="mt-3 px-4 pb-4">
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as McpTab)}
                className="w-full"
              >
                <TabsList className="bg-muted/60 w-full rounded-lg p-[3px]">
                  <TabsTrigger value="all" className="flex-1 rounded-md text-xs sm:text-sm">
                    全部
                  </TabsTrigger>
                  <TabsTrigger value="user" className="flex-1 rounded-md text-xs sm:text-sm">
                    个人
                  </TabsTrigger>
                  <TabsTrigger value="system" className="flex-1 rounded-md text-xs sm:text-sm">
                    系统
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="outline-none">
                  <ScrollArea className="bg-background h-90 rounded-md border">
                    <div className="px-2 pb-1.5">
                      <div className="mt-2 flex h-6 items-center justify-between gap-2">
                        <div className="text-muted-foreground text-xs sm:text-sm">
                          已选择 {draftIds.length} 项
                        </div>
                        {draftIds.length > 0 && (
                          <Button
                            variant="ghost"
                            size="xs"
                            type="button"
                            onClick={handleClearSelected}
                          >
                            <X className="h-3 w-3" />
                            清空
                          </Button>
                        )}
                      </div>

                      <Input
                        placeholder="搜索工具..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="bg-muted! supports-backdrop-filter:bg-background/80 sticky top-2 z-10 my-2 h-9 border-0 text-xs shadow-none backdrop-blur sm:text-sm"
                      />

                      {isLoading ? (
                        <div className="text-muted-foreground py-6 text-center text-xs sm:text-sm">
                          加载中...
                        </div>
                      ) : filteredServers.length === 0 ? (
                        <div className="text-muted-foreground py-6 text-center text-xs sm:text-sm">
                          暂无工具
                        </div>
                      ) : (
                        <>
                          {filteredServers.map((server) => {
                            const isSelected = draftIds.includes(server.id);
                            return (
                              <div
                                key={server.id}
                                role="button"
                                tabIndex={0}
                                className={cn(
                                  "hover:bg-background mb-2 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left",
                                  isSelected && "bg-background text-primary",
                                )}
                                onClick={() => handleToggleSelect(server.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleToggleSelect(server.id);
                                  }
                                }}
                              >
                                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleToggleSelect(server.id)}
                                  />
                                </div>
                                <div className="min-w-0 flex-1 truncate text-sm font-medium">
                                  {serverDisplayName(server)}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  className="text-muted-foreground px-0 hover:px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (toolsDialogCleanupTimerRef.current) {
                                      window.clearTimeout(toolsDialogCleanupTimerRef.current);
                                      toolsDialogCleanupTimerRef.current = null;
                                    }
                                    setToolsDialogServer(server);
                                    setToolsDialogOpen(true);
                                  }}
                                >
                                  <Hammer className="h-4 w-4" />
                                  查看工具({(server.tools?.length ?? 0).toString()})
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                                {server.isDisabled ? (
                                  <Badge variant="secondary" className="text-muted-foreground">
                                    已禁用
                                  </Badge>
                                ) : server.connectable ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-emerald-600 dark:text-emerald-400"
                                  >
                                    可连通
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-destructive">
                                    不能连通
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="px-4 pb-4">
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button onClick={submit} disabled={isLoading}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>工具配置</DialogTitle>
              <DialogDescription>
                配置工具执行超时与是否开启人工审批。开启审批后，所有工具执行前需经人工确认。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">工具执行需人工审批</label>
                  <p className="text-muted-foreground text-xs">
                    开启后，所有工具执行前需审批；不开启则自动执行。
                  </p>
                </div>
                <Switch checked={draftRequireApproval} onCheckedChange={setDraftRequireApproval} />
              </div> */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">单个工具执行超时（毫秒）</label>
                <Input
                  type="number"
                  min={1000}
                  step={1000}
                  placeholder="30000"
                  value={draftToolTimeout || ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                    setDraftToolTimeout(Number.isFinite(v) ? v : 30000);
                  }}
                />
                <p className="text-muted-foreground text-xs">默认 30000，即 30 秒</p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button onClick={saveToolConfig}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={toolsDialogOpen}
          onOpenChange={(open) => {
            if (open) {
              if (toolsDialogCleanupTimerRef.current) {
                window.clearTimeout(toolsDialogCleanupTimerRef.current);
                toolsDialogCleanupTimerRef.current = null;
              }
              setToolsDialogOpen(true);
              return;
            }
            setToolsDialogOpen(false);
            if (toolsDialogCleanupTimerRef.current) {
              window.clearTimeout(toolsDialogCleanupTimerRef.current);
            }
            toolsDialogCleanupTimerRef.current = window.setTimeout(() => {
              setToolsDialogServer(null);
            }, 200);
          }}
        >
          <DialogContent className="gap-0 p-0 sm:max-w-lg">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="flex items-center gap-2">
                <Hammer className="size-4" />
                {toolsDialogServer?.name} - 工具列表
              </DialogTitle>
              <DialogDescription>
                共 {isToolsDialogLoading ? "..." : toolsDialogTools.length} 个工具
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              <div className="flex flex-col gap-2 p-4 pt-2">
                {isToolsDialogLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex flex-col gap-2 rounded-lg border p-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))
                ) : toolsDialogTools.length > 0 ? (
                  toolsDialogTools.map((tool) => (
                    <div key={tool.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {tool.name}
                        </Badge>
                      </div>
                      {tool.description && (
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {tool.description}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
                    暂无工具数据，请先检测连接以同步工具
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
);

McpTools.displayName = "McpTools";
