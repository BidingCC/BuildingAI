import { createBrowserRouter } from "react-router-dom";

import WorkflowExample from "@/pages/workflow";

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
        index: true,
        element: <IndexPage />,
      },
      {
        path: "/c/:id",
        element: <IndexPage />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/workflow",
        element: <WorkflowExample />,
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
