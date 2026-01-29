import {
  type McpServer,
  useCheckMcpServerConnection,
  useDeleteMcpServer,
  useMcpServersAllQuery,
  useToggleMcpServerStatus,
} from "@buildingai/services/web";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { IconCircleCheckFilled, IconXboxXFilled } from "@tabler/icons-react";
import { Hammer, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { McpFormDialog } from "../_components/mcp-form-dialog";
import { McpImportDialog } from "../_components/mcp-import-dialog";
import { SettingItem } from "../setting-item";

type ConnectionStatusBadgeProps = {
  server: McpServer;
};

const ConnectionStatusBadge = ({ server }: ConnectionStatusBadgeProps) => {
  if (server.isDisabled) {
    return (
      <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
        <IconXboxXFilled className="fill-muted-foreground" />
        已禁用
      </Badge>
    );
  }

  return server.connectable ? (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
      可连通
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <IconXboxXFilled className="fill-destructive" />
      不能连通
    </Badge>
  );
};

const ToolsSetting = () => {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);

  const { data: servers, isLoading, refetch } = useMcpServersAllQuery();
  const { confirm } = useAlertDialog();

  const toggleStatusMutation = useToggleMcpServerStatus();
  const deleteMutation = useDeleteMcpServer();
  const checkConnectionMutation = useCheckMcpServerConnection();

  const handleCreate = () => {
    setEditingServer(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (server: McpServer) => {
    setEditingServer(server);
    setFormDialogOpen(true);
  };

  const handleToggleStatus = async (server: McpServer) => {
    toggleStatusMutation.mutate(
      { id: server.id, status: !server.isDisabled },
      {
        onSuccess: () => {
          toast.success(server.isDisabled ? "已启用" : "已禁用");
          refetch();
        },
        onError: (error) => {
          toast.error(`操作失败: ${(error as Error).message}`);
        },
      },
    );
  };

  const handleDelete = async (server: McpServer) => {
    await confirm({
      title: "删除MCP服务",
      description: "确定要删除该MCP服务吗？此操作不可恢复。",
    });
    deleteMutation.mutate(server.id, {
      onSuccess: () => {
        toast.success("MCP服务已删除");
        refetch();
      },
      onError: (error) => {
        toast.error(`删除失败: ${(error as Error).message}`);
      },
    });
  };

  const handleCheckConnection = (server: McpServer) => {
    checkConnectionMutation.mutate(server.id, {
      onSuccess: (data) => {
        if (data.connectable) {
          toast.success(`连接成功`);
        } else {
          toast.error(`连接失败: ${data.message}`);
        }
        refetch();
      },
      onError: (error) => {
        toast.error(`检测失败: ${(error as Error).message}`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="bg-muted flex flex-col gap-1 rounded-lg p-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="ml-auto h-5 w-10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-muted flex flex-col rounded-lg">
      <SettingItem title="添加MCP服务" description="添加新的MCP服务配置">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleCreate}
              className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
            >
              <Plus />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                从JSON导入
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreate}>快速创建</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SettingItem>

      {servers &&
        servers.map((server) => (
          <SettingItem
            key={server.id}
            contentClassName="gap-1"
            title={server.name}
            description={
              <div className="flex gap-2">
                <ConnectionStatusBadge server={server} />
                <Badge variant="outline" className="text-muted-foreground px-1.5">
                  <Hammer />
                  {server.tools?.length || 0}个工具
                </Badge>
              </div>
            }
          >
            <div className="flex items-center">
              <Button
                size="icon-sm"
                className="hover:bg-destructive/10 dark:hover:bg-destructive/15 opacity-0 group-hover/setting-item:opacity-100"
                variant="ghost"
                onClick={() => handleDelete(server)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="text-destructive" />
              </Button>

              <Button
                size="icon-sm"
                className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
                variant="ghost"
                onClick={() => handleEdit(server)}
              >
                <Settings2 />
              </Button>

              <Button
                size="icon-sm"
                className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15 mr-2"
                variant="ghost"
                onClick={() => handleCheckConnection(server)}
                disabled={checkConnectionMutation.isPending}
              >
                <RefreshCw className={checkConnectionMutation.isPending ? "animate-spin" : ""} />
              </Button>
              <Switch
                checked={!server.isDisabled}
                onCheckedChange={() => handleToggleStatus(server)}
                disabled={toggleStatusMutation.isPending}
              />
            </div>
          </SettingItem>
        ))}

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
    </div>
  );
};

export { ToolsSetting };
