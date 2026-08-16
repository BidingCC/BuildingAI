import { createContext, useContext } from "react";

/**
 * Context to pass the home page agent ID down to AgentChatPage,
 * so it can use the agent configured as the home page via decoration settings.
 */
export const HomeAgentContext = createContext<string | null>(null);

export const useHomeAgentId = () => useContext(HomeAgentContext);
