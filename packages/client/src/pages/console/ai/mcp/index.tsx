import {
  type McpServer,
  type QueryAiMcpServerDto,
  useCheckMcpConnectionMutation,
  useDeleteMcpServerMutation,
  useMcpServersListQuery,
  useToggleMcpServerActiveMutation,
} from "@buildingai/services/console";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { IconCircleCheckFilled, IconXboxXFilled } from "@tabler/icons-react";
import {
  ChevronRight,
  Edit,
  EllipsisVertical,
  FileJson2,
  Link2,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import SvgIcons from "@/components/svg-icons";
import { PageContainer } from "@/layouts/console/_components/page-container";

import { McpFormDialog } from "./_components/mcp-form-dialog";
import { McpImportDialog } from "./_components/mcp-import-dialog";

type StatusBadgeProps = {
  isActive: boolean;
};

/**
 * Reusable status badge component
 */
const StatusBadge = ({ isActive }: StatusBadgeProps) =>
  isActive ? (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
      已启用
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <IconXboxXFilled className="fill-destructive" />
      已禁用
    </Badge>
  );

const AiMcpIndexPage = () => {
  const [queryParams, setQueryParams] = useState<QueryAiMcpServerDto>({});
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);

  const { data, refetch, isLoading } = useMcpServersListQuery(queryParams);
  const { confirm } = useAlertDialog();

  const toggleActiveMutation = useToggleMcpServerActiveMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const deleteMutation = useDeleteMcpServerMutation({
    onSuccess: () => {
      toast.success("MCP服务已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const checkConnectionMutation = useCheckMcpConnectionMutation({
    onSuccess: (data) => {
      if (data.connectable) {
        toast.success(`连接成功，发现 ${data.tools?.length || 0} 个工具`);
      } else {
        toast.error(`连接失败: ${data.message}`);
      }
      refetch();
    },
    onError: (error) => {
      toast.error(`检测失败: ${error.message}`);
    },
  });

  const handleToggleStatus = async (server: McpServer) => {
    await confirm({
      title: "MCP服务状态",
      description: `确定要${server.isDisabled ? "启用" : "禁用"}该MCP服务吗？`,
    });
    toggleActiveMutation.mutate({ id: server.id, isDisabled: !server.isDisabled });
  };

  const handleDelete = async (server: McpServer) => {
    await confirm({
      title: "删除MCP服务",
      description: "确定要删除该MCP服务吗？此操作不可恢复。",
    });
    deleteMutation.mutate(server.id);
  };

  const handleCheckConnection = (server: McpServer) => {
    checkConnectionMutation.mutate(server.id);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQueryParams((prev) => ({
      ...prev,
      name: value || undefined,
    }));
  };

  const handleStatusChange = (value: string) => {
    setQueryParams((prev) => ({
      ...prev,
      isDisabled: value === "all" ? undefined : value === "disabled",
    }));
  };

  const handleCreate = () => {
    setEditingServer(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (server: McpServer) => {
    setEditingServer(server);
    setFormDialogOpen(true);
  };

  const handleImport = () => {
    setImportDialogOpen(true);
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <div className="bg-background sticky top-0 z-1 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <Input placeholder="搜索MCP服务名称" className="text-sm" onChange={handleSearchChange} />
          <Select onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="服务状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="enabled">已启用</SelectItem>
              <SelectItem value="disabled">已禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 hover:border-solid">
            <div className="flex cursor-pointer items-center gap-3" onClick={handleCreate}>
              <Button className="size-12 rounded-lg border-dashed" variant="outline">
                <Plus />
              </Button>
              <div className="flex flex-col">
                <span>添加MCP服务</span>
                <span className="text-muted-foreground py-1 text-xs font-medium">
                  添加新的MCP服务配置
                </span>
              </div>
            </div>

            <div className="flex min-h-12 flex-1 items-end gap-4">
              <Button size="xs" className="flex-1" variant="outline" onClick={handleImport}>
                <FileJson2 /> 从JSON导入
              </Button>
              <Button size="xs" className="flex-1" variant="outline" onClick={handleCreate}>
                <Plus /> 手动创建
              </Button>
            </div>
          </div>

          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-card flex h-36.5 flex-col gap-4 rounded-lg border p-4">
                <div className="flex gap-3">
                  <Skeleton className="size-12 rounded-lg" />
                  <div className="flex h-full flex-1 flex-col justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-2 h-4 w-full" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            ))
          ) : data?.items && data?.items.length > 0 ? (
            data?.items.map((server) => (
              <div
                key={server.id}
                className="bg-card group/mcp-item relative flex flex-col gap-4 rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="relative size-12 rounded-lg after:rounded-lg">
                    <AvatarImage src={server.icon || ""} alt={server.name} className="rounded-lg" />
                    <AvatarFallback className="size-12 rounded-lg">
                      <SvgIcons.mcp className="size-8" />
                    </AvatarFallback>
                    <div className="center absolute inset-0 z-1 rounded-lg bg-black/5 opacity-0 backdrop-blur-xl transition-opacity group-hover/mcp-item:opacity-100 dark:bg-black/15">
                      <Switch
                        checked={!server.isDisabled}
                        onCheckedChange={() => handleToggleStatus(server)}
                        disabled={toggleActiveMutation.isPending}
                      />
                    </div>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="line-clamp-1">{server.name}</span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground px-0 hover:px-2"
                    >
                      <Wrench />
                      查看工具({server.toolsCount || 0})
                      <ChevronRight />
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                        <EllipsisVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleCheckConnection(server)}>
                        <RefreshCw />
                        检测连接
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(server)}>
                        <Edit />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant={server.isDisabled ? "default" : "warning"}
                        onClick={() => handleToggleStatus(server)}
                        disabled={toggleActiveMutation.isPending}
                      >
                        {server.isDisabled ? <Power /> : <PowerOff />}
                        {server.isDisabled ? "启用" : "禁用"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(server)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex min-h-12 flex-wrap gap-2">
                  <StatusBadge isActive={!server.isDisabled} />
                  <Badge variant="secondary">{server.communicationType}</Badge>

                  {server.url && (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground max-w-full pr-1.5 pl-1"
                    >
                      <Link2 className="size-3 shrink-0" />
                      <span className="truncate">{server.url}</span>
                    </Badge>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-1 flex h-36.5 items-center justify-center gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
              <span className="text-muted-foreground text-sm">
                {queryParams.name
                  ? `没有找到与"${queryParams.name}"相关的MCP服务`
                  : "暂无MCP服务数据"}
              </span>
            </div>
          )}
        </div>
      </div>
      <McpFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        server={editingServer}
        onSuccess={refetch}
      />

      <McpImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={refetch}
      />
    </PageContainer>
  );
};

export default AiMcpIndexPage;
