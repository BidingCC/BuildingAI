import "./styles/index.css";

import { ThemeProvider } from "@buildingai/ui/components/theme-provider";
import { AlertDialogProvider } from "@buildingai/ui/hooks/use-alert-dialog.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { createRoutes, generateRoutes, type MenuRoute } from "./router";

/**
 * Fetch menu routes from API and bootstrap the application.
 */
async function bootstrap() {
  // TODO: Replace with actual API call
  const menuRoutes: MenuRoute[] = await Promise.resolve([
    {
      path: "dashboard",
      component: "/console/dashboard/index.tsx",
    },
  ]);

  const dynamicRoutes = generateRoutes(menuRoutes);
  const router = createRoutes(dynamicRoutes);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <AlertDialogProvider>
          <RouterProvider router={router} />
        </AlertDialogProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}

bootstrap();
