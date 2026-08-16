import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { useCopy } from "@buildingai/hooks";
import {
  type QueryUserDto,
  useDeleteUserMutation,
  type User,
  useSetUserStatusMutation,
  useUsersListQuery,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
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
import { StatusBadge } from "@buildingai/ui/components/ui/status-badge";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import {
  ClockPlus,
  Copy,
  Crown,
  Edit,
  EllipsisVertical,
  Key,
  Plus,
  Sparkles,
  Trash2,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { BalanceAdjustmentDialog } from "./_components/balance-adjustment-dialog";
import { MembershipAdjustmentDialog } from "./_components/membership-adjustment-dialog";
import { ResetPasswordDialog } from "./_components/reset-password-dialog";
import { SubscriptionRecordsDialog } from "./_components/subscription-records-dialog";
import { UserFormDialog } from "./_components/user-form-dialog";

const PAGE_SIZE = 25;

const UserListIndexPage = () => {
  const { copy, isCopying } = useCopy();
  const { confirm } = useAlertDialog();
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const [queryParams, setQueryParams] = useState<QueryUserDto>({
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [membershipAdjustmentDialogOpen, setMembershipAdjustmentDialogOpen] = useState(false);
  const [membershipAdjustmentUser, setMembershipAdjustmentUser] = useState<User | null>(null);
  const [balanceAdjustmentDialogOpen, setBalanceAdjustmentDialogOpen] = useState(false);
  const [balanceAdjustmentUser, setBalanceAdjustmentUser] = useState<User | null>(null);
  const [subscriptionRecordsDialogOpen, setSubscriptionRecordsDialogOpen] = useState(false);
  const [subscriptionRecordsUser, setSubscriptionRecordsUser] = useState<User | null>(null);

  // Update query params when debounced keyword changes
  useEffect(() => {
    setQueryParams((prev) => ({
      ...prev,
      keyword: debouncedKeyword || undefined,
      page: 1,
    }));
  }, [debouncedKeyword]);

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
    setKeyword(value);
  };

  const handleStatusChange = (value: string) => {
    setQueryParams((prev) => ({
      ...prev,
      status: value === "all" ? undefined : (Number(value) as QueryUserDto["status"]),
      page: 1,
    }));
  };

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col gap-4">
        <div className="bg-background sticky top-0 z-2 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <Input
            placeholder="通过用户编号/昵称/手机号搜索"
            className="text-sm"
            value={keyword}
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
            <PermissionGuard permissions="users:create">
              <div
                className="bg-card flex cursor-pointer flex-col gap-4 rounded-lg border border-dashed p-4 hover:border-solid"
                onClick={() => {
                  setEditingUser(null);
                  setFormDialogOpen(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <Button className="size-12 rounded-lg border-dashed" variant="outline">
                    <Plus />
                  </Button>
                  <div className="flex flex-col">
                    <span>创建用户</span>
                    <span className="text-muted-foreground py-1 text-xs font-medium">
                      添加新的用户
                    </span>
                  </div>
                </div>
              </div>
            </PermissionGuard>

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
                      <PermissionGuard permissions="users:update-status">
                        <div className="center absolute inset-0 z-1 rounded-lg bg-black/5 opacity-0 backdrop-blur-xl transition-opacity group-hover/user-item:opacity-100 dark:bg-black/15">
                          <Switch
                            checked={user.status === BooleanNumber.YES}
                            onCheckedChange={() => handleToggleStatus(user)}
                            disabled={
                              setStatusMutation.isPending || user.isRoot === BooleanNumber.YES
                            }
                          />
                        </div>
                      </PermissionGuard>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="flex items-center gap-1">
                        <span className="truncate">{user.nickname || user.username}</span>
                        {user.nickname && (
                          <span className="text-muted-foreground pr-4 text-xs whitespace-nowrap">
                            ({user.username})
                          </span>
                        )}
                      </span>
                      <p className="text-muted-foreground group/user-id flex items-center text-xs">
                        <span className="truncate">{user.userNo}</span>
                        <Button
                          className="size-fit shrink-0 rounded-[4px] p-0.5 opacity-0! group-hover/user-id:opacity-100!"
                          variant="ghost"
                          onClick={() => copy(user.userNo)}
                          disabled={isCopying}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </p>
                    </div>

                    <PermissionGuard
                      permissions={[
                        "users:update",
                        "membership-order:system-adjustment",
                        "users:change-balance",
                        "users:reset-password",
                        "users:detail",
                        "users:delete",
                      ]}
                      any
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                            <EllipsisVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <PermissionGuard permissions="users:update">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingUser(user);
                                setFormDialogOpen(true);
                              }}
                            >
                              <Edit />
                              编辑
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard permissions="membership-order:system-adjustment">
                            <DropdownMenuItem
                              onClick={() => {
                                setMembershipAdjustmentUser(user);
                                setMembershipAdjustmentDialogOpen(true);
                              }}
                            >
                              <Crown />
                              调整会员
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard permissions="users:change-balance">
                            <DropdownMenuItem
                              onClick={() => {
                                setBalanceAdjustmentUser(user);
                                setBalanceAdjustmentDialogOpen(true);
                              }}
                            >
                              <Zap />
                              调整积分
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard permissions="users:reset-password">
                            <DropdownMenuItem
                              onClick={() => {
                                setResetPasswordUser(user);
                                setResetPasswordDialogOpen(true);
                              }}
                            >
                              <Key />
                              重置密码
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard permissions="users:detail">
                            <DropdownMenuItem
                              onClick={() => {
                                setSubscriptionRecordsUser(user);
                                setSubscriptionRecordsDialogOpen(true);
                              }}
                            >
                              <Sparkles />
                              订阅记录
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <DropdownMenuSeparator />
                          <PermissionGuard permissions="users:delete">
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDelete(user)}
                              disabled={
                                deleteMutation.isPending || user.isRoot === BooleanNumber.YES
                              }
                            >
                              <Trash2 />
                              删除
                            </DropdownMenuItem>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PermissionGuard>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge active={user.status === BooleanNumber.YES} activeText="正常" />
                    {user.role && <Badge variant="secondary">{user.role.name}</Badge>}
                    {user.isRoot === BooleanNumber.YES && (
                      <Badge variant="default">超级管理员</Badge>
                    )}
                    {user.membershipLevel && (
                      <Badge variant="secondary">
                        <Crown />
                        {user.membershipLevel.name}
                      </Badge>
                    )}
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

        <div className="bg-background sticky bottom-0 z-2 flex py-2">
          <PaginationComponent className="mx-0 w-fit" />
        </div>
      </div>
      <UserFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        userId={editingUser?.id}
        onSuccess={() => refetch()}
      />
      {resetPasswordUser && (
        <ResetPasswordDialog
          open={resetPasswordDialogOpen}
          onOpenChange={setResetPasswordDialogOpen}
          userId={resetPasswordUser.id}
          nickname={resetPasswordUser.nickname}
          onSuccess={() => refetch()}
        />
      )}
      <MembershipAdjustmentDialog
        open={membershipAdjustmentDialogOpen}
        onOpenChange={setMembershipAdjustmentDialogOpen}
        user={membershipAdjustmentUser}
        onSuccess={() => refetch()}
      />
      <BalanceAdjustmentDialog
        open={balanceAdjustmentDialogOpen}
        onOpenChange={setBalanceAdjustmentDialogOpen}
        user={balanceAdjustmentUser}
        onSuccess={() => refetch()}
      />
      {subscriptionRecordsUser && (
        <SubscriptionRecordsDialog
          open={subscriptionRecordsDialogOpen}
          onOpenChange={setSubscriptionRecordsDialogOpen}
          userId={subscriptionRecordsUser.id}
          userName={subscriptionRecordsUser.nickname || subscriptionRecordsUser.username}
        />
      )}
    </PageContainer>
  );
};

export default UserListIndexPage;
