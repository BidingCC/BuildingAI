import { createBrowserRouter } from "react-router-dom";

import DefaultLayout from "@/layouts/styles/default";
import AgentsIndexPage from "@/pages/agents";
import AgentsWorkspacePage from "@/pages/agents/workspace";
import AppsIndexPage from "@/pages/apps";
import DatasetsIndexPage from "@/pages/datasets";
import DatasetsLayout from "@/pages/datasets/_layouts";
import DatasetsDetailPage from "@/pages/datasets/detail";
import JoinedDatasetsIndexPage from "@/pages/datasets/joined";
import MyDatasetsIndexPage from "@/pages/datasets/my";
import InstallPage from "@/pages/install";
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
            path: "/datasets",
            element: <DatasetsLayout />,
            children: [
              {
                index: true,
                element: <DatasetsIndexPage />,
              },
              {
                path: "/datasets/my",
                element: <MyDatasetsIndexPage />,
              },
              {
                path: "/datasets/:id",
                element: <DatasetsDetailPage />,
              },
              {
                path: "/datasets/joined",
                element: <JoinedDatasetsIndexPage />,
              },
            ],
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
