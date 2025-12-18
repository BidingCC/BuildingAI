import { createBrowserRouter } from "react-router-dom";

import ErrorPage from "../components/ErrorPage";
import NotFoundPage from "../components/NotFoundPage";
import MainLayout from "../layouts/main";
import IndexPage from "../pages";
import { LoginPage } from "../pages/login";

const routes = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <IndexPage />,
      },
      {
        path: "/login",
        element: <LoginPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export { routes };
