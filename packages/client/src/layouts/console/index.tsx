import {
  getFirstConsoleMenuPath,
  hasConsoleAccess,
  hasConsoleRouteAccess,
  WEB_HOME_PATH,
} from "@buildingai/services/shared";
import { useAuthStore } from "@buildingai/stores";
import NotFoundPage from "@buildingai/ui/components/exception/not-found-page";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@buildingai/ui/components/ui/sidebar";
import type { MenuItem } from "@buildingai/web-types";
import type { ComponentType } from "react";
import { useMemo } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate, useLocation, useRoutes } from "react-router-dom";

import AccessMenuIndexPage from "@/pages/console/access/menu";
import AccessPermissionIndexPage from "@/pages/console/access/permission";
import AccessRoleIndexPage from "@/pages/console/access/role";
import AgentConfigIndexPage from "@/pages/console/ai/agent/config";
import AgentIndexPage from "@/pages/console/ai/agent/list";
import DatasetsConfigPage from "@/pages/console/ai/datasets/config";
import DatasetsIndexPage from "@/pages/console/ai/datasets/list";
import AiMcpIndexPage from "@/pages/console/ai/mcp";
import AiProviderIndexPage from "@/pages/console/ai/provider";
import AiSecretIndexPage from "@/pages/console/ai/secret";
import ChannelWechatOaIndexPage from "@/pages/console/channel/wechat-oa";
import ChatConfigIndexPage from "@/pages/console/chat/config";
import ChatRecordIndexPage from "@/pages/console/chat/record";
import DashboardPage from "@/pages/console/dashboard";
import DecorateAgentIndexPage from "@/pages/console/decorate/agent";
import DecorateAppsIndexPage from "@/pages/console/decorate/apps";
import DecorateLayoutIndexPage from "@/pages/console/decorate/layout";
import ExtensionIndexPage from "@/pages/console/extension";
import FinancialAnalysisIndexPage from "@/pages/console/financial/analysis";
import FinancialBalanceDetailsIndexPage from "@/pages/console/financial/balance-details";
import NoticeNotificationSettingsPage from "@/pages/console/notice/notification-settings";
import NoticeSmsPage from "@/pages/console/notice/sms";
import OperationIndexPage from "@/pages/console/operation";
import OperationLayout from "@/pages/console/operation/_layouts";
import CDKManagementPage from "@/pages/console/operation/cdk/management";
import CDKRecordsPage from "@/pages/console/operation/cdk/records";
import CDKSettingsPage from "@/pages/console/operation/cdk/settings";
import LoginRewardConfigPage from "@/pages/console/operation/login-reward/config";
import MembershipLevelIndexPage from "@/pages/console/operation/membership/level";
import MembershipPlanIndexPage from "@/pages/console/operation/membership/plan";
import UserRechargeIndexPage from "@/pages/console/operation/recharge";
import RegisterRewardConfigPage from "@/pages/console/operation/register-reward/config";
import SignRewardConfigPage from "@/pages/console/operation/sign-reward/config";
import SignRewardRecordsPage from "@/pages/console/operation/sign-reward/records";
import OrderMembershipIndexPage from "@/pages/console/order/membership";
import OrderRechargeIndexPage from "@/pages/console/order/recharge";
import SystemAgreementIndexPage from "@/pages/console/system/agreement";
import SystemLoginConfigIndexPage from "@/pages/console/system/login-config";
import SystemPayConfigIndexPage from "@/pages/console/system/pay-config";
import SystemPm2LogRotateIndexPage from "@/pages/console/system/pm2-log-rotate";
import SystemStorageConfigIndexPage from "@/pages/console/system/storage-config";
import SystemWebsiteConfigIndexPage from "@/pages/console/system/website-config";
import UserListIndexPage from "@/pages/console/user/list";

import AppNavbar from "./_components/app-navbar";
import { AppSidebar } from "./_components/app-sidebar";

const modules = import.meta.glob<{ default: ComponentType }>(
  ["@/pages/console/**/*.tsx", "!@/pages/console/**/_components/**"],
  { eager: true },
);

/**
 * Convert menu items to react-router RouteObject.
 */
function generateRoutes(menus: MenuItem[]): RouteObject[] {
  return menus
    .filter((menu) => menu.component)
    .flatMap((menu) => {
      const module = modules[`/src/pages${menu.component}`];
      const Component = module?.default;

      const routes: RouteObject[] = [];

      if (Component) {
        routes.push({
          path: menu.path,
          element: <Component />,
        });
      }

      if (menu.children?.length) {
        routes.push(...generateRoutes(menu.children));
      }

      return routes;
    });
}

