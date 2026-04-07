import { useI18n } from "@buildingai/i18n";
import { useAuthStore } from "@buildingai/stores";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { isEnabled } from "@buildingai/utils/is";
import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useSettingsDialog } from "@/components/settings-dialog";

export function NavUser() {
  const { t } = useI18n();
  const { isMobile } = useSidebar();
  const { userInfo } = useAuthStore((state) => state.auth);
  const { logout, isLogin } = useAuthStore((state) => state.authActions);

  const settingsDialog = useSettingsDialog();
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm } = useAlertDialog();

  const [versionInfoOpen, setVersionInfoOpen] = useState(false);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg after:rounded-lg">
                {isLogin() && (
                  <AvatarImage
                    className="rounded-lg"
                    src={userInfo?.avatar}
                    alt={userInfo?.nickname}
                  />
                )}
                <AvatarFallback className="rounded-lg">
                  {isLogin() ? userInfo?.nickname?.slice(0, 1) : <User />}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userInfo?.nickname || t("common.notLoggedIn")}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {isLogin()
                    ? isEnabled(userInfo?.isRoot)
                      ? t("common.superAdmin")
                      : userInfo?.role?.name || t("common.noRole")
                    : t("common.pleaseLoginFirst")}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem onClick={() => settingsDialog.open("general")}>
              <Settings />
              {t("common.settings")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={async () => {
                await confirm({
                  title: t("common.logoutConfirm"),
                  description: t("common.logoutConfirmDesc"),
                  confirmText: t("common.action.confirm"),
                  cancelText: t("common.action.cancel"),
                });
                await logout();
                const redirect = encodeURIComponent(location.pathname + location.search);
                navigate(`/login?redirect=${redirect}`, {
                  replace: true,
                  state: { redirect: location.pathname },
                });
              }}
            >
              <LogOut />
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <Dialog open={versionInfoOpen} onOpenChange={setVersionInfoOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("common.aboutBuildingAI")}</DialogTitle>
            <div className="mt-4 flex items-center gap-1">
              <span className="text-muted-foreground">{t("common.version")}：</span>
              <span>1.0.0</span>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
