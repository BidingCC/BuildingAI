import { createContext } from "react";

import type { AskAssistantContextValue } from "./provider";

export const AskAssistantContext = createContext<AskAssistantContextValue | null>(null);
