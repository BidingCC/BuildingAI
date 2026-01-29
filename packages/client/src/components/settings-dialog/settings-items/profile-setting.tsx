import { useUserInfoQuery } from "@buildingai/services/shared";
import { type AllowedUserField, useUpdateUserFieldMutation } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { Check, Copy, Edit, Link, User, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import SvgIcons from "@/components/svg-icons";

import { SettingItem, SettingItemGroup, SettingItemLabel } from "../setting-item";

const ProfileSetting = () => {
  const { isLogin } = useAuthStore((state) => state.authActions);
  const { data, refetch } = useUserInfoQuery();

  const [editingField, setEditingField] = useState<AllowedUserField | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: updateField, isPending } = useUpdateUserFieldMutation();

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
          <Button
            className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
            variant="ghost"
            size="icon-sm"
          >
            <Edit />
          </Button>
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
              <Button
                className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
                variant="ghost"
                size="icon-sm"
                onClick={handleSaveEdit}
                disabled={isPending}
              >
                <Check />
              </Button>
              <Button
                className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
                variant="ghost"
                size="icon-sm"
                onClick={handleCancelEdit}
                disabled={isPending}
              >
                <X />
              </Button>
            </div>
          ) : (
            <Button
              className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
              variant="ghost"
              size="icon-sm"
              onClick={() => handleStartEdit("nickname", data?.nickname || "")}
            >
              <Edit />
            </Button>
          )}
        </SettingItem>
        <SettingItem title={data?.userNo} description="用户编号">
          <Button
            className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
            variant="ghost"
            size="icon-sm"
          >
            <Copy />
          </Button>
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
              <Button
                className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
                variant="ghost"
                size="icon-sm"
                onClick={handleSaveEdit}
                disabled={isPending}
              >
                <Check />
              </Button>
              <Button
                className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
                variant="ghost"
                size="icon-sm"
                onClick={handleCancelEdit}
                disabled={isPending}
              >
                <X />
              </Button>
            </div>
          ) : (
            <Button
              className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
              variant="ghost"
              size="icon-sm"
              onClick={() => handleStartEdit("email", data?.email || "")}
            >
              <Edit />
            </Button>
          )}
        </SettingItem>
      </SettingItemGroup>

      <SettingItemGroup label="安全设置">
        <SettingItem title={data?.hasPassword ? "已设置" : "未设置"} description="密码">
          <Button
            className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
            variant="ghost"
            size="icon-sm"
          >
            <Edit />
          </Button>
        </SettingItem>
        <SettingItem title={data?.phone || "未绑定"} description="手机号">
          <Button
            className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
            variant="ghost"
            size="icon-sm"
          >
            <Edit />
          </Button>
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
          <Button
            className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
            variant="ghost"
            size="sm"
          >
            <Link />
            去绑定
          </Button>
        </SettingItem>
        <SettingItem title="注销账号" description="您的账号数据将会被永久删除，此操作不可逆">
          <Button
            className="hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/15"
            variant="destructive"
            size="sm"
          >
            注销
          </Button>
        </SettingItem>
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
