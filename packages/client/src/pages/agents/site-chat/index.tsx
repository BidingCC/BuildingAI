import { useI18n } from "@buildingai/i18n";
import type { PublishedAgentDetail } from "@buildingai/types";
import { type FormFieldConfig } from "@buildingai/types/ai/agent-config.interface";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { EditorContentRenderer } from "@buildingai/ui/components/editor";
import {
  InfiniteScrollTop,
  InfiniteScrollTopScrollButton,
} from "@buildingai/ui/components/infinite-scroll-top";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@buildingai/ui/components/ui/empty";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { Separator } from "@buildingai/ui/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@buildingai/ui/components/ui/sheet";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { cn } from "@buildingai/ui/lib/utils";
import { Bot, ClipboardPenLine, ListIndentDecrease, PanelLeft } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { useNavigate, useParams } from "react-router-dom";

import {
  AssistantProvider,
  MessageItem,
  PromptInput,
  type PromptInputHiddenTool,
} from "@/components/ask-assistant-ui";

import { usePublicAgentAssistant } from "./_hooks/use-public-agent-assistant";

const AGENT_MODEL_ID = "agent";

const HIDDEN_TOOLS: PromptInputHiddenTool[] = [
  "mcp",
  "quickMenu",
  "generateImage",
  "search",
  "exploreApps",
  "file",
  "speech",
  "thinking",
];

function getOrCreateAnonymousId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const key = "buildingai_anon_id";
  const existing = window.localStorage.getItem(key);
  if (existing && existing.trim()) return existing.trim();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, id);
  return id;
}

function getSelectOptions(field: FormFieldConfig): Array<{ value: string; label: string }> {
  const opts = field.options;
  if (!opts?.length) return [];
  return opts.map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label },
  );
}

interface SiteChatSidebarPanelProps {
  isAgentLoading: boolean;
  agent: PublishedAgentDetail | undefined;
  agentId: string;
  accessToken: string;
  navigate: NavigateFunction;
  isLoadingConversations: boolean;
  conversations: Array<{ id: string; title: string }> | undefined;
  /** Active conversation id from the URL (`/c/:conversationId`), for list selection styling. */
  currentConversationId?: string;
  openConversation: (id: string) => void;
  onAfterNavigate?: () => void;
  onCompactSidebar?: () => void;
  t: ReturnType<typeof useI18n>["t"];
}

