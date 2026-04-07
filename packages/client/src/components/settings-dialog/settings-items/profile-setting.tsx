import { useI18n } from "@buildingai/i18n";
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
  const { t } = useI18n();
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
      toast.success(t("profile.passwordChanged"));
      setPasswordDialogOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await logout();
      window.location.replace("/login");
    },
    onError: (e) => {
      toast.error(e.message || t("profile.changePasswordFailed"));
    },
  });

  const handleChangePasswordSubmit = useCallback(() => {
    if (!oldPassword.trim()) {
      toast.error(t("profile.enterCurrentPassword"));
      return;
    }
    if (!newPassword.trim()) {
      toast.error(t("profile.enterNewPassword"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("profile.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.passwordMismatch"));
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPassword)) {
      toast.error(t("profile.passwordRequirements"));
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
          toast.success(t("profile.wechatBindSuccess"));
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
              toast.success(t("profile.avatarUpdated"));
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
        toast.error(t("profile.avatarUploadFailed"));
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
      toast.error(t("profile.enterValidPhone"));
      return;
    }

    if (smsCountdown > 0) {
      return;
    }

    await sendBindCode({ mobile, areaCode: "86" });
    toast.success(t("profile.verificationCodeSent"));
    setSmsCountdown(60);
  }, [bindMobile, sendBindCode, smsCountdown]);

  /**
   * 提交手机号绑定。
   */
  const handleSubmitBindPhone = useCallback(async () => {
    const mobile = bindMobile.trim();
    const code = bindCode.trim();

    if (!MOBILE_REGEX.test(mobile)) {
      toast.error(t("profile.enterValidPhone"));
      return;
    }

    if (code.length !== 6) {
      toast.error(t("profile.enter6DigitCode"));
      return;
    }

    await bindPhone({
      mobile,
      code,
      areaCode: "86",
    });
    toast.success(t("profile.phoneBindSuccess"));
    setPhoneDialogOpen(false);
    setBindCode("");
  }, [bindCode, bindMobile, bindPhone]);

  return (
    <div className="flex flex-col gap-4">
      <SettingItemGroup label={t("profile.basicInfo")}>
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
          description={t("profile.nickname")}
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
        <SettingItem title={data?.username} description={t("profile.username")}>
          <SettingItemAction asChild>
            <CopyButton value={data?.username ?? ""} />
          </SettingItemAction>
        </SettingItem>
        <SettingItem title={data?.userNo} description={t("profile.userId")}>
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
          description={t("profile.email")}
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

      <SettingItemGroup label={t("profile.securitySettings")}>
        <SettingItem title={data?.hasPassword ? t("profile.passwordSet") : t("profile.passwordNotSet")} description={t("profile.password")}>
          {data?.hasPassword && (
            <SettingItemAction onClick={() => setPasswordDialogOpen(true)}>
              <PenLine />
            </SettingItemAction>
          )}
        </SettingItem>
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("profile.changePassword")}</DialogTitle>
              <DialogDescription>
                {t("profile.passwordChangeDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-muted-foreground text-sm font-medium">{t("profile.currentPassword")}</label>
                <PasswordInput
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={t("profile.enterCurrentPassword")}
                  autoComplete="current-password"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-muted-foreground text-sm font-medium">{t("profile.newPassword")}</label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("profile.passwordRequirementsPlaceholder")}
                  autoComplete="new-password"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-muted-foreground text-sm font-medium">{t("profile.confirmNewPassword")}</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("profile.confirmNewPasswordPlaceholder")}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPasswordDialogOpen(false)}
                  disabled={isChangePasswordPending}
                >
                  {t("profile.cancel")}
                </Button>
                <Button onClick={handleChangePasswordSubmit} loading={isChangePasswordPending}>
                  {t("profile.confirmChange")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <SettingItem
          title={
            phoneBindingInfo.phone
              ? `${phoneBindingInfo.phoneAreaCode ? `+${phoneBindingInfo.phoneAreaCode} ` : ""}${phoneBindingInfo.phone}`
              : t("profile.notBound")
          }
          description={t("profile.phone")}
        >
          <SettingItemAction onClick={handleOpenPhoneDialog}>
            <PenLine />
          </SettingItemAction>
        </SettingItem>
        <SettingItem
          title={data?.bindWechatOa ? t("profile.bound") : t("profile.notBound")}
          description={
            <div className="flex items-center gap-0.5">
              <SvgIcons.wechat className="size-3" />
              {t("profile.linkedWechat")}
            </div>
          }
        >
          {!data?.bindWechatOa && (
            <SettingItemAction variant="ghost" size="sm" onClick={() => setWechatBindOpen(true)}>
              <span className="flex items-center gap-0.5">
                <Link />
                {t("profile.goToBind")}
              </span>
            </SettingItemAction>
          )}
        </SettingItem>
        <Dialog open={wechatBindOpen} onOpenChange={setWechatBindOpen}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>{t("profile.linkWechat")}</DialogTitle>
              <DialogDescription>{t("profile.scanQrCode")}</DialogDescription>
            </DialogHeader>
            <div className="flex w-full flex-col items-center justify-center gap-4 py-2">
              <div className="relative flex size-52 items-center justify-center overflow-hidden rounded-lg border p-1">
                {wechatLoading && <Skeleton className="size-full" />}
                {!wechatLoading && wechatQrUrl && (
                  <>
                    <img
                      src={wechatQrUrl}
                      alt={t("profile.wechatBindQrCode")}
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
                            <p className="text-muted-foreground text-sm">{t("profile.bindSuccess")}</p>
                          </>
                        )}
                        {(wechatStatus === "invalid" || wechatStatus === "error") && (
                          <>
                            <AlertCircle className="text-destructive mb-2 size-12" />
                            <p className="text-muted-foreground mb-3 text-center text-sm">
                              {wechatStatus === "invalid"
                                ? t("profile.qrCodeExpired")
                                : t("profile.bindFailed")}
                            </p>
                            <Button size="sm" variant="secondary" onClick={fetchWechatQrCode}>
                              {t("profile.refreshQrCode")}
                            </Button>
                          </>
                        )}
                        {wechatStatus === "code_error" && (
                          <>
                            <AlertCircle className="text-destructive mb-2 size-12" />
                            <p className="text-muted-foreground mb-3 text-center text-sm">
                              {t("profile.getQrCodeFailed")}
                            </p>
                            <Button size="sm" variant="secondary" onClick={fetchWechatQrCode}>
                              {t("profile.refreshQrCode")}
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
          <SettingItem title={t("profile.deleteAccount")} description={t("profile.deleteAccountDescription")}>
            <SettingItemAction variant="destructive" size="sm">
              {t("profile.delete")}
            </SettingItemAction>
          </SettingItem>
        </RootOnly>
      </SettingItemGroup>

      <SettingItemGroup label={t("profile.registrationInfo")}>
        <SettingItem
          title={<TimeText value={data?.lastLoginAt} format="YYYY/MM/DD HH:mm" />}
          description={t("profile.lastLoginTime")}
        />
        <SettingItem
          title={<TimeText value={data?.createdAt} format="YYYY/MM/DD HH:mm" />}
          description={t("profile.registrationTime")}
        />
      </SettingItemGroup>

      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("profile.bindPhone")}</DialogTitle>
            <DialogDescription>{t("profile.bindPhoneDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("profile.phoneNumber")}</label>
              <Input
                value={bindMobile}
                onChange={(e) => setBindMobile(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder={t("profile.enterPhoneNumber")}
                disabled={isSendBindCodePending || isBindPhonePending}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("profile.verificationCode")}</label>
              <div className="flex items-center gap-2">
                <Input
                  value={bindCode}
                  onChange={(e) => setBindCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t("profile.enterVerificationCode")}
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
                    t("profile.sendVerificationCode")
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
              {t("profile.cancel")}
            </Button>
            <Button type="button" onClick={handleSubmitBindPhone} disabled={isBindPhonePending}>
              {isBindPhonePending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("profile.confirmBind")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { ProfileSetting };