function ConsoleRoutes() {
  const { userInfo } = useAuthStore((state) => state.auth);

  const routes = useMemo<RouteObject[]>(() => {
    const dynamicRoutes = generateRoutes(userInfo?.menus ?? []);
    return [
      { path: "/dashboard", element: <DashboardPage /> },
      // TODO: 临时静态页面，完成所有页面之后需要删掉
      { path: "/agent", element: <AgentIndexPage /> },
      { path: "/agent/config", element: <AgentConfigIndexPage /> },
      { path: "/datasets", element: <DatasetsIndexPage /> },
      { path: "/datasets/config", element: <DatasetsConfigPage /> },
      { path: "/provider", element: <AiProviderIndexPage /> },
      { path: "/mcp", element: <AiMcpIndexPage /> },
      { path: "/extension", element: <ExtensionIndexPage /> },
      { path: "/secret", element: <AiSecretIndexPage /> },
      { path: "/operation", element: <OperationIndexPage /> },
      {
        path: "operation/*",
        element: <OperationLayout />,
        children: [
          {
            path: "cdk/management",
            element: <CDKManagementPage />,
          },
          {
            path: "cdk/records",
            element: <CDKRecordsPage />,
          },
          {
            path: "cdk/settings",
            element: <CDKSettingsPage />,
          },
          {
            path: "recharge/config",
            element: <UserRechargeIndexPage />,
          },
          {
            path: "membership/level",
            element: <MembershipLevelIndexPage />,
          },
          {
            path: "membership/plan",
            element: <MembershipPlanIndexPage />,
          },
          {
            path: "login-reward/config",
            element: <LoginRewardConfigPage />,
          },
          {
            path: "login-reward",
            element: <Navigate replace to="/console/operation/login-reward/config" />,
          },
          {
            path: "register-reward/config",
            element: <RegisterRewardConfigPage />,
          },
          {
            path: "register-reward",
            element: <Navigate replace to="/console/operation/register-reward/config" />,
          },
          {
            path: "sign-reward/config",
            element: <SignRewardConfigPage />,
          },
          {
            path: "sign-reward/records",
            element: <SignRewardRecordsPage />,
          },
          {
            path: "sign-reward",
            element: <Navigate replace to="/console/operation/sign-reward/config" />,
          },
        ],
      },
      {
        path: "decorate",
        children: [
          {
            path: "apps",
            element: <DecorateAppsIndexPage />,
          },
          {
            path: "layout",
            element: <DecorateLayoutIndexPage />,
          },
          {
            path: "agents",
            element: <DecorateAgentIndexPage />,
          },
        ],
      },
      {
        path: "chat",
        children: [
          {
            path: "record",
            element: <ChatRecordIndexPage />,
          },
          {
            path: "config",
            element: <ChatConfigIndexPage />,
          },
        ],
      },
      {
        path: "user",
        children: [
          {
            path: "list",
            element: <UserListIndexPage />,
          },
        ],
      },
      {
        path: "order",
        children: [
          {
            path: "membership",
            element: <OrderMembershipIndexPage />,
          },
          {
            path: "recharge",
            element: <OrderRechargeIndexPage />,
          },
        ],
      },
      {
        path: "notice",
        children: [
          {
            path: "sms",
            element: <NoticeSmsPage />,
          },
          {
            path: "notification-settings",
            element: <NoticeNotificationSettingsPage />,
          },
        ],
      },
      {
        path: "channel",
        children: [
          {
            path: "wechat-oa",
            element: <ChannelWechatOaIndexPage />,
          },
        ],
      },
      {
        path: "financial",
        children: [
          {
            path: "analysis",
            element: <FinancialAnalysisIndexPage />,
          },
          {
            path: "balance-details",
            element: <FinancialBalanceDetailsIndexPage />,
          },
        ],
      },
      {
        path: "access",
        children: [
          {
            path: "menu",
            element: <AccessMenuIndexPage />,
          },
          {
            path: "permission",
            element: <AccessPermissionIndexPage />,
          },
          {
            path: "role",
            element: <AccessRoleIndexPage />,
          },
        ],
      },
      {
        path: "system",
        children: [
          {
            path: "agreement",
            element: <SystemAgreementIndexPage />,
          },
          {
            path: "login-config",
            element: <SystemLoginConfigIndexPage />,
          },
          {
            path: "pay-config",
            element: <SystemPayConfigIndexPage />,
          },
          {
            path: "website-config",
            element: <SystemWebsiteConfigIndexPage />,
          },
          {
            path: "storage-config",
            element: <SystemStorageConfigIndexPage />,
          },
          {
            path: "pm2-log-rotate",
            element: <SystemPm2LogRotateIndexPage />,
          },
        ],
      },
      ...dynamicRoutes,
      { path: "*", element: <NotFoundPage /> },
    ];
  }, [userInfo?.menus]);

  return useRoutes(routes);
}

export default function ConsoleLayout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const { userInfo } = useAuthStore((state) => state.auth);
  const firstConsolePath = useMemo(
    () => getFirstConsoleMenuPath(userInfo?.menus ?? []),
    [userInfo?.menus],
  );

  if (!userInfo) return null;

  if (!hasConsoleAccess(userInfo)) {
    return <Navigate to={WEB_HOME_PATH} replace />;
  }

  const currentPath = location.pathname.replace(/\/$/, "") || WEB_HOME_PATH;
  if (currentPath === "/console" && currentPath !== firstConsolePath) {
    return <Navigate to={firstConsolePath} replace />;
  }

  if (!hasConsoleRouteAccess(userInfo, currentPath) && currentPath !== firstConsolePath) {
    return <Navigate to={firstConsolePath} replace />;
  }
  return (
    <SidebarProvider storageKey="layout-console-sidebar" className="bd-console-layout h-dvh">
      <AppSidebar />
      <SidebarInset className="flex h-full flex-col overflow-x-hidden md:h-[calc(100%-1rem)] md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0">
        <AppNavbar />
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" viewportClassName="[&>div]:block!">
            {children ? children : <ConsoleRoutes />}
          </ScrollArea>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
