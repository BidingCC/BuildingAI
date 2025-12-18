import { createBrowserRouter } from "react-router-dom";

import ErrorPage from "../components/ErrorPage";
import NotFoundPage from "../components/NotFoundPage";
import ConsoleLayout from "../layouts/console";
import MainLayout from "../layouts/main";
import IndexPage from "../pages";
import DashboardPage from "../pages/console/dashboard";
import { LoginPage } from "../pages/login";

const routes = createBrowserRouter([
  {
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <IndexPage />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/console",
        element: <ConsoleLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
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

export { routes };
