import { BooleanNumber } from "@buildingai/constants/shared/status-codes.constant";
import { useI18n } from "@buildingai/i18n";
import {
  type CreateUserDto,
  type Role,
  type UpdateUserDto,
  useCreateUserMutation,
  useRolesQuery,
  useUpdateUserMutation,
  useUserDetailQuery,
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
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BalanceAdjustmentDialog } from "./balance-adjustment-dialog";
import { MembershipAdjustmentDialog } from "./membership-adjustment-dialog";

const formSchema = z
  .object({
    username: z
      .string({ message: "user.dialog.userForm.username.required" })
      .min(2, "user.dialog.userForm.username.minLength")
      .max(50, "user.dialog.userForm.username.maxLength"),
    password: z.string().optional(),
    nickname: z.string().max(50, "user.dialog.userForm.nickname.maxLength").optional(),
    email: z.string().email("user.dialog.userForm.email.invalid").optional().or(z.literal("")),
    phone: z.string().max(20, "user.dialog.userForm.phone.maxLength").optional(),
    avatar: z.string().optional(),
    roleId: z.string().optional(),
    status: z.boolean().optional(),
    power: z.number().optional(),
    realName: z.string().max(50, "user.dialog.userForm.realName.maxLength").optional(),
  })
  .refine(
    () => {
      return true;
    },
    { message: "user.dialog.userForm.password.required", path: ["password"] },
  );

type FormValues = z.infer<typeof formSchema>;

type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string | null;
  onSuccess?: () => void;
};

/**
 * User form dialog component for creating and updating users
 */
