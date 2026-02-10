import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import type { AssistantContextValue } from "./types";

const AssistantContext = createContext<AssistantContextValue | null>(null);

interface AssistantProviderProps extends AssistantContextValue {
  children: ReactNode;
}

export function AssistantProvider({ children, ...value }: AssistantProviderProps) {
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistantContext() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistantContext must be used within AssistantProvider");
  }
  return context;
}

export { AssistantContext };
