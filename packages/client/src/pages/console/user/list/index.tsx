import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { useCopy } from "@buildingai/hooks";
import {
  type QueryUserDto,
  useDeleteUserMutation,
  type User,
  useSetUserStatusMutation,
  useUsersListQuery,
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
  ClockPlus,
  Copy,
  Edit,
  EllipsisVertical,
  Key,
  Plus,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { usePagination } from "@/hooks/use-pagination";

const PAGE_SIZE = 25;

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
      正常
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground pr-1.5 pl-1">
      <IconXboxXFilled className="fill-destructive" />
      已禁用
    </Badge>
  );

const UserListIndexPage = () => {
  const { copy, isCopying } = useCopy();
  const { confirm } = useAlertDialog();
  const [queryParams, setQueryParams] = useState<QueryUserDto>({
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const { data, refetch, isLoading } = useUsersListQuery(queryParams);

  const { PaginationComponent } = usePagination({
    total: data?.total || 0,
    pageSize: PAGE_SIZE,
    page: queryParams.page || 1,
    onPageChange: (page) => {
      setQueryParams((prev) => ({ ...prev, page }));
    },
  });

  const setStatusMutation = useSetUserStatusMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.status === BooleanNumber.YES ? "用户已启用" : "用户已禁用");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const deleteMutation = useDeleteUserMutation({
    onSuccess: () => {
      toast.success("用户已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === BooleanNumber.YES ? BooleanNumber.NO : BooleanNumber.YES;
    await confirm({
      title: "用户状态",
      description: `确定要${newStatus === BooleanNumber.YES ? "启用" : "禁用"}该用户吗？`,
    });
    setStatusMutation.mutate({ id: user.id, status: newStatus });
  };

  const handleDelete = async (user: User) => {
    if (user.isRoot === BooleanNumber.YES) {
      toast.error("超级管理员不允许删除");
      return;
    }
    await confirm({
      title: "删除用户",
      description: "确定要删除该用户吗？此操作不可恢复。",
    });
    deleteMutation.mutate(user.id);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQueryParams((prev) => ({
      ...prev,
      keyword: value || undefined,
      page: 1,
    }));
  };

  const handleStatusChange = (value: string) => {
    setQueryParams((prev) => ({
      ...prev,
      status: value === "all" ? undefined : (Number(value) as QueryUserDto["status"]),
      page: 1,
    }));
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="bg-background sticky top-0 z-1 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Input
          placeholder="搜索用户名、昵称或邮箱"
          className="text-sm"
          onChange={handleSearchChange}
        />
        <Select onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="用户状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value={String(BooleanNumber.YES)}>正常</SelectItem>
            <SelectItem value={String(BooleanNumber.NO)}>已禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 hover:border-solid">
            <div className="flex items-center gap-3">
              <Button className="size-12 rounded-lg border-dashed" variant="outline">
                <Plus />
              </Button>
              <div className="flex flex-col">
                <span>创建用户</span>
                <span className="text-muted-foreground py-1 text-xs font-medium">添加新的用户</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-card flex h-28 flex-col gap-4 rounded-lg border p-4">
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
          ) : data?.items && data.items.length > 0 ? (
            data.items.map((user) => (
              <div
                key={user.id}
                className="group/user-item bg-card relative flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="relative size-12 rounded-lg after:rounded-lg">
                    <AvatarImage
                      src={user.avatar || ""}
                      alt={user.nickname || user.username}
                      className="rounded-lg"
                    />
                    <AvatarFallback className="size-12 rounded-lg">
                      <UserIcon className="size-6" />
                    </AvatarFallback>
                    <div className="center absolute inset-0 z-1 rounded-lg bg-black/5 opacity-0 backdrop-blur-xl transition-opacity group-hover/user-item:opacity-100 dark:bg-black/15">
                      <Switch
                        checked={user.status === BooleanNumber.YES}
                        onCheckedChange={() => handleToggleStatus(user)}
                        disabled={setStatusMutation.isPending || user.isRoot === BooleanNumber.YES}
                      />
                    </div>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="line-clamp-1">
                      {user.nickname || user.username}
                      {user.nickname && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({user.username})
                        </span>
                      )}
                    </span>
                    <p className="text-muted-foreground group/user-id flex items-center text-xs">
                      <span className="truncate">{user.userNo}</span>
                      <Button
                        className="size-fit shrink-0 rounded-[4px] p-0.5 opacity-0 group-hover/user-id:opacity-100"
                        variant="ghost"
                        onClick={() => copy(user.userNo)}
                        disabled={isCopying}
                      >
                        <Copy className="size-3" />
                      </Button>
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                        <EllipsisVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Edit />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Key />
                        重置密码
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(user)}
                        disabled={deleteMutation.isPending || user.isRoot === BooleanNumber.YES}
                      >
                        <Trash2 />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge isActive={user.status === BooleanNumber.YES} />
                  {user.role && <Badge variant="secondary">{user.role.name}</Badge>}
                  {user.isRoot === BooleanNumber.YES && <Badge variant="default">超级管理员</Badge>}
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <ClockPlus className="size-3" />
                    创建于 {new Date(user.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-1 flex h-28 items-center justify-center gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
              <span className="text-muted-foreground text-sm">
                {queryParams.keyword
                  ? `没有找到与"${queryParams.keyword}"相关的用户`
                  : "暂无用户数据"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-background sticky bottom-0 flex py-2">
        <PaginationComponent className="mx-0 w-fit" />
      </div>
    </div>
  );
};

export default UserListIndexPage;
