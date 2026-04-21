import { fetchWebExtensionDetail } from "@buildingai/services/web";
import NotFoundPage from "@buildingai/ui/components/exception/not-found-page";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/**
 * Resolve the base URL for extension iframe.
 * - Dev: uses VITE_DEVELOP_APP_BASE_URL or falls back to localhost:4090
 * - Prod: uses current origin (same domain)
 */
function getExtensionBaseUrl() {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_DEVELOP_APP_BASE_URL || "http://localhost:4090";
  }
  return window.location.origin;
}

function isNotFoundError(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error && error.status === 404);
}

export default function AppIframePage() {
  const { identifier, "*": wildcard } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isIframeNavigatingRef = useRef(false);
  const [extensionRouteNotFoundUrl, setExtensionRouteNotFoundUrl] = useState<string | null>(null);
  const {
    error: extensionLoadError,
    isError: isExtensionLoadError,
    isLoading: isExtensionLoading,
  } = useQuery({
    queryKey: ["web", "extension", "detail", identifier],
    queryFn: () => fetchWebExtensionDetail(identifier || "", { silent: true }),
    enabled: !!identifier,
    retry: false,
  });
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  const iframeSrc = useMemo(() => {
    if (!identifier) return "";
    const subPath = wildcard ? `/${wildcard}` : "";
    return `${getExtensionBaseUrl()}/extension/${identifier}${subPath}${location.search}${location.hash}`;
  }, [identifier, wildcard, location.search, location.hash]);

  // Listen for navigation messages from iframe (iframe → parent sync)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data?.type === "extension-not-found") {
        if (!identifier) return;

        const path = event.data.path ?? "";
        const search = event.data.search ?? "";
        const hash = event.data.hash ?? "";
        const newUrl = `/apps/${identifier}${path}${search}${hash}`;

        setExtensionRouteNotFoundUrl(newUrl);

        if (newUrl !== currentUrl) {
          navigate(newUrl, { replace: true });
        }

        return;
      }

      if (event.data?.type !== "extension-navigate" || !identifier) return;

      isIframeNavigatingRef.current = true;
      const path = event.data.path ?? "";
      const search = event.data.search ?? "";
      const hash = event.data.hash ?? "";
      const newUrl = `/apps/${identifier}${path}${search}${hash}`;

      if (newUrl !== currentUrl) {
        navigate(newUrl, { replace: true });
      }

      requestAnimationFrame(() => {
        isIframeNavigatingRef.current = false;
      });
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currentUrl, identifier, navigate]);

  // Handle browser back/forward (parent → iframe sync)
  useEffect(() => {
    if (isIframeNavigatingRef.current || !identifier) return;

    const subPath = wildcard ? `/${wildcard}` : "/";
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "parent-navigate",
        path: subPath,
        search: location.search,
        hash: location.hash,
      },
      "*",
    );
  }, [identifier, wildcard, location.search, location.hash]);

  if (isExtensionLoadError) {
    if (isNotFoundError(extensionLoadError)) {
      return <NotFoundPage />;
    }

    throw extensionLoadError;
  }

  if (isExtensionLoading || extensionRouteNotFoundUrl === currentUrl) {
    return extensionRouteNotFoundUrl === currentUrl ? <NotFoundPage /> : null;
  }

  return (
    <iframe
      key={identifier}
      ref={iframeRef}
      src={iframeSrc}
      className="h-dvh w-full border-0"
      title={identifier}
      allow="clipboard-read; clipboard-write"
    />
  );
}
