import { useAuthStore } from "@buildingai/stores";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@buildingai/ui/components/ui/sidebar";
import type { MenuItem } from "@buildingai/web-types";
import type { ComponentType } from "react";
import { useMemo } from "react";
import type { RouteObject } from "react-router-dom";
import { useRoutes } from "react-router-dom";

import AccessMenuIndexPage from "@/pages/console/access/menu";
import AccessPermissionIndexPage from "@/pages/console/access/permission";
import AccessRoleIndexPage from "@/pages/console/access/role";
import AgentIndexPage from "@/pages/console/ai/agent";
import DatasetsIndexPage from "@/pages/console/ai/datasets";
import AiMcpIndexPage from "@/pages/console/ai/mcp";
import AiProviderIndexPage from "@/pages/console/ai/provider";
import SecretConfigIndexPage from "@/pages/console/ai/secret/config";
import SecretTemplateIndexPage from "@/pages/console/ai/secret/template";
import ChannelWechatOaIndexPage from "@/pages/console/channel/wechat-oa";
import ConversationConfigIndexPage from "@/pages/console/conversation/config";
import ConversationRecordIndexPage from "@/pages/console/conversation/record";
import DashboardPage from "@/pages/console/dashboard";
import DecorateAppsIndexPage from "@/pages/console/decorate/apps";
import DecorateLayoutIndexPage from "@/pages/console/decorate/layout";
import ExtensionIndexPage from "@/pages/console/extension";
import FinancialAnalysisIndexPage from "@/pages/console/financial/analysis";
import FinancialBalanceDetailsIndexPage from "@/pages/console/financial/balance-details";
import MembershipLevelIndexPage from "@/pages/console/membership/level";
import MembershipPlanIndexPage from "@/pages/console/membership/plan";
import OrderMembershipIndexPage from "@/pages/console/order/membership";
import OrderRechargeIndexPage from "@/pages/console/order/recharge";
import SystemAgreementIndexPage from "@/pages/console/system/agreement";
import SystemLoginConfigIndexPage from "@/pages/console/system/login-config";
import SystemPayConfigIndexPage from "@/pages/console/system/pay-config";
import SystemWebsiteConfigIndexPage from "@/pages/console/system/website-config";
import UserListIndexPage from "@/pages/console/user/list";
import UserRechargeIndexPage from "@/pages/console/user/recharge";

import NotFoundPage from "../../components/exception/not-found-page";
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
      { path: "/datasets", element: <DatasetsIndexPage /> },
      { path: "/provider", element: <AiProviderIndexPage /> },
      { path: "/mcp", element: <AiMcpIndexPage /> },
      { path: "/extension", element: <ExtensionIndexPage /> },
      {
        path: "secret",
        children: [
          {
            path: "template",
            element: <SecretTemplateIndexPage />,
          },
          {
            path: "config",
            element: <SecretConfigIndexPage />,
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
        ],
      },
      {
        path: "conversation",
        children: [
          {
            path: "record",
            element: <ConversationRecordIndexPage />,
          },
          {
            path: "config",
            element: <ConversationConfigIndexPage />,
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
          {
            path: "recharge",
            element: <UserRechargeIndexPage />,
          },
        ],
      },
      {
        path: "membership",
        children: [
          {
            path: "level",
            element: <MembershipLevelIndexPage />,
          },
          {
            path: "plan",
            element: <MembershipPlanIndexPage />,
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
        ],
      },
      //   ...dynamicRoutes,
      { path: "*", element: <NotFoundPage /> },
    ];
  }, [userInfo?.menus]);

  return useRoutes(routes);
}

export default function ConsoleLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider className="bd-console-layout h-screen">
      <AppSidebar />
      <SidebarInset className="flex flex-col md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0">
        <AppNavbar />
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="m-4 mt-1">{children ? children : <ConsoleRoutes />}</div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
