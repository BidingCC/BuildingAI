import { uploadFile, useUserInfoQuery } from "@buildingai/services/shared";
import { type AllowedUserField, useUpdateUserFieldMutation } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { RootOnly } from "@buildingai/ui/components/auth/root-only";
import { CopyButton } from "@buildingai/ui/components/copy-button";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Input } from "@buildingai/ui/components/ui/input";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { Check, Link, Loader2, PenLine, User, X } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import SvgIcons from "@/components/svg-icons";

import { SettingItem, SettingItemAction, SettingItemGroup } from "../setting-item";

const ProfileSetting = () => {
  const { isLogin } = useAuthStore((state) => state.authActions);
  const { data } = useUserInfoQuery();

  const [editingField, setEditingField] = useState<AllowedUserField | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { mutate: updateField, isPending } = useUpdateUserFieldMutation();

  const handleAvatarClick = useCallback(() => {
    avatarInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingAvatar(true);
      try {
        const result = await uploadFile(file, { description: "avatar" });
        updateField(
          { field: "avatar", value: result.url },
          {
            onSuccess: () => {
              toast.success("头像已更新");
            },
            onError: () => {
              toast.error("头像更新失败");
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
          <SettingItemAction>
            <PenLine />
          </SettingItemAction>
        </SettingItem>
        <SettingItem title={data?.phone || "未绑定"} description="手机号">
          <SettingItemAction>
            <PenLine />
          </SettingItemAction>
        </SettingItem>
        <SettingItem
          title={"未绑定"}
          description={
            <div className="flex items-center gap-0.5">
              <SvgIcons.wechat className="size-3" />
              关联微信
            </div>
          }
        >
          <SettingItemAction variant="ghost" size="sm">
            <Link />
            去绑定
          </SettingItemAction>
        </SettingItem>
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
    </div>
  );
};

export { ProfileSetting };
