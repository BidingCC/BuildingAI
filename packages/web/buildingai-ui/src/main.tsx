import "./styles/index.css";

import { ThemeProvider } from "@buildingai/ui/components/theme-provider";
import { AlertDialogProvider } from "@buildingai/ui/hooks/use-alert-dialog.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AlertDialogProvider>
        <RouterProvider router={router} />
      </AlertDialogProvider>
    </ThemeProvider>
  </StrictMode>,
);
