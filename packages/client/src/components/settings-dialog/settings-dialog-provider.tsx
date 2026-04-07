import { SettingsDialogContext, type SettingsDialogContextValue } from "@buildingai/hooks";
import { useI18n } from "@buildingai/i18n";
import { useAuthStore } from "@buildingai/stores";
import { useConfigStore } from "@buildingai/stores";
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
  SidebarTrigger,
  useSidebar,
} from "@buildingai/ui/components/ui/sidebar";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { SETTINGS_NAV, type SettingsPage } from "./constants";
import {
  GeneralSetting,
  ProfileSetting,
  RedeemCDKSetting,
  SubscribeSetting,
  ToolsSetting,
  WalletSetting,
} from "./settings-items";
import { AboutSetting } from "./settings-items/about-setting";
import PersonalizedSetting from "./settings-items/personalized-setting";

const SETTINGS_COMPONENTS: Record<SettingsPage, React.ComponentType> = {
  profile: ProfileSetting,
  general: GeneralSetting,
  wallet: WalletSetting,
  redeemCDK: RedeemCDKSetting,
  tools: ToolsSetting,
  subscribe: SubscribeSetting,
  personalized: PersonalizedSetting,
  about: AboutSetting,
};

const PAYMENT_SUCCESS_MESSAGE_TYPE = "buildingai:alipay-payment-success";

/**
 * Nav content component that uses useSidebar hook.
 * Must be rendered inside SidebarProvider.
 */
