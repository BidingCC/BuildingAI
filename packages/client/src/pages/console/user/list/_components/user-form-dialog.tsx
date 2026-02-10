import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import {
  type CreateUserDto,
  type Role,
  type UpdateUserDto,
  useCreateUserMutation,
  type User,
  useRolesQuery,
  useUpdateUserMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z
  .object({
    username: z
      .string({ message: "用户名必须填写" })
      .min(2, "用户名至少2个字符")
      .max(50, "用户名不能超过50个字符"),
    password: z.string().optional(),
    nickname: z.string().max(50, "昵称不能超过50个字符").optional(),
    email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
    phone: z.string().max(20, "手机号不能超过20个字符").optional(),
    avatar: z.string().url("请输入有效的URL地址").optional().or(z.literal("")),
    roleId: z.string().optional(),
    status: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Password is required only for create mode (when there's no existing user)
      return true;
    },
    { message: "密码必须填写", path: ["password"] },
  );

type FormValues = z.infer<typeof formSchema>;

type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess?: () => void;
};

/**
 * User form dialog component for creating and updating users
 */
export const UserFormDialog = ({ open, onOpenChange, user, onSuccess }: UserFormDialogProps) => {
  const isEditMode = !!user;

  const { data: roles } = useRolesQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      username: "",
      password: "",
      nickname: "",
      email: "",
      phone: "",
      avatar: "",
      roleId: "",
      status: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          username: user.username,
          password: "",
          nickname: user.nickname || "",
          email: user.email || "",
          phone: user.phone || "",
          avatar: user.avatar || "",
          roleId: user.role?.id || "",
          status: user.status === BooleanNumber.YES,
        });
      } else {
        form.reset({
          username: "",
          password: "",
          nickname: "",
          email: "",
          phone: "",
          avatar: "",
          roleId: "",
          status: true,
        });
      }
    }
  }, [open, user, form]);

  const createMutation = useCreateUserMutation({
    onSuccess: () => {
      toast.success("用户创建成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMutation = useUpdateUserMutation({
    onSuccess: () => {
      toast.success("用户更新成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    if (isEditMode && user) {
      const dto: UpdateUserDto = {
        nickname: values.nickname || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        avatar: values.avatar || undefined,
        roleId: values.roleId || undefined,
        status: values.status ? BooleanNumber.YES : BooleanNumber.NO,
      };
      updateMutation.mutate({ id: user.id, dto });
    } else {
      if (!values.password) {
        form.setError("password", { message: "密码必须填写" });
        return;
      }
      const dto: CreateUserDto = {
        username: values.username,
        password: values.password,
        nickname: values.nickname || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        avatar: values.avatar || undefined,
        roleId: values.roleId || undefined,
        status: values.status ? BooleanNumber.YES : BooleanNumber.NO,
      };
      createMutation.mutate(dto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>{isEditMode ? "编辑用户" : "创建用户"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改用户的基本信息" : "添加一个新的系统用户"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入用户名" {...field} disabled={isEditMode} />
                    </FormControl>
                    <FormDescription>用户登录时使用的账号名，创建后不可修改</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isEditMode && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="请输入密码" {...field} />
                      </FormControl>
                      <FormDescription>用户登录时使用的密码</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>昵称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入昵称（可选）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="请输入邮箱（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>手机号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入手机号（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>头像URL</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入头像地址（可选）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择角色（可选）" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles?.map((role: Role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                            {role.description && (
                              <span className="text-muted-foreground ml-2 text-xs">
                                ({role.description})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-center">
                    <FormLabel>启用状态</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <span className="text-muted-foreground text-sm">
                        {field.value ? "已启用" : "已禁用"}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-lg p-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {isEditMode ? "保存" : "创建"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