export const UserFormDialog = ({ open, onOpenChange, userId, onSuccess }: UserFormDialogProps) => {
  const { t } = useI18n();
  const isEditMode = !!userId;
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);

  const { data: roles } = useRolesQuery();

  const { data: userDetail, refetch: refetchUserDetail } = useUserDetailQuery(userId || "", {
    enabled: isEditMode && open,
  });

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
      realName: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (userDetail) {
        form.reset({
          username: userDetail.username,
          password: "",
          nickname: userDetail.nickname || "",
          email: userDetail.email || "",
          phone: userDetail.phone || "",
          avatar: userDetail.avatar || "",
          roleId: userDetail.role?.id || "",
          status: userDetail.status === BooleanNumber.YES,
          power: userDetail.power,
          realName: userDetail.realName || "",
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
          power: 0,
          realName: "",
        });
      }
    }
  }, [open, userDetail, form]);

  const createMutation = useCreateUserMutation({
    onSuccess: () => {
      toast.success(t("user.dialog.userForm.createSuccess") || "User created successfully");
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateMutation = useUpdateUserMutation({
    onSuccess: () => {
      toast.success(t("user.dialog.userForm.updateSuccess") || "User updated successfully");
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (values: FormValues) => {
    const { power: _power, ...submitValues } = values;

    if (isEditMode && userId && userDetail) {
      const dto: UpdateUserDto = {
        nickname: submitValues.nickname || undefined,
        email: submitValues.email || undefined,
        phone: submitValues.phone || undefined,
        avatar: submitValues.avatar || undefined,
        roleId: submitValues.roleId || undefined,
        status: submitValues.status ? BooleanNumber.YES : BooleanNumber.NO,
        realName: submitValues.realName || undefined,
      };
      if (submitValues.roleId === "no-role") {
        dto.roleId = "";
      }
      updateMutation.mutate({ id: userId, dto });
    } else {
      if (!submitValues.password) {
        form.setError("password", { message: t("user.dialog.userForm.password.required") });
        return;
      }
      const dto: CreateUserDto = {
        username: submitValues.username,
        password: submitValues.password,
        nickname: submitValues.nickname || undefined,
        email: submitValues.email || undefined,
        phone: submitValues.phone || undefined,
        avatar: submitValues.avatar || undefined,
        roleId: submitValues.roleId || undefined,
        status: submitValues.status ? BooleanNumber.YES : BooleanNumber.NO,
        realName: submitValues.realName || undefined,
      };
      if (submitValues.roleId === "no-role") {
        dto.roleId = "";
      }
      createMutation.mutate(dto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4">
          <DialogTitle>
            {isEditMode
              ? t("user.dialog.userForm.editTitle")
              : t("user.dialog.userForm.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("user.dialog.userForm.editDescription")
              : t("user.dialog.userForm.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 pt-0 pb-17">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="avatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("user.dialog.userForm.avatar")}</FormLabel>
                      <FormControl>
                        <ImageUpload
                          size="sm"
                          value={field.value}
                          onChange={(url) => field.onChange(url ?? "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>{t("user.dialog.userForm.status.label")}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          className="flex gap-4"
                          value={field.value ? "true" : "false"}
                          onValueChange={(v) => field.onChange(v === "true")}
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="true" />
                            {t("user.dialog.userForm.status.enabled")}
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="false" />
                            {t("user.dialog.userForm.status.disabled")}
                          </label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("user.dialog.userForm.username.label")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("user.dialog.userForm.username.placeholder")}
                        autoComplete="off"
                        {...field}
                        disabled={isEditMode}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("user.dialog.userForm.username.description")}
                    </FormDescription>
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
                      <FormLabel required>{t("user.dialog.userForm.password.label")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("user.dialog.userForm.password.placeholder")}
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("user.dialog.userForm.password.description")}
                      </FormDescription>
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
                    <FormLabel>{t("user.dialog.userForm.nickname.label")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("user.dialog.userForm.nickname.placeholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("user.dialog.userForm.role.label")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("user.dialog.userForm.role.placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={"no-role"}>
                            {t("user.dialog.userForm.role.noRole")}
                          </SelectItem>
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
                  name="realName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("user.dialog.userForm.realName.label")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("user.dialog.userForm.realName.placeholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isEditMode && (
                <FormField
                  control={form.control}
                  name="power"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("user.dialog.userForm.credits.label")}</FormLabel>
                      <FormControl>
                        <InputGroup className="w-full">
                          <InputGroupInput
                            value={field.value?.toString() ?? ""}
                            disabled={true}
                            readOnly
                          />
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton onClick={() => setBalanceDialogOpen(true)}>
                              <Pencil />
                            </InputGroupButton>
                          </InputGroupAddon>
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("user.dialog.userForm.email.label")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("user.dialog.userForm.email.placeholder")}
                          {...field}
                        />
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
                      <FormLabel>{t("user.dialog.userForm.phone.label")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("user.dialog.userForm.phone.placeholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isEditMode && (
                <FormItem>
                  <FormLabel>{t("user.dialog.userForm.membership.label")}</FormLabel>
                  <div className="bg-muted flex items-center justify-between rounded-lg p-3">
                    {userDetail?.membershipLevel ? (
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div>{userDetail.membershipLevel.name}</div>
                          {userDetail.membershipLevel.endTime && (
                            <div className="text-muted-foreground text-sm">
                              {t("user.dialog.userForm.membership.validUntil", { date: "" })}{" "}
                              <TimeText
                                value={userDetail.membershipLevel.endTime}
                                format="YYYY/MM/DD"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div>{t("user.dialog.userForm.membership.regularUser")}</div>
                          <div className="text-muted-foreground text-sm">
                            {t("user.dialog.userForm.membership.validUntil", { date: "--" })}
                          </div>
                        </div>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setMembershipDialogOpen(true)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                </FormItem>
              )}

              <DialogFooter className="bg-background absolute bottom-0 left-0 w-full flex-row justify-end rounded-lg p-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("user.dialog.userForm.cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {isEditMode ? t("user.dialog.userForm.save") : t("user.dialog.userForm.create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>

        {userId && userDetail && (
          <BalanceAdjustmentDialog
            open={balanceDialogOpen}
            onOpenChange={setBalanceDialogOpen}
            user={userDetail}
            onSuccess={() => {
              setBalanceDialogOpen(false);
              refetchUserDetail();
              onSuccess?.();
            }}
          />
        )}

        {userId && userDetail && (
          <MembershipAdjustmentDialog
            open={membershipDialogOpen}
            onOpenChange={setMembershipDialogOpen}
            user={userDetail}
            onSuccess={() => {
              setMembershipDialogOpen(false);
              refetchUserDetail();
              onSuccess?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
