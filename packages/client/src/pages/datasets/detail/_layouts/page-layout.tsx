import {
  type ImperativePanelHandle,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@buildingai/ui/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { cn } from "@buildingai/ui/lib/utils";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const SMALL_BREAKPOINT = 768;

function useSmallScreen() {
  const [small, setSmall] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < SMALL_BREAKPOINT : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SMALL_BREAKPOINT - 1}px)`);
    const onChange = () => setSmall(mql.matches);
    mql.addEventListener("change", onChange);
    setSmall(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return small;
}

interface ChatPanelContextValue {
  chatOpen: boolean;
  toggleChatPanel: () => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue>({
  chatOpen: false,
  toggleChatPanel: () => {},
});

export function useChatPanel() {
  return useContext(ChatPanelContext);
}

export interface PageLayoutProps {
  panel: ReactNode;
  children: ReactNode;
}

type MobileView = "chat" | "documents";

export function PageLayout({ panel, children }: PageLayoutProps) {
  const isSmallScreen = useSmallScreen();
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  const chatPanelRef = useRef<ImperativePanelHandle>(null);

  const toggleChatPanel = useCallback(() => {
    if (isSmallScreen) {
      setMobileView((prev) => (prev === "chat" ? "documents" : "chat"));
    } else {
      const api = chatPanelRef.current;
      if (!api) return;
      if (api.isCollapsed()) api.expand();
      else api.collapse();
    }
  }, [isSmallScreen]);

  const chatVisible = isSmallScreen ? mobileView === "chat" : chatOpen;
  const contextValue = useMemo(
    () => ({ chatOpen: chatVisible, toggleChatPanel }),
    [chatVisible, toggleChatPanel],
  );

  if (isSmallScreen) {
    return (
      <ChatPanelContext.Provider value={contextValue}>
        <div className="flex h-full flex-col overflow-hidden">
          <div className="shrink-0 border-b px-4">
            <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as MobileView)}>
              <TabsList variant="line">
                <TabsTrigger value="chat">AI 对话</TabsTrigger>
                <TabsTrigger value="documents">文档</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className={cn("min-h-0 flex-1", mobileView !== "chat" && "hidden")}>{panel}</div>
          <div className={cn("min-h-0 flex-1", mobileView !== "documents" && "hidden")}>
            {children}
          </div>
        </div>
      </ChatPanelContext.Provider>
    );
  }

  return (
    <ChatPanelContext.Provider value={contextValue}>
      <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden">
        <ResizablePanel defaultSize={100} minSize={30}>
          <div className="flex h-full min-h-0 min-w-0 flex-col">{children}</div>
        </ResizablePanel>
        <ResizableHandle withHandle={chatOpen} />
        <ResizablePanel
          ref={chatPanelRef}
          collapsible
          collapsedSize={0}
          defaultSize={0}
          minSize={20}
          maxSize={60}
          onCollapse={() => setChatOpen(false)}
          onExpand={() => setChatOpen(true)}
        >
          <div className="flex h-full flex-col overflow-hidden">{panel}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </ChatPanelContext.Provider>
  );
}
