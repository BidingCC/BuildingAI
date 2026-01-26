import "./styles/index.css";

import { ThemeProvider } from "@buildingai/ui/components/theme-provider";
import { Toaster } from "@buildingai/ui/components/ui/sonner";
import { AlertDialogProvider } from "@buildingai/ui/hooks/use-alert-dialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "./router";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AlertDialogProvider>
          {/* <ReactQueryDevtools buttonPosition="top-right"  /> */}
          <Toaster position="top-center" />
          <RouterProvider router={router} />
        </AlertDialogProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
