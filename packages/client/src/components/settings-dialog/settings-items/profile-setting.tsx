import { uploadFileAuto, useUserInfoQuery } from "@buildingai/services/shared";
import {
  type AllowedUserField,
  getWechatQrcode,
  getWechatQrcodeBindStatus,
  useBindPhoneMutation,
  useChangePasswordMutation,
  useSendBindPhoneCodeMutation,
  useUpdateUserFieldMutation,
} from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { RootOnly } from "@buildingai/ui/components/auth/root-only";
import { CopyButton } from "@buildingai/ui/components/copy-button";
import SvgIcons from "@buildingai/ui/components/svg-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input, PasswordInput } from "@buildingai/ui/components/ui/input";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, CheckCircle2, Link, Loader2, PenLine, User, X } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SettingItem, SettingItemAction, SettingItemGroup } from "../setting-item";

const MOBILE_REGEX = /^1[3-9]\d{9}$/;

type PhoneBindingInfo = {
  phone?: string;
  phoneAreaCode?: string;
};

const ProfileSetting = () => {
  const queryClient = useQueryClient();
  const { isLogin, logout } = useAuthStore((state) => state.authActions);
  const { data } = useUserInfoQuery();
  const phoneBindingInfo = (data ?? {}) as PhoneBindingInfo;

  const [editingField, setEditingField] = useState<AllowedUserField | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [wechatBindOpen, setWechatBindOpen] = useState(false);
  const [wechatQrUrl, setWechatQrUrl] = useState("");
  const [wechatQrKey, setWechatQrKey] = useState("");
  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatStatus, setWechatStatus] = useState<
    "normal" | "success" | "invalid" | "error" | "code_error"
  >("normal");
  const wechatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wechatPollStartRef = useRef<number>(0);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [bindMobile, setBindMobile] = useState("");
  const [bindCode, setBindCode] = useState("");
  const [smsCountdown, setSmsCountdown] = useState(0);

  const { mutate: updateField, isPending } = useUpdateUserFieldMutation();

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { mutate: changePassword, isPending: isChangePasswordPending } = useChangePasswordMutation({
    onSuccess: async () => {
      toast.success("密码已修改，请重新登录");
      setPasswordDialogOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await logout();
      window.location.replace("/login");
    },
    onError: (e) => {
      toast.error(e.message || "修改密码失败");
    },
  });

  const handleChangePasswordSubmit = useCallback(() => {
    if (!oldPassword.trim()) {
      toast.error("请输入当前密码");
      return;
    }
    if (!newPassword.trim()) {
      toast.error("请输入新密码");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("新密码至少 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPassword)) {
      toast.error("新密码须同时包含字母和数字");
      return;
    }
    changePassword({
      oldPassword: oldPassword.trim(),
      newPassword: newPassword.trim(),
      confirmPassword: confirmPassword.trim(),
    });
  }, [oldPassword, newPassword, confirmPassword, changePassword]);

  const fetchWechatQrCode = useCallback(async () => {
    setWechatLoading(true);
    setWechatStatus("normal");
    setWechatQrUrl("");
    setWechatQrKey("");
    try {
      const res = await getWechatQrcode(300);
      setWechatQrUrl(res.url);
      setWechatQrKey(res.key ?? "");
    } catch {
      setWechatStatus("code_error");
    } finally {
      setWechatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!wechatBindOpen) return;
    fetchWechatQrCode();
  }, [wechatBindOpen, fetchWechatQrCode]);

  useEffect(() => {
    if (!wechatQrKey || wechatStatus === "success" || wechatStatus === "invalid") return;
    const POLL_INTERVAL = 2000;
    const MAX_POLL_MS = 60 * 1000;
    wechatPollStartRef.current = Date.now();
    wechatPollRef.current = setInterval(async () => {
      if (Date.now() - wechatPollStartRef.current > MAX_POLL_MS) {
        if (wechatPollRef.current) clearInterval(wechatPollRef.current);
        wechatPollRef.current = null;
        setWechatStatus("invalid");
        return;
      }
      try {
        const res = await getWechatQrcodeBindStatus(wechatQrKey);
        if (res.is_scan && res.success) {
          if (wechatPollRef.current) clearInterval(wechatPollRef.current);
          wechatPollRef.current = null;
          setWechatStatus("success");
          void queryClient.invalidateQueries({ queryKey: ["user", "info"] });
          toast.success("微信绑定成功");
          setWechatBindOpen(false);
        } else if (res.error) {
          if (wechatPollRef.current) clearInterval(wechatPollRef.current);
          wechatPollRef.current = null;
          setWechatStatus("error");
          toast.error(res.error);
        }
      } catch {
        if (wechatPollRef.current) clearInterval(wechatPollRef.current);
        wechatPollRef.current = null;
        setWechatStatus("invalid");
      }
    }, POLL_INTERVAL);
    return () => {
      if (wechatPollRef.current) clearInterval(wechatPollRef.current);
      wechatPollRef.current = null;
    };
  }, [wechatQrKey, wechatStatus, queryClient]);

  useEffect(() => {
    if (!wechatBindOpen) {
      if (wechatPollRef.current) clearInterval(wechatPollRef.current);
      wechatPollRef.current = null;
      setWechatQrUrl("");
      setWechatQrKey("");
      setWechatStatus("normal");
    }
  }, [wechatBindOpen]);
  const { mutateAsync: sendBindCode, isPending: isSendBindCodePending } =
    useSendBindPhoneCodeMutation();
  const { mutateAsync: bindPhone, isPending: isBindPhonePending } = useBindPhoneMutation();

  const handleAvatarClick = useCallback(() => {
    avatarInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingAvatar(true);
      try {
        const result = await uploadFileAuto(file, { description: "avatar" });
        updateField(
          { field: "avatar", value: result.url },
          {
            onSuccess: () => {
              toast.success("头像已更新");
            },
            onSettled: () => {
              setIsUploadingAvatar(false);
              if (avatarInputRef.current) {
                avatarInputRef.current.value = "";
              }
            },
          },
        );
      } catch {
        toast.error("头像上传失败");
        setIsUploadingAvatar(false);
        if (avatarInputRef.current) {
          avatarInputRef.current.value = "";
        }
      }
    },
    [updateField],
  );

  const handleStartEdit = useCallback((field: AllowedUserField, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue("");
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingField) return;

    updateField(
      { field: editingField, value: editValue },
      {
        onSuccess: () => {
          setEditingField(null);
          setEditValue("");
        },
      },
    );
  }, [editingField, editValue, updateField]);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  useEffect(() => {
    if (smsCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSmsCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [smsCountdown]);

  /**
   * 打开手机号绑定弹窗。
   */
  const handleOpenPhoneDialog = useCallback(() => {
    setBindMobile(phoneBindingInfo.phone || "");
    setBindCode("");
    setSmsCountdown(0);
    setPhoneDialogOpen(true);
  }, [phoneBindingInfo.phone]);

  /**
   * 发送绑定验证码。
   */
  const handleSendBindCode = useCallback(async () => {
    const mobile = bindMobile.trim();
    if (!MOBILE_REGEX.test(mobile)) {
      toast.error("请输入有效手机号");
      return;
    }

    if (smsCountdown > 0) {
      return;
    }

    await sendBindCode({ mobile, areaCode: "86" });
    toast.success("验证码已发送");
    setSmsCountdown(60);
  }, [bindMobile, sendBindCode, smsCountdown]);

  /**
   * 提交手机号绑定。
   */
  const handleSubmitBindPhone = useCallback(async () => {
    const mobile = bindMobile.trim();
    const code = bindCode.trim();

    if (!MOBILE_REGEX.test(mobile)) {
      toast.error("请输入有效手机号");
      return;
    }

    if (code.length !== 6) {
      toast.error("请输入6位验证码");
      return;
    }

    await bindPhone({
      mobile,
      code,
      areaCode: "86",
    });
    toast.success("手机号绑定成功");
    setPhoneDialogOpen(false);
    setBindCode("");
  }, [bindCode, bindMobile, bindPhone]);

  return (
    <div className="flex flex-col gap-4">
      <SettingItemGroup label="基本信息">
        <SettingItem
          title={
            <Avatar className="size-10 rounded-lg after:rounded-lg">
              {isLogin() && (
                <AvatarImage className="rounded-lg" src={data?.avatar} alt={data?.nickname} />
              )}
              <AvatarFallback className="rounded-lg">
                {isLogin() ? data?.nickname?.slice(0, 1) : <User />}
              </AvatarFallback>
            </Avatar>
          }
        >
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <SettingItemAction onClick={handleAvatarClick} disabled={isUploadingAvatar}>
            {isUploadingAvatar ? <Loader2 className="animate-spin" /> : <PenLine />}
          </SettingItemAction>
        </SettingItem>
        <SettingItem
          title={
            editingField === "nickname" ? (
              <Input
                ref={inputRef}
                className="h-5 w-full rounded-none border-0 border-none bg-transparent! px-0 shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                disabled={isPending}
              />
            ) : (
              data?.nickname
            )
          }
          description="昵称"
        >
          {editingField === "nickname" ? (
            <div className="flex items-center gap-1">
              <SettingItemAction onClick={handleSaveEdit} disabled={isPending}>
                <Check />
              </SettingItemAction>
              <SettingItemAction onClick={handleCancelEdit} disabled={isPending}>
                <X />
              </SettingItemAction>
            </div>
          ) : (
            <SettingItemAction onClick={() => handleStartEdit("nickname", data?.nickname || "")}>
              <PenLine />
            </SettingItemAction>
          )}
        </SettingItem>
        <SettingItem title={data?.username} description="用户名">
          <SettingItemAction asChild>
            <CopyButton value={data?.username ?? ""} />
          </SettingItemAction>
        </SettingItem>
        <SettingItem title={data?.userNo} description="用户编号">
          <SettingItemAction asChild>
            <CopyButton value={data?.userNo ?? ""} />
          </SettingItemAction>
        </SettingItem>
        <SettingItem
          title={
            editingField === "email" ? (
              <Input
                ref={inputRef}
                className="h-5 w-full rounded-none border-0 border-none bg-transparent! px-0 shadow-none ring-0 focus-within:ring-0 focus-visible:ring-0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                disabled={isPending}
              />
            ) : (
              data?.email || "--"
            )
          }
          description="邮箱"
        >
          {editingField === "email" ? (
            <div className="flex items-center gap-1">
              <SettingItemAction onClick={handleSaveEdit} disabled={isPending}>
                <Check />
              </SettingItemAction>
              <SettingItemAction onClick={handleCancelEdit} disabled={isPending}>
                <X />
              </SettingItemAction>
            </div>
          ) : (
            <SettingItemAction onClick={() => handleStartEdit("email", data?.email || "")}>
              <PenLine />
            </SettingItemAction>
          )}
        </SettingItem>
      </SettingItemGroup>

      <SettingItemGroup label="安全设置">
        <SettingItem title={data?.hasPassword ? "已设置" : "未设置"} description="密码">
          {data?.hasPassword && (
            <SettingItemAction onClick={() => setPasswordDialogOpen(true)}>
              <PenLine />
            </SettingItemAction>
          )}
        </SettingItem>
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>修改密码</DialogTitle>
              <DialogDescription>
                修改成功后将退出登录，请使用新密码重新登录。新密码须至少 6 位且包含字母和数字。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-muted-foreground text-sm font-medium">当前密码</label>
                <PasswordInput
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入当前密码"
                  autoComplete="current-password"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-muted-foreground text-sm font-medium">新密码</label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 6 位，含字母和数字"
                  autoComplete="new-password"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-muted-foreground text-sm font-medium">确认新密码</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPasswordDialogOpen(false)}
                  disabled={isChangePasswordPending}
                >
                  取消
                </Button>
                <Button onClick={handleChangePasswordSubmit} loading={isChangePasswordPending}>
                  确认修改
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <SettingItem
          title={
            phoneBindingInfo.phone
              ? `${phoneBindingInfo.phoneAreaCode ? `+${phoneBindingInfo.phoneAreaCode} ` : ""}${phoneBindingInfo.phone}`
              : "未绑定"
          }
          description="手机号"
        >
          <SettingItemAction onClick={handleOpenPhoneDialog}>
            <PenLine />
          </SettingItemAction>
        </SettingItem>
        <SettingItem
          title={data?.bindWechatOa ? "已绑定" : "未绑定"}
          description={
            <div className="flex items-center gap-0.5">
              <SvgIcons.wechat className="size-3" />
              关联微信
            </div>
          }
        >
          {!data?.bindWechatOa && (
            <SettingItemAction variant="ghost" size="sm" onClick={() => setWechatBindOpen(true)}>
              <span className="flex items-center gap-0.5">
                <Link />
                去绑定
              </span>
            </SettingItemAction>
          )}
        </SettingItem>
        <Dialog open={wechatBindOpen} onOpenChange={setWechatBindOpen}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>关联微信</DialogTitle>
              <DialogDescription>请使用微信扫描二维码完成绑定</DialogDescription>
            </DialogHeader>
            <div className="flex w-full flex-col items-center justify-center gap-4 py-2">
              <div className="relative flex size-52 items-center justify-center overflow-hidden rounded-lg border p-1">
                {wechatLoading && <Skeleton className="size-full" />}
                {!wechatLoading && wechatQrUrl && (
                  <>
                    <img
                      src={wechatQrUrl}
                      alt="微信绑定二维码"
                      className="pointer-events-none size-full object-contain select-none"
                    />
                    {(wechatStatus === "success" ||
                      wechatStatus === "invalid" ||
                      wechatStatus === "error" ||
                      wechatStatus === "code_error") && (
                      <div className="bg-background/80 absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                        {wechatStatus === "success" && (
                          <>
                            <CheckCircle2 className="text-primary mb-2 size-12" />
                            <p className="text-muted-foreground text-sm">绑定成功</p>
                          </>
                        )}
                        {(wechatStatus === "invalid" || wechatStatus === "error") && (
                          <>
                            <AlertCircle className="text-destructive mb-2 size-12" />
                            <p className="text-muted-foreground mb-3 text-center text-sm">
                              {wechatStatus === "invalid"
                                ? "二维码已过期，请刷新"
                                : "绑定失败，请重试"}
                            </p>
                            <Button size="sm" variant="secondary" onClick={fetchWechatQrCode}>
                              刷新二维码
                            </Button>
                          </>
                        )}
                        {wechatStatus === "code_error" && (
                          <>
                            <AlertCircle className="text-destructive mb-2 size-12" />
                            <p className="text-muted-foreground mb-3 text-center text-sm">
                              获取二维码失败，请重试
                            </p>
                            <Button size="sm" variant="secondary" onClick={fetchWechatQrCode}>
                              刷新二维码
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <RootOnly reverse>
          <SettingItem title="注销账号" description="您的账号数据将会被永久删除，此操作不可逆">
            <SettingItemAction variant="destructive" size="sm">
              注销
            </SettingItemAction>
          </SettingItem>
        </RootOnly>
      </SettingItemGroup>

      <SettingItemGroup label="注册信息">
        <SettingItem
          title={<TimeText value={data?.lastLoginAt} format="YYYY/MM/DD HH:mm" />}
          description="最后登录时间"
        />
        <SettingItem
          title={<TimeText value={data?.createdAt} format="YYYY/MM/DD HH:mm" />}
          description="注册时间"
        />
      </SettingItemGroup>

      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>绑定手机号</DialogTitle>
            <DialogDescription>请输入手机号并完成短信验证码验证</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">手机号</label>
              <Input
                value={bindMobile}
                onChange={(e) => setBindMobile(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="请输入手机号"
                disabled={isSendBindCodePending || isBindPhonePending}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">验证码</label>
              <div className="flex items-center gap-2">
                <Input
                  value={bindCode}
                  onChange={(e) => setBindCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="请输入验证码"
                  disabled={isBindPhonePending}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendBindCode}
                  disabled={smsCountdown > 0 || isSendBindCodePending || isBindPhonePending}
                >
                  {isSendBindCodePending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : smsCountdown > 0 ? (
                    `${smsCountdown}s`
                  ) : (
                    "发送验证码"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPhoneDialogOpen(false)}
              disabled={isBindPhonePending}
            >
              取消
            </Button>
            <Button type="button" onClick={handleSubmitBindPhone} disabled={isBindPhonePending}>
              {isBindPhonePending && <Loader2 className="mr-2 size-4 animate-spin" />}
              确认绑定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { ProfileSetting };