function SettingsNavContent({
  navGroups,
  activePage,
  onNavigate,
}: {
  navGroups: typeof SETTINGS_NAV;
  activePage: SettingsPage;
  onNavigate: (page: SettingsPage) => void;
}) {
  const { t } = useI18n();
  const { state, toggleSidebar, isMobile } = useSidebar();

  return (
    <>
      {navGroups.map((group) => (
        <SidebarGroupContent key={group.label}>
          {state === "expanded" && <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>}
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={item.id === activePage}
                  onClick={() => {
                    onNavigate(item.id);
                    if (isMobile) {
                      toggleSidebar();
                    }
                  }}
                >
                  <item.icon strokeWidth={item.id === activePage ? 2.2 : 2} />
                  <span>{t(item.name)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      ))}
    </>
  );
}

type SettingsDialogState = {
  open: boolean;
  activePage: SettingsPage;
};

/**
 * Provider component that enables imperative SettingsDialog usage.
 * Must be placed at the root of your application or layout.
 */
export function SettingsDialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [state, setState] = React.useState<SettingsDialogState>({
    open: false,
    activePage: "profile",
  });

  const { websiteConfig } = useConfigStore((state) => state.config);
  const { userInfo } = useAuthStore((state) => state.auth);
  const { isLogin } = useAuthStore((state) => state.authActions);
  const navGroups = React.useMemo(
    () =>
      SETTINGS_NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.id === "subscribe") {
            return websiteConfig?.features?.membership ?? false;
          }

          if (item.id === "redeemCDK") {
            return websiteConfig?.features?.cdk ?? false;
          }

          return true;
        }),
      })).filter((group) => group.items.length > 0),
    [websiteConfig?.features?.cdk, websiteConfig?.features?.membership],
  );
  const availablePageIds = React.useMemo(
    () => navGroups.flatMap((group) => group.items.map((item) => item.id)),
    [navGroups],
  );

  React.useEffect(() => {
    if (!availablePageIds.includes(state.activePage)) {
      setState((prev) => ({ ...prev, activePage: availablePageIds[0] ?? "profile" }));
    }
  }, [availablePageIds, state.activePage]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const payload = event.data as
        | {
            type?: string;
            payFrom?: string;
            orderId?: string;
            orderNo?: string;
            payType?: string;
            status?: string;
          }
        | undefined;

      if (
        !payload ||
        payload.type !== PAYMENT_SUCCESS_MESSAGE_TYPE ||
        payload.status !== "success"
      ) {
        return;
      }

      if (payload.payFrom === "recharge") {
        void queryClient.invalidateQueries({ queryKey: ["recharge", "center"] });
        void queryClient.invalidateQueries({ queryKey: ["user", "info"] });
        void queryClient.invalidateQueries({ queryKey: ["user", "account-log"] });
        toast.success(t("payment.rechargeSuccess"));
        window.dispatchEvent(new CustomEvent(PAYMENT_SUCCESS_MESSAGE_TYPE, { detail: payload }));
        if (availablePageIds.includes("wallet")) {
          setState((prev) => ({
            ...prev,
            open: true,
            activePage: "wallet",
          }));
        }
        return;
      }

      if (payload.payFrom === "membership") {
        void queryClient.invalidateQueries({ queryKey: ["membership", "center"] });
        void queryClient.invalidateQueries({ queryKey: ["membership", "subscriptions"] });
        void queryClient.invalidateQueries({ queryKey: ["membership", "order"] });
        void queryClient.invalidateQueries({ queryKey: ["user", "info"] });
        void queryClient.invalidateQueries({ queryKey: ["user", "account-log"] });
        toast.success(t("payment.membershipPaymentSuccess"));
        window.dispatchEvent(new CustomEvent(PAYMENT_SUCCESS_MESSAGE_TYPE, { detail: payload }));
        if (availablePageIds.includes("subscribe")) {
          setState((prev) => ({
            ...prev,
            open: true,
            activePage: "subscribe",
          }));
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [availablePageIds, queryClient]);

  const open = React.useCallback(
    (page?: SettingsPage) => {
      setState((prev) => ({
        open: true,
        activePage:
          page && availablePageIds.includes(page)
            ? page
            : availablePageIds.includes(prev.activePage)
              ? prev.activePage
              : (availablePageIds[0] ?? "profile"),
      }));
    },
    [availablePageIds],
  );

  const close = React.useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const navigate = React.useCallback((page: SettingsPage) => {
    setState((prev) => ({ ...prev, activePage: page }));
  }, []);

  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    setState((prev) => ({ ...prev, open: isOpen }));
  }, []);

  const contextValue: SettingsDialogContextValue<SettingsPage> = React.useMemo(
    () => ({
      open,
      close,
      navigate,
      isOpen: state.open,
      activePage: state.activePage,
    }),
    [open, close, navigate, state.open, state.activePage],
  );

  const activeNavItem = navGroups
    .flatMap((group) => group.items)
    .find((item) => item.id === state.activePage);

  return (
    <SettingsDialogContext.Provider value={contextValue}>
      {children}
      <Dialog open={state.open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-dvw overflow-hidden rounded-none border-0 p-0 sm:border md:max-h-[500px] md:max-w-[700px] md:rounded-lg lg:max-w-[800px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <DialogDescription className="sr-only">Customize your settings here.</DialogDescription>
          <SidebarProvider
            className="items-start"
            style={
              {
                "--sidebar-width": "200px",
              } as React.CSSProperties
            }
            storageKey="setting-dialog-sidebar"
          >
            <Sidebar
              collapsible="offExamples"
              className="hidden group-data-[side=left]:border-r-0 md:flex"
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
                              {userInfo?.nickname || t("common.notLoggedIn")}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                              {isLogin() ? (
                                <div className="flex items-center gap-0.5">
                                  <span className="">{userInfo?.username || "0"}</span>
                                </div>
                              ) : (
                                t("common.pleaseLoginFirst")
                              )}
                            </span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>

                  <SettingsNavContent
                    navGroups={navGroups}
                    activePage={state.activePage}
                    onNavigate={navigate}
                  />
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <main className="flex h-dvh flex-1 flex-col overflow-hidden md:h-[500px]">
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="flex md:hidden" />
                  {activeNavItem && t(activeNavItem.name)}
                </div>
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