function SiteChatSidebarPanel({
  isAgentLoading,
  agent,
  agentId,
  accessToken,
  navigate,
  isLoadingConversations,
  conversations,
  currentConversationId,
  openConversation,
  onAfterNavigate,
  onCompactSidebar,
  t,
}: SiteChatSidebarPanelProps) {
  return (
    <div className="space-y-4 px-1!">
      {isAgentLoading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-full rounded-sm" />
            <Skeleton className="h-8 w-full rounded-sm" />
            <Skeleton className="h-8 w-full rounded-sm" />
          </div>
        </div>
      ) : (
        <>
          <div className="bg-sidebar sticky top-0 z-10 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="size-9 shrink-0 rounded-lg after:rounded-lg">
                <AvatarImage
                  src={agent?.avatar ?? undefined}
                  alt={agent?.name ?? ""}
                  className="rounded-lg"
                />
                <AvatarFallback className="rounded-lg">
                  <Bot className="size-4" />
                </AvatarFallback>
              </Avatar>
              <h2 className="truncate text-sm font-semibold">{agent?.name}</h2>
            </div>

            <div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={t("chat.collapseSidebar")}
                className="hover:bg-primary/10 hover:text-primary shrink-0"
                onClick={() => onCompactSidebar?.()}
              >
                <ListIndentDecrease className="size-4" />
              </Button>
            </div>
          </div>

          <Button
            variant="default"
            className="w-full"
            type="button"
            onClick={() => {
              navigate(`/agents/${agentId}/${accessToken}`);
              onAfterNavigate?.();
            }}
            disabled={!agentId || !accessToken}
          >
            {t("chat.newConversation")}
          </Button>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-foreground text-sm font-medium">{t("chat.history")}</span>
            </div>

            {isLoadingConversations ? (
              <div className="space-y-1">
                <Skeleton className="h-8 w-full rounded-sm" />
                <Skeleton className="h-8 w-full rounded-sm" />
                <Skeleton className="h-8 w-full rounded-sm" />
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="space-y-1">
                {conversations.map((c) => {
                  const isSelected = Boolean(
                    currentConversationId && currentConversationId === c.id,
                  );
                  return (
                    <Button
                      key={c.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "hover:bg-muted-foreground/10 w-full justify-start truncate rounded-sm px-2",
                        isSelected && "bg-muted-foreground/10 font-medium",
                      )}
                      title={c.title}
                      onClick={() => {
                        openConversation(c.id);
                        onAfterNavigate?.();
                      }}
                    >
                      {c.title}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">{t("chat.noConversations")}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function PublishChatPage() {
  const { t } = useI18n();
  const {
    agentId: agentIdParam,
    accessToken: accessTokenParam,
    conversationId: conversationIdParam,
  } = useParams<{
    agentId?: string;
    accessToken?: string;
    conversationId?: string;
  }>();

  const navigate = useNavigate();
  const agentId = agentIdParam ?? "";
  const accessToken = accessTokenParam ?? "";
  const [anonymousIdentifier] = useState<string | undefined>(() => getOrCreateAnonymousId());
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formPopoverOpen, setFormPopoverOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);

  const formVariables = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(formValues)) {
      const t = v.trim();
      if (t) out[k] = t;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }, [formValues]);

  const {
    providerValue,
    agent,
    isAgentLoading,
    conversations,
    isLoadingConversations,
    conversationsEmbedAccessDisabled,
    formFields,
    requiredFields,
    assistantAvatar,
    openingQuestions,
    openingStatementValue,
    hasOpeningContent,
    hasOpening,
    isFirstSession,
    canOperateMessage,
    openConversation,
  } = usePublicAgentAssistant({
    agentId,
    accessToken,
    anonymousIdentifier,
    conversationId: conversationIdParam,
    formVariables,
  });

  const {
    displayMessages,
    status,
    onStop,
    onSend,
    streamingMessageId,
    addToolApprovalResponse,
    onRegenerate,
    models,
    liked,
    disliked,
    isLoading: isLoadingHistory,
    isLoadingMoreMessages,
    hasMoreMessages,
    onLoadMoreMessages,
    onLike,
    onDislike,
    onEditMessage,
    onSwitchBranch,
  } = providerValue;

  const stop = onStop;

  const requiredFilled = useMemo(
    () => requiredFields.every((f) => (formValues[f.name] ?? "").trim() !== ""),
    [requiredFields, formValues],
  );

  const handleFormValueChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const ensureFormReady = useCallback(() => {
    if (formFields.length > 0 && !requiredFilled) {
      setFormPopoverOpen(true);
      return false;
    }
    return true;
  }, [formFields.length, requiredFilled]);

  const handleSubmit = useCallback(
    (message: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
      if (!ensureFormReady()) return;

      const text = message.text?.trim();
      const files = message.files;
      if (text || (files && files.length > 0)) {
        onSend(text || "", files);
      }
    },
    [ensureFormReady, onSend],
  );

  const sidebarPanelProps: SiteChatSidebarPanelProps = {
    isAgentLoading,
    agent,
    agentId,
    accessToken,
    navigate,
    isLoadingConversations,
    conversations,
    currentConversationId: conversationIdParam,
    openConversation,
    t,
  };

  if (conversationsEmbedAccessDisabled) {
    return (
      <div className="bg-background flex h-dvh min-h-0 w-full flex-col items-center justify-center p-6">
        <Empty className="max-w-md flex-none border-0 shadow-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardPenLine className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{t("chat.webPreviewDisabled.title")}</EmptyTitle>
            <EmptyDescription>{t("chat.webPreviewDisabled.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-dvh min-h-0 w-full gap-0 p-1 sm:p-2 md:gap-2",
        desktopSidebarExpanded ? "bg-sidebar" : "bg-background",
      )}
    >
      <aside
        className={cn(
          "chat-scroll hidden h-full min-h-0 w-64 shrink-0 flex-col py-2",
          desktopSidebarExpanded ? "md:flex" : "md:hidden",
        )}
      >
        <SiteChatSidebarPanel
          {...sidebarPanelProps}
          onCompactSidebar={() => setDesktopSidebarExpanded(false)}
        />
      </aside>

      <AssistantProvider {...providerValue}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <main
              className={cn(
                "bg-background relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg md:rounded-xl",
                !desktopSidebarExpanded && "md:rounded-sm",
              )}
            >
              <header className="sticky top-0 z-10 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 md:hidden"
                      aria-label={t("chat.openMenu")}
                    >
                      <PanelLeft className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={t("chat.expandSidebar")}
                    aria-label={t("chat.expandSidebar")}
                    className={cn("shrink-0", desktopSidebarExpanded ? "hidden" : "hidden md:flex")}
                    onClick={() => setDesktopSidebarExpanded(true)}
                  >
                    <ListIndentDecrease className="size-4 rotate-180" />
                  </Button>
                  {assistantAvatar ? (
                    <Avatar className="size-8 shrink-0 rounded-lg after:rounded-lg">
                      <AvatarImage src={assistantAvatar} alt="" className="rounded-lg" />
                      <AvatarFallback className="rounded-lg">
                        <Bot className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  ) : agent?.name ? (
                    <span className="text-foreground truncate text-sm font-medium md:hidden">
                      {agent.name}
                    </span>
                  ) : null}
                </div>

                {formFields.length > 0 ? (
                  <Popover open={formPopoverOpen} onOpenChange={setFormPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-xs"
                        title={t("chat.formVariables")}
                      >
                        <ClipboardPenLine className="size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="max-h-[min(28rem,70dvh)] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto"
                      align="end"
                    >
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">{t("chat.formVariables")}</h4>
                        <p className="text-muted-foreground text-xs">
                          {t("chat.formVariablesDescription")}
                        </p>
                        <Separator />
                        {formFields.map((field) => (
                          <div key={field.name} className="space-y-1.5">
                            <Label className="text-xs">
                              {field.label}
                              {field.required ? (
                                <span className="text-destructive ml-0.5">*</span>
                              ) : null}
                            </Label>
                            {field.type === "textarea" ? (
                              <Textarea
                                placeholder={`${t("common.input")} ${field.label}`}
                                value={formValues[field.name] ?? ""}
                                onChange={(e) => handleFormValueChange(field.name, e.target.value)}
                                rows={2}
                                className="resize-none text-xs"
                              />
                            ) : field.type === "select" ? (
                              <select
                                className="border-input bg-background flex h-8 w-full rounded-md border px-2 text-xs"
                                value={formValues[field.name] ?? ""}
                                onChange={(e) => handleFormValueChange(field.name, e.target.value)}
                              >
                                <option value="">{t("common.select")}</option>
                                {getSelectOptions(field).map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                placeholder={`${t("common.input")} ${field.label}`}
                                value={formValues[field.name] ?? ""}
                                onChange={(e) => handleFormValueChange(field.name, e.target.value)}
                                className="h-8 text-xs"
                                maxLength={field.maxLength}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : null}
              </header>

              <InfiniteScrollTop
                className="chat-scroll relative flex min-h-0 w-full flex-1 flex-col"
                hideScrollToBottomButton
                prependKey={displayMessages[0]?.id ?? null}
                hasMore={hasMoreMessages}
                isLoadingMore={isLoadingMoreMessages}
                onLoadMore={onLoadMoreMessages}
                forceFullHeight={isFirstSession}
              >
                <div
                  className={
                    isFirstSession
                      ? "mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-3 pt-6 pb-3 sm:px-4 sm:pt-8 sm:pb-4"
                      : "mx-auto flex w-full max-w-3xl flex-col gap-4 px-0 pt-6 pb-3 sm:px-4 sm:pt-8 sm:pb-4"
                  }
                >
                  {isFirstSession && !isAgentLoading ? (
                    <>
                      {hasOpening ? (
                        <div className="flex w-full gap-3">
                          {assistantAvatar ? (
                            <Avatar className="size-8 shrink-0 rounded-full">
                              <AvatarImage src={assistantAvatar} alt="" />
                              <AvatarFallback className="rounded-full">
                                <Bot className="size-4" />
                              </AvatarFallback>
                            </Avatar>
                          ) : null}
                          <div className="bg-muted flex min-w-0 flex-col rounded-2xl px-4 py-3">
                            {hasOpeningContent ? (
                              <EditorContentRenderer
                                value={openingStatementValue ?? ""}
                                className="prose prose-neutral dark:prose-invert prose-pre:bg-primary/15 prose-pre:text-foreground max-w-full text-sm"
                              />
                            ) : null}
                            {openingQuestions.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {openingQuestions.map((q, i) => (
                                  <Button
                                    key={i}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() => {
                                      if (!ensureFormReady()) return;
                                      onSend(q, undefined);
                                    }}
                                  >
                                    {q}
                                  </Button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : isLoadingHistory && displayMessages.length === 0 ? (
                    <div className="flex w-full flex-1 flex-col gap-4">
                      <div className="flex gap-3">
                        <Skeleton className="size-8 shrink-0 rounded-lg" />
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <Skeleton className="h-4 w-full rounded-md" />
                          <Skeleton className="h-4 w-[92%] rounded-md" />
                          <Skeleton className="h-4 w-[78%] rounded-md" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Skeleton className="h-11 w-[min(100%,20rem)] rounded-2xl" />
                      </div>
                      <div className="flex gap-3">
                        <Skeleton className="size-8 shrink-0 rounded-lg" />
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <Skeleton className="h-4 w-full rounded-md" />
                          <Skeleton className="h-4 w-[88%] rounded-md" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col gap-4">
                      {displayMessages.map((dm) => {
                        const isStreaming = streamingMessageId === dm.id;
                        return (
                          <MessageItem
                            key={dm.id}
                            displayMessage={dm}
                            isStreaming={isStreaming}
                            liked={Boolean(liked[dm.id])}
                            disliked={Boolean(disliked[dm.id])}
                            addToolApprovalResponse={addToolApprovalResponse}
                            onRegenerate={onRegenerate}
                            onEditMessage={onEditMessage}
                            onSwitchBranch={canOperateMessage ? onSwitchBranch : undefined}
                            onLike={canOperateMessage ? onLike : undefined}
                            onDislike={canOperateMessage ? onDislike : undefined}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-background sticky bottom-0 z-10">
                  <InfiniteScrollTopScrollButton className="-top-12 z-20" />
                  <div className="mx-auto w-full max-w-3xl px-0 py-2 sm:px-4 sm:py-3">
                    <PromptInput
                      textareaRef={undefined}
                      status={status}
                      onSubmit={handleSubmit}
                      onStop={stop}
                      hiddenTools={HIDDEN_TOOLS}
                      models={models}
                      selectedModelId={AGENT_MODEL_ID}
                      selectedMcpServerIds={[]}
                    />
                  </div>
                </div>
              </InfiniteScrollTop>
            </main>
            <SheetContent
              side="left"
              className="bg-sidebar flex h-full w-[min(20rem,calc(100vw-1rem))] max-w-[min(20rem,calc(100vw-1rem))] flex-col gap-0 border-r p-0 sm:max-w-sm"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{t("chat.chatMenu")}</SheetTitle>
                <SheetDescription>{t("chat.chatMenuDescription")}</SheetDescription>
              </SheetHeader>
              <div className="chat-scroll flex min-h-0 flex-1 flex-col overflow-y-auto py-2">
                <SiteChatSidebarPanel
                  {...sidebarPanelProps}
                  onAfterNavigate={() => setMobileSidebarOpen(false)}
                  onCompactSidebar={() => setMobileSidebarOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </AssistantProvider>
    </div>
  );
}
