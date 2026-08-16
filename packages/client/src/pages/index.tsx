import { useDecorateMenuQuery } from "@buildingai/services/web";
import { Loader } from "@buildingai/ui/components/loader";
import { lazy, Suspense, useMemo } from "react";
import { Outlet, useMatch } from "react-router-dom";

import { HomeAgentContext } from "@/contexts/home-agent-context";
import AgentChatPage from "@/pages/agents/detail/chat";

const MENU_HOME_FIXED = "menu_home_fixed";
const CHAT_PAGE_PATH = "/src/pages/chat/index.tsx";
const AGENT_CHAT_PAGE_PATH = "/src/pages/agents/detail/chat/index.tsx";

/**
 * Lazy-load map for all page components under /src/pages.
 * Keys are component paths like "/src/pages/index.tsx".
 */
const pageComponentMap = import.meta.glob("/src/pages/**/index.tsx") as Record<
  string,
  () => Promise<{ default: React.ComponentType }>
>;

/**
 * Layout route component that wraps / and /c/:id.
 * When the configured home page is ChatPage (default), renders <Outlet /> directly
 * so both / and /c/:id share the same ChatPage component tree (no unmount/remount).
 * When a non-ChatPage home is configured and user is on /, renders the dynamic component.
 *
 * Supports configuring a specific Agent as the home page:
 * Set menu_home_fixed.link.query = { agentId: "<agent-uuid>" } and
 * menu_home_fixed.link.component = "/src/pages/agents/detail/chat/index.tsx".
 */
export default function DynamicHomePage() {
  const { data: menuConfig, isLoading } = useDecorateMenuQuery();
  const isIndexRoute = useMatch("/");

  const homeConfig = useMemo(() => {
    const homeMenu = menuConfig?.menus?.find((m) => m.id === MENU_HOME_FIXED);
    if (!homeMenu) return { componentPath: CHAT_PAGE_PATH, agentId: null };
    return {
      componentPath: homeMenu.link?.component || CHAT_PAGE_PATH,
      agentId: (homeMenu.link?.query as Record<string, string> | undefined)?.agentId ?? null,
    };
  }, [menuConfig]);

  const { componentPath: homeComponentPath, agentId: homeAgentId } = homeConfig;
  const isChatHome = homeComponentPath === CHAT_PAGE_PATH;
  const isAgentHome = homeComponentPath === AGENT_CHAT_PAGE_PATH && !!homeAgentId;

  const DynamicComponent = useMemo(() => {
    if (isChatHome || isAgentHome) return null;

    const loader = pageComponentMap[homeComponentPath];
    if (!loader) return null;

    return lazy(loader);
  }, [homeComponentPath, isChatHome, isAgentHome]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader className="size-10" />
      </div>
    );
  }

  // Render a specific Agent as the home page
  if (isAgentHome && isIndexRoute) {
    return (
      <HomeAgentContext.Provider value={homeAgentId}>
        <AgentChatPage />
      </HomeAgentContext.Provider>
    );
  }

  if (!isChatHome && isIndexRoute && DynamicComponent) {
    return (
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <Loader className="size-10" />
          </div>
        }
      >
        <DynamicComponent />
      </Suspense>
    );
  }

  return <Outlet />;
}
