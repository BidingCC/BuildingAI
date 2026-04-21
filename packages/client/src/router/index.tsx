import AuthGuard from "@buildingai/ui/components/auth/auth-guard";
import GlobalError from "@buildingai/ui/components/exception/global-error";
import NotFoundPage from "@buildingai/ui/components/exception/not-found-page";
import MainLayout from "@buildingai/ui/layouts/main/index";
import DefaultLayout from "@buildingai/ui/layouts/styles/default/index";
import { createBrowserRouter } from "react-router-dom";

import AgentsIndexPage from "@/pages/agents";
import AgentChatPage from "@/pages/agents/detail/chat";
import AgentConfigurationPage from "@/pages/agents/detail/configuration";
import AgentLogsPage from "@/pages/agents/detail/logs";
import AgentMonitoringPage from "@/pages/agents/detail/monitoring";
import AgentPublishPage from "@/pages/agents/detail/publish";
import PublishChatPage from "@/pages/agents/site-chat";
import AgentsWorkspacePage from "@/pages/agents/workspace";
import AppsIndexPage from "@/pages/apps";
import DatasetsIndexPage from "@/pages/datasets";
import DatasetsLayout from "@/pages/datasets/_layouts";
import DatasetsDetailPage from "@/pages/datasets/detail";
import InstallPage from "@/pages/install";

import ConsoleLayout from "../layouts/console";
import DynamicHomePage from "../pages";
import AppIframePage from "../pages/apps/[identifier]";
import ChatPage from "../pages/chat";
import { LoginPage } from "../pages/login";
import { OAuthCallbackPage } from "../pages/login/oauth-callback";
import AlipayReturnPage from "../pages/payment/alipay-return";

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    errorElement: <GlobalError />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/login/oauth-callback",
        element: <OAuthCallbackPage />,
      },
      {
        path: "/install",
        element: <InstallPage />,
      },
      {
        path: "/payment/alipay-return",
        element: <AlipayReturnPage />,
      },
      {
        path: "/agents/:id/configuration",
        element: <AgentConfigurationPage />,
      },
      {
        path: "/agents/:id/publish",
        element: <AgentPublishPage />,
      },
      {
        path: "/agents/:id/logs",
        element: <AgentLogsPage />,
      },
      {
        path: "/agents/:id/monitoring",
        element: <AgentMonitoringPage />,
      },
      {
        path: "/agents/:id/chat",
        element: <AgentChatPage />,
      },
      {
        path: "/agents/:id/c/:uuid",
        element: <AgentChatPage />,
      },
      {
        path: "/agents/:agentId/:accessToken/c/:conversationId",
        element: <PublishChatPage />,
      },
      {
        path: "/agents/:agentId/:accessToken",
        element: <PublishChatPage />,
      },
      {
        element: <DefaultLayout />,
        errorElement: (
          <DefaultLayout>
            <GlobalError />
          </DefaultLayout>
        ),
        children: [
          {
            element: <DynamicHomePage />,
            children: [
              {
                index: true,
                element: <ChatPage />,
              },
              {
                path: "/c/:id",
                element: <ChatPage />,
              },
            ],
          },
          {
            path: "/chat",
            element: <ChatPage />,
          },
          {
            path: "/chat/:id",
            element: <ChatPage />,
          },
          {
            path: "/apps",
            element: <AppsIndexPage />,
          },
          {
            path: "/apps/:identifier/*",
            element: (
              <AuthGuard>
                <AppIframePage />
              </AuthGuard>
            ),
          },
          {
            path: "/agents",
            element: <AgentsIndexPage />,
          },
          {
            path: "/datasets",
            element: <DatasetsLayout />,
            children: [
              {
                index: true,
                element: <DatasetsIndexPage />,
              },

              {
                path: "/datasets/:id",
                element: (
                  <AuthGuard>
                    <DatasetsDetailPage />
                  </AuthGuard>
                ),
              },
            ],
          },
          {
            path: "/agents/workspace",
            element: <AgentsWorkspacePage />,
          },
          {
            path: "*",
            element: <NotFoundPage />,
          },
        ],
      },

      {
        element: <AuthGuard />,
        children: [
          {
            path: "/console/*",
            element: <ConsoleLayout />,
            errorElement: (
              <ConsoleLayout>
                <GlobalError />
              </ConsoleLayout>
            ),
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
