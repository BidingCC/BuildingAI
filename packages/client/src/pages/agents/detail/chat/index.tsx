import { useI18n } from "@buildingai/i18n";
import {
  type PublishedAgentDetail,
  useAgentConversationsQuery,
  useCopyAgentFromSquareMutation,
  usePublishedAgentDetailQuery,
} from "@buildingai/services/web";
import type { FormFieldConfig } from "@buildingai/types/ai/agent-config.interface";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { EditorContentRenderer } from "@buildingai/ui/components/editor";
import {
  InfiniteScrollTop,
  InfiniteScrollTopScrollButton,
} from "@buildingai/ui/components/infinite-scroll-top";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { cn } from "@buildingai/ui/lib/utils";
import { Bot, ChevronDown, ChevronLeft, ListIndentDecrease, Settings2 } from "lucide-react";
import { type FormEvent, useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  AssistantProvider,
  MessageItem,
  PromptInput,
  type PromptInputHiddenTool,
  useAssistantContext,
} from "@/components/ask-assistant-ui";

import { useAssistantForAgent } from "../_hooks/use-assistant-for-agent";
import { hasRenderableOpeningStatement } from "../_utils/opening-statement";

type PublishedAgentDetailWithUploadCapability = PublishedAgentDetail & {
  uploadCapability?: {
    supportedUploadTypes: Array<"image" | "video" | "audio" | "file">;
  };
};

type HiddenTools = PromptInputHiddenTool[];
const HIDDEN_TOOLS: HiddenTools = ["mcp", "quickMenu", "generateImage", "search", "exploreApps"];

