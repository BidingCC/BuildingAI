"use client";
import { useAuthStore } from "@buildingai/stores";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@buildingai/ui/components/ui/sidebar";
import { User } from "lucide-react";
import * as React from "react";

import { SETTINGS_NAV, type SettingsPage } from "./constants";
import {
  GeneralSetting,
  ProfileSetting,
  SubscribeSetting,
  ToolsSetting,
  WalletSetting,
} from "./settings-items";
import { SettingsDialogContext } from "./use-settings-dialog";

const SETTINGS_COMPONENTS: Record<SettingsPage, React.ComponentType> = {
  profile: ProfileSetting,
  general: GeneralSetting,
  wallet: WalletSetting,
  tools: ToolsSetting,
  subscribe: SubscribeSetting,
};

type SettingsDialogState = {
  open: boolean;
  activePage: SettingsPage;
};

/**
 * Provider component that enables imperative SettingsDialog usage.
 * Must be placed at the root of your application or layout.
 */
export function SettingsDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<SettingsDialogState>({
    open: false,
    activePage: "profile",
  });

  const { userInfo } = useAuthStore((state) => state.auth);
  const { isLogin } = useAuthStore((state) => state.authActions);

  const open = React.useCallback((page?: SettingsPage) => {
    setState((prev) => ({
      open: true,
      activePage: page ?? prev.activePage,
    }));
  }, []);

  const close = React.useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const navigate = React.useCallback((page: SettingsPage) => {
    setState((prev) => ({ ...prev, activePage: page }));
  }, []);

  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    setState((prev) => ({ ...prev, open: isOpen }));
  }, []);

  const contextValue = React.useMemo(
    () => ({
      open,
      close,
      navigate,
      isOpen: state.open,
      activePage: state.activePage,
    }),
    [open, close, navigate, state.open, state.activePage],
  );

  const activeNavItem = SETTINGS_NAV.flatMap((group) => group.items).find(
    (item) => item.id === state.activePage,
  );

  return (
    <SettingsDialogContext.Provider value={contextValue}>
      {children}
      <Dialog open={state.open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <DialogDescription className="sr-only">Customize your settings here.</DialogDescription>
          <SidebarProvider className="items-start">
            <Sidebar
              collapsible="none"
              className="hidden md:flex"
              style={
                {
                  "--sidebar-width": "200px",
                } as React.CSSProperties
              }
            >
              <SidebarContent>
                <SidebarGroup className="gap-2">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton className="h-fit">
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
                            <span className="truncate font-medium">
                              {userInfo?.nickname || "未登录"}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                              {isLogin() ? (
                                <div className="flex items-center gap-0.5">
                                  <span className="">{userInfo?.username || "0"}</span>
                                </div>
                              ) : (
                                "请先登录后使用"
                              )}
                            </span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>

                  {SETTINGS_NAV.map((group) => (
                    <SidebarGroupContent key={group.label}>
                      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                      <SidebarMenu>
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              isActive={item.id === state.activePage}
                              onClick={() => navigate(item.id)}
                            >
                              <item.icon strokeWidth={item.id === state.activePage ? 2.2 : 2} />
                              <span>{item.name}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  ))}
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <main className="flex h-[500px] flex-1 flex-col overflow-hidden">
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">{activeNavItem?.name}</div>
              </header>
              <div className="h-full flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 pt-0">
                    {React.createElement(SETTINGS_COMPONENTS[state.activePage])}
                  </div>
                </ScrollArea>
              </div>
            </main>
          </SidebarProvider>
        </DialogContent>
      </Dialog>
    </SettingsDialogContext.Provider>
  );
}
