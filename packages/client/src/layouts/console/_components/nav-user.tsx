import { useAuthStore } from "@buildingai/stores";
import { ModeItems } from "@buildingai/ui/components/mode-toggle";
import { THEME_COLORS, useTheme } from "@buildingai/ui/components/theme-provider";
import { ScrollThemeItems } from "@buildingai/ui/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@buildingai/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@buildingai/ui/components/ui/sidebar";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import {
  ChevronsUpDown,
  Info,
  Languages,
  Laptop,
  LogOut,
  Moon,
  Palette,
  Settings,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { userInfo } = useAuthStore((state) => state.auth);
  const { logout, isLogin } = useAuthStore((state) => state.authActions);

  const { setThemeColor, themeColor, theme } = useTheme();
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
                <span className="truncate font-medium">{userInfo?.nickname || "未登录"}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {isLogin() ? userInfo?.role?.name || "未设置角色" : "请先登录后使用"}
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
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette className="text-primary fill-primary/20" />
                  主题配色
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuLabel>选择配色({THEME_COLORS.length})</DropdownMenuLabel>
                    <ScrollThemeItems themeColor={themeColor} onSelect={setThemeColor} />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {
                    {
                      dark: (
                        <>
                          <Moon />
                          深色模式
                        </>
                      ),
                      light: (
                        <>
                          <Sun />
                          浅色模式
                        </>
                      ),

                      system: (
                        <>
                          <Laptop />
                          系统跟随
                        </>
                      ),
                    }[theme]
                  }
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuLabel>选择主题</DropdownMenuLabel>
                    <ModeItems />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuItem>
                <Languages />
                简体中文
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings />
                系统设置
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setVersionInfoOpen(true)}>
              <Info />
              版本信息
            </DropdownMenuItem>

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
      </SidebarMenuItem>
      <Dialog open={versionInfoOpen} onOpenChange={setVersionInfoOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>关于BuildingAI</DialogTitle>
            <div className="mt-4 flex items-center gap-1">
              <span className="text-muted-foreground">版本：</span>
              <span>1.0.0</span>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