function formatCount(n?: number): string {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/**
 * Formats token counts for billing display.
 * Examples: 1000 -> 1k, 1500 -> 1.5k.
 */
function formatTokenCount(n?: number): string {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

type AgentChatBillingRule = {
  power: number;
  tokens: number;
};

function ChatHeader({
  avatar,
  name,
  description,
}: {
  avatar?: string | null;
  name?: string | null;
  description?: string | null;
}) {
  const { t } = useI18n();
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-3 px-4 pb-4">
      <Avatar className="size-14 shrink-0 rounded-full">
        <AvatarImage src={avatar ?? undefined} alt={name ?? ""} />
        <AvatarFallback className="rounded-full">
          <Bot className="size-6" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-center text-lg font-semibold">{name ?? t("agent.name")}</h1>
        {description ? (
          <p className="text-muted-foreground max-w-md text-center text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function getSelectOptions(field: FormFieldConfig): Array<{ value: string; label: string }> {
  const opts = field.options;
  if (!opts?.length) return [];
  return opts.map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value ?? o.label, label: o.label },
  );
}

function AgentInfoPanel({
  agent,
  isLoading,
  conversations,
  isLoadingConversations,
  currentConversationId,
}: {
  agent: PublishedAgentDetail | undefined;
  isLoading: boolean;
  conversations: Array<{ id: string; title: string }>;
  isLoadingConversations: boolean;
  currentConversationId?: string;
}) {
  const { t } = useI18n();
  const copyAgentMutation = useCopyAgentFromSquareMutation(agent?.id ?? "");
  const navigate = useNavigate();
  const [historyCollapsed, setHistoryCollapsed] = useState(false);

  const handleCopyAgent = useCallback(async () => {
    if (!agent?.id) return;
    try {
      const result = await copyAgentMutation.mutateAsync();
      const newId = result?.id;
      toast.success(t("agent.detail.chat.copiedToMyAgents"));
      if (newId) {
        navigate(`/agents/${newId}/configuration`);
      }
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t("agent.detail.chat.copyFailed");
      toast.error(message);
    }
  }, [agent?.id, copyAgentMutation, navigate, t]);

  const tags = agent?.tags ?? [];
  const conversationCount = agent?.conversationCount ?? 0;
  const messageCount = agent?.messageCount ?? 0;
  const creatorName = agent?.creator?.nickname ?? t("agent.detail.chat.unknownUser");
  const publishedAgent = agent as
    | (PublishedAgentDetail & {
        chatBillingRule?: AgentChatBillingRule;
      })
    | undefined;
  const chatModelBillingRule =
    publishedAgent?.chatBillingRule ??
    agent?.models?.find((model) => model.role === "chat")?.billingRule;
  const modelConsumptionText =
    !chatModelBillingRule || chatModelBillingRule.power <= 0
      ? t("agent.detail.free")
      : `${chatModelBillingRule.power} ${t("agent.detail.credits")} / ${formatTokenCount(chatModelBillingRule.tokens)} tokens`;
  return (
    <div className="chat-scroll flex h-full min-h-0 w-80 shrink-0 flex-col">
      <div className="flex h-full min-h-0 flex-col gap-3 px-6 py-3 pr-3!">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-center">
              <Avatar className="size-16 rounded-lg after:rounded-lg">
                <AvatarImage
                  src={agent?.avatar ?? undefined}
                  alt={agent?.name ?? ""}
                  className="rounded-lg"
                />
                <AvatarFallback className="rounded-lg">
                  <Bot className="size-4" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{agent?.name ?? t("agent.name")}</h2>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Avatar className="size-6 rounded-full">
                <AvatarImage src={agent?.creator?.avatar ?? undefined} alt={creatorName} />
                <AvatarFallback className="rounded-full text-xs">
                  {creatorName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground text-sm">{creatorName}</span>
            </div>

            <div className="">
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <span>{t("agent.detail.chat.agentConsumption")}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-3 text-xs">
                <span className="text-foreground text-sm font-semibold">
                  {modelConsumptionText}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <span>
                  <span className="text-foreground text-base font-bold">
                    {formatCount(conversationCount)}
                  </span>{" "}
                  {t("agent.detail.chat.conversations")}
                </span>
                <Separator orientation="vertical" className="bg-muted-foreground/60 h-3" />
                <span>
                  <span className="text-foreground text-base font-bold">
                    {formatCount(messageCount)}
                  </span>{" "}
                  {t("agent.detail.chat.messages")}
                </span>
              </div>
              <div className="text-muted-foreground text-sm">{t("agent.detail.chat.freeCopy")}</div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="w-full">
                <Button
                  variant="default"
                  className="w-full"
                  type="button"
                  onClick={handleCopyAgent}
                  disabled={copyAgentMutation.isPending}
                >
                  {copyAgentMutation.isPending
                    ? t("agent.detail.chat.copying")
                    : t("agent.detail.chat.copyToMyAgents")}
                </Button>
              </div>
              <div className="w-full">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={() => navigate(`/agents/${agent?.id}/chat`)}
                  disabled={!agent?.id}
                >
                  {t("agent.detail.chat.newConversation")}
                </Button>
              </div>
            </div>

            {agent?.description ? (
              <p className="text-muted-foreground text-sm leading-relaxed">{agent.description}</p>
            ) : null}

            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between py-0.5"
                onClick={() => setHistoryCollapsed((prev) => !prev)}
              >
                <span className="text-foreground text-sm font-medium">
                  {t("agent.detail.chat.history")}
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${historyCollapsed ? "-rotate-90" : "rotate-0"}`}
                />
              </button>
              {!historyCollapsed &&
                (isLoadingConversations ? (
                  <div className="mt-2 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : conversations.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {conversations.map((item) => (
                      <Button
                        key={item.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "hover:bg-muted-foreground/10 w-full justify-start truncate rounded-sm px-2",
                          currentConversationId === item.id && "bg-muted-foreground/10",
                        )}
                        title={item.title}
                        onClick={() => navigate(`/agents/${agent?.id}/c/${item.id}`)}
                      >
                        {item.title}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground mt-2 text-xs">
                    {t("agent.detail.chat.noConversations")}
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChatContent({
  agentAvatar,
  agentName,
  agentDescription,
  formFields,
  formValues,
  onOpenForm,
  openingStatement,
  openingQuestions,
}: {
  agentAvatar?: string | null;
  agentName?: string | null;
  agentDescription?: string | null;
  formFields: FormFieldConfig[];
  formValues: Record<string, string>;
  onOpenForm?: () => void;
  openingStatement?: string | null;
  openingQuestions?: string[] | null;
}) {
  const {
    displayMessages,
    streamingMessageId,
    isLoading,
    status,
    textareaRef,
    onSend,
    onStop,
    liked,
    disliked,
    onLike,
    onDislike,
    onRegenerate,
    onEditMessage,
    onSwitchBranch,
    addToolApprovalResponse,
    assistantAvatar,
  } = useAssistantContext();

  const normalizedOpeningQuestions = useMemo(
    () => (openingQuestions ?? []).map((q) => q.trim()).filter(Boolean),
    [openingQuestions],
  );
  const hasOpeningContent = useMemo(
    () => hasRenderableOpeningStatement(openingStatement),
    [openingStatement],
  );
  const hasOpening = hasOpeningContent || normalizedOpeningQuestions.length > 0;
  const hasForm = formFields.length > 0;
  const requiredFields = formFields.filter((f) => f.required);
  const requiredFilled = requiredFields.every((f) => (formValues[f.name] ?? "").trim() !== "");

  const hasCurrentMessages = displayMessages.length > 0;
  const isFirstSession = !hasCurrentMessages && !isLoading;

  const handleSubmit = useCallback(
    (message: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
      if (hasForm && !requiredFilled && onOpenForm) {
        onOpenForm();
        throw new Error("FORM_REQUIRED");
      }
      const text = message.text?.trim();
      if (text || (message.files && message.files.length > 0)) {
        onSend(text || "", message.files);
      }
    },
    [onSend, hasForm, requiredFilled, onOpenForm],
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col items-center">
      <InfiniteScrollTop
        className="chat-scroll relative flex min-h-0 w-full flex-1 flex-col"
        hideScrollToBottomButton
        forceFullHeight={isFirstSession}
      >
        <div
          className={
            isFirstSession
              ? "mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 pt-8 pb-4"
              : "mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-8 pb-4"
          }
        >
          {isLoading && !hasCurrentMessages ? (
            <div className="flex w-full flex-1 items-center justify-center">
              <p className="text-muted-foreground text-sm">{t("agent.detail.loading")}</p>
            </div>
          ) : isFirstSession ? (
            <>
              <ChatHeader avatar={agentAvatar} name={agentName} description={agentDescription} />
              {hasOpening ? (
                <div className="flex w-full gap-3">
                  {assistantAvatar && (
                    <Avatar className="size-8 shrink-0 rounded-full">
                      <AvatarImage src={assistantAvatar} alt={agentName || ""} />
                      <AvatarFallback className="rounded-full">
                        <Bot className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="bg-muted flex min-w-0 flex-col rounded-2xl px-4 py-3">
                    {hasOpeningContent ? (
                      <EditorContentRenderer value={openingStatement ?? ""} />
                    ) : null}
                    {normalizedOpeningQuestions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {normalizedOpeningQuestions.map((q, i) => (
                          <Button
                            key={i}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => onSend(q)}
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
          ) : (
            <>
              {hasCurrentMessages ? (
                displayMessages.map((displayMsg) => (
                  <MessageItem
                    key={displayMsg.id}
                    displayMessage={displayMsg}
                    isStreaming={streamingMessageId === displayMsg.id}
                    liked={liked[displayMsg.id]}
                    disliked={disliked[displayMsg.id]}
                    onLike={onLike}
                    onDislike={onDislike}
                    onRegenerate={onRegenerate}
                    onEditMessage={onEditMessage}
                    onSwitchBranch={onSwitchBranch}
                    addToolApprovalResponse={addToolApprovalResponse}
                  />
                ))
              ) : hasOpening ? (
                <div className="flex w-full gap-3">
                  {assistantAvatar && (
                    <Avatar className="size-8 shrink-0 rounded-full">
                      <AvatarImage src={assistantAvatar} alt={agentName || ""} />
                      <AvatarFallback className="rounded-full">
                        <Bot className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="bg-muted flex min-w-0 flex-col rounded-2xl px-4 py-3">
                    {hasOpeningContent ? (
                      <EditorContentRenderer value={openingStatement ?? ""} />
                    ) : null}
                    {normalizedOpeningQuestions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {normalizedOpeningQuestions.map((q, i) => (
                          <Button
                            key={i}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => onSend(q)}
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
          )}
        </div>
        <div className="bg-background sticky bottom-0 z-10">
          <InfiniteScrollTopScrollButton className="-top-12 z-20" />
          <div className="mx-auto w-full max-w-3xl px-4 py-3">
            <PromptInput
              textareaRef={textareaRef}
              status={status}
              onSubmit={handleSubmit}
              onStop={onStop}
              hiddenTools={HIDDEN_TOOLS}
            />
          </div>
        </div>
      </InfiniteScrollTop>
    </div>
  );
}

const AgentChatPage = () => {
  const { t } = useI18n();
  const { id, uuid } = useParams<{ id?: string; uuid?: string }>();
  const navigate = useNavigate();
  const agentId = id ?? "";

  const { data: agent, isLoading: isAgentLoading } = usePublishedAgentDetailQuery(agentId, {
    refetchOnWindowFocus: false,
  });

  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const formFields = useMemo(
    () => (Array.isArray(agent?.formFields) ? agent.formFields : []) as FormFieldConfig[],
    [agent?.formFields],
  );

  const voiceConfig = useMemo(() => agent?.voiceConfig ?? null, [agent?.voiceConfig]);

  const chatAvatarEnabled = Boolean(agent?.chatAvatarEnabled);
  const chatAvatar = agent?.chatAvatar ?? undefined;
  const agentAvatar = agent?.avatar ?? undefined;

  const assistantAvatar = chatAvatarEnabled
    ? chatAvatar?.trim()
      ? chatAvatar
      : agentAvatar
    : undefined;

  const formVariables = useMemo(() => {
    if (Object.keys(formValues).length === 0) return undefined;
    return formValues;
  }, [formValues]);

  const chatModelFeatures = useMemo(
    () => agent?.models?.find((model) => model.role === "chat")?.features ?? [],
    [agent?.models],
  );

  const supportedUploadTypes = useMemo(
    () =>
      (agent as PublishedAgentDetailWithUploadCapability | undefined)?.uploadCapability
        ?.supportedUploadTypes,
    [agent],
  );

  const assistantResult = useAssistantForAgent({
    agentId,
    agentName: agent?.name ?? "Agent",
    modelFeatures: chatModelFeatures,
    saveConversation: true,
    formVariables,
    suggestions: [],
    thinkingSupported: Boolean(agent?.modelConfig),
    voiceConfig,
    showConversationContext: false,
    assistantAvatar,
    conversationId: uuid,
    supportedUploadTypes,
  });

  const { ...contextValue } = assistantResult;
  const { data: conversationsData, isLoading: isLoadingConversations } = useAgentConversationsQuery(
    agentId || undefined,
    { page: 1, pageSize: 30, sortBy: "updatedAt" },
    { enabled: !!agentId },
  );
  const conversations = useMemo(
    () =>
      (conversationsData?.items ?? []).map((item) => ({
        id: item.id,
        title: item.title?.trim() || t("agent.detail.chat.newConversation"),
      })),
    [conversationsData?.items, t],
  );

  const handleFormValueChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const [formPopoverOpen, setFormPopoverOpen] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const hasForm = formFields.length > 0;

  return (
    <div
      className={
        panelExpanded ? "bg-muted flex h-dvh w-full py-2 pl-2" : "bg-background flex h-dvh w-full"
      }
    >
      <div
        className={
          panelExpanded
            ? "bg-background relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-sm"
            : "relative flex min-w-0 flex-1 flex-col overflow-hidden"
        }
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 pt-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => navigate("/agents")}>
              <ChevronLeft />
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="size-8 rounded-lg after:rounded-lg">
                <AvatarImage
                  className="rounded-lg"
                  src={agent?.avatar ?? undefined}
                  alt={agent?.name ?? ""}
                />
                <AvatarFallback className="rounded-lg">
                  <Bot className="size-4" />
                </AvatarFallback>
              </Avatar>
              <span className={panelExpanded ? "opacity-0" : "opacity-100 transition"}>
                {agent?.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              title={
                panelExpanded
                  ? t("agent.detail.chat.collapsePanel")
                  : t("agent.detail.chat.expandPanel")
              }
              onClick={() => setPanelExpanded((v) => !v)}
            >
              {panelExpanded ? (
                <ListIndentDecrease className="size-4 rotate-180" />
              ) : (
                <ListIndentDecrease className="size-4" />
              )}
            </Button>
            {hasForm && (
              <Popover open={formPopoverOpen} onOpenChange={setFormPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" title={t("agent.detail.formVariables")}>
                    <Settings2 className="size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">{t("agent.detail.formVariables")}</h4>
                    <p className="text-muted-foreground text-xs">
                      {t("agent.detail.formVariablesDesc")}
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
                            placeholder={t("agent.detail.inputPlaceholder", { label: field.label })}
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
                            <option value="">{t("agent.detail.pleaseSelect")}</option>
                            {getSelectOptions(field).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            placeholder={t("agent.detail.inputPlaceholder", { label: field.label })}
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
            )}
          </div>
        </header>
        <AssistantProvider {...contextValue}>
          <ChatContent
            agentAvatar={agentAvatar}
            agentName={agent?.name}
            agentDescription={agent?.description}
            formFields={formFields}
            formValues={formValues}
            onOpenForm={() => setFormPopoverOpen(true)}
            openingStatement={agent?.openingStatement}
            openingQuestions={agent?.openingQuestions ?? []}
          />
        </AssistantProvider>
      </div>
      {panelExpanded && (
        <AgentInfoPanel
          agent={agent}
          isLoading={isAgentLoading}
          conversations={conversations}
          isLoadingConversations={isLoadingConversations}
          currentConversationId={uuid}
        />
      )}
    </div>
  );
};

export default AgentChatPage;
