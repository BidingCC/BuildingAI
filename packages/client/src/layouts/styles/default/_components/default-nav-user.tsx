import { useAuthStore } from "@buildingai/stores";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@buildingai/ui/components/ui/sidebar";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { ChevronsUpDown, LogOut, Settings, Sparkles, User, UserStar, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSettingsDialog } from "@/components/settings-dialog";

import { UpgradeDialog } from "./upgrade-dialog";

function UserButton({ isLoggedIn, userInfo }: { isLoggedIn: boolean; userInfo?: any }) {
  return (
    <>
      <Avatar className="h-8 w-8 rounded-lg after:rounded-lg">
        {isLoggedIn && (
          <AvatarImage className="rounded-lg" src={userInfo?.avatar} alt={userInfo?.nickname} />
        )}
        <AvatarFallback className="rounded-lg">
          {isLoggedIn ? userInfo?.nickname?.slice(0, 1) : <User />}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{userInfo?.nickname || "未登录"}</span>
        <span className="text-muted-foreground truncate text-xs">
          {isLoggedIn ? (
            <div className="flex items-center gap-0.5">
              <Zap className="size-3!" />
              <span className="">{userInfo?.power || "0"}</span>
            </div>
          ) : (
            "请先登录后使用"
          )}
        </span>
      </div>
      <ChevronsUpDown className="ml-auto size-4" />
    </>
  );
}

export function DefaultNavUser() {
  const { isMobile } = useSidebar();
  const { userInfo } = useAuthStore((state) => state.auth);
  const { logout, isLogin } = useAuthStore((state) => state.authActions);

  const navigate = useNavigate();
  const { confirm } = useAlertDialog();
  const settingsDialog = useSettingsDialog();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  const isLoggedIn = isLogin();

  if (!isLoggedIn) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <Link to="/login">
              <UserButton isLoggedIn={false} />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserButton isLoggedIn={true} userInfo={userInfo} />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <SidebarMenuButton
                size="lg"
                onClick={() => {
                  settingsDialog.open("profile");
                }}
              >
                <Avatar className="h-8 w-8 rounded-lg after:rounded-lg">
                  {isLoggedIn && (
                    <AvatarImage
                      className="rounded-lg"
                      src={userInfo?.avatar}
                      alt={userInfo?.nickname}
                    />
                  )}
                  <AvatarFallback className="rounded-lg">
                    {isLoggedIn ? userInfo?.nickname?.slice(0, 1) : <User />}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="text-foreground truncate font-medium">
                    {userInfo?.nickname || "未登录"}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {isLogin() ? (
                      <div className="flex items-center gap-0.5">
                        {userInfo?.membershipLevel?.name || "未设置会员等级"}
                      </div>
                    ) : (
                      "请先登录后使用"
                    )}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => {
                  setUpgradeDialogOpen(true);
                }}
              >
                <Sparkles />
                升级套餐
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserStar />
                个性化
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => settingsDialog.open("general")}>
                <Settings />
                设置
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await confirm({
                  title: "退出确认",
                  description: "确定要退出登录吗？",
                });
                logout();
                navigate("/login");
              }}
            >
              <LogOut />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <UpgradeDialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
