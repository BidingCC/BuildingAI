import "./styles/index.css";

import { ThemeProvider } from "@buildingai/ui/components/theme-provider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import AuthGuard from "./components/AuthGuard";
import { routes } from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthGuard>
        <RouterProvider router={routes} />
      </AuthGuard>
    </ThemeProvider>
  </StrictMode>,
);
