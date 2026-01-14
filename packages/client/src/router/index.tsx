import { createBrowserRouter } from "react-router-dom";

import DefaultLayout from "@/layouts/styles/default";
import AgentsIndexPage from "@/pages/agents";
import AgentsWorkspacePage from "@/pages/agents/workspace";
import AppsIndexPage from "@/pages/apps";
import InstallPage from "@/pages/install";
import KnowledgeIndexPage from "@/pages/knowledge";
import WorkflowIndexPage from "@/pages/workflow";
import WorkflowDetailPage from "@/pages/workflow/detail";

import GlobalError from "../components/exception/global-error";
import NotFoundPage from "../components/exception/not-found-page";
import AuthGuard from "../components/guard/auth-guard";
import ConsoleLayout from "../layouts/console";
import MainLayout from "../layouts/main";
import IndexPage from "../pages";
import { LoginPage } from "../pages/login";

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
        path: "/install",
        element: <InstallPage />,
      },
      {
        path: "/workflow/:id",
        element: <WorkflowDetailPage />,
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
            index: true,
            element: <IndexPage />,
          },
          {
            path: "/c/:id",
            element: <IndexPage />,
          },
          {
            path: "/apps",
            element: <AppsIndexPage />,
          },
          {
            path: "/agents",
            element: <AgentsIndexPage />,
          },
          {
            path: "/knowledge",
            element: <KnowledgeIndexPage />,
          },
          {
            path: "/agents/workspace",
            element: <AgentsWorkspacePage />,
          },
          {
            path: "/workflow",
            element: <WorkflowIndexPage />,
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
