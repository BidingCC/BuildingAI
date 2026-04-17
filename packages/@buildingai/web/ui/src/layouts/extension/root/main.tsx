import { useDocumentHead, useHeadRenderer, useRefreshUser } from "@buildingai/hooks";
import { useWebExtensionDetailQuery } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { ThemeProvider } from "@buildingai/ui/components/theme-provider";
import { Toaster } from "@buildingai/ui/components/ui/sonner";
import { TooltipProvider } from "@buildingai/ui/components/ui/tooltip";
import { AlertDialogProvider } from "@buildingai/ui/hooks/use-alert-dialog";
import { parseExtensionIdentifierFromLocation } from "@buildingai/utils/extension";
import { ReactNode, useMemo } from "react";

/**
 * Synchronously extract and consume the base64-encoded auth token from URL search params (_t).
 * Runs at module load time (before React rendering) to ensure the token is available
 * in the store before any HTTP requests are fired by child components.
 */
(function consumeTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("_t");
  if (!encoded) return;

  try {
    const token = atob(encoded);
    if (token) {
      useAuthStore.getState().authActions.setToken(token);
    }
  } catch {
    // ignore invalid base64
  }

  params.delete("_t");
  const cleanUrl =
    window.location.pathname +
    (params.toString() ? `?${params.toString()}` : "") +
    window.location.hash;
  window.history.replaceState({}, "", cleanUrl);
})();

export const ExtensionMainLayout = ({ children }: { children: ReactNode }) => {
  useHeadRenderer();
  useRefreshUser();

  const identifier = useMemo(() => parseExtensionIdentifierFromLocation(), []);
  const { data: extension } = useWebExtensionDetailQuery(identifier || "", {
    enabled: !!identifier,
  });

  useDocumentHead({
    description: extension?.description,
    icon: extension?.icon,
  });

  return (
    <ThemeProvider>
      <TooltipProvider>
        <AlertDialogProvider>
          <Toaster position="top-center" />
          {children}
        </AlertDialogProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
};
