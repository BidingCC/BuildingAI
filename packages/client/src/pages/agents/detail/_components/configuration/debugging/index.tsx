import {
  useAgentAnnotationDetailQuery,
  useCreateAgentAnnotationMutation,
  useDeleteAgentAnnotationMutation,
  useUpdateAgentAnnotationMutation,
} from "@buildingai/services/web";
import { MessageAction as AIMessageAction } from "@buildingai/ui/components/ai-elements/message";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { EditorContentRenderer } from "@buildingai/ui/components/editor";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { Bot, MessageSquare, RotateCcw, Settings2, Trash2, User } from "lucide-react";
import { FilePlusCorner, PencilLine } from "lucide-react";
import type { FormEvent } from "react";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import {
  AssistantProvider,
  convertUIMessageToMessage,
  MessageItem,
  PromptInput,
  type PromptInputHiddenTool,
  useAssistantContext,
} from "@/components/ask-assistant-ui";
import { RightFloatingPanel } from "@/components/right-floating-panel";

import { useAssistantForAgent } from "../../../_hooks/use-assistant-for-agent";
import { hasRenderableOpeningStatement } from "../../../_utils/opening-statement.ts";

type FormField = {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: Array<{ id: string; label: string }>;
};

type VoiceConfig = {
  stt?: { modelId: string; language?: string };
  tts?: { modelId: string; voiceId?: string; speed?: number };
};

type QuickCommandItem = { name: string; content: string };

function getMessageContent(message: { message: UIMessage }): string {
  const m = convertUIMessageToMessage(message.message);
  const v = m.versions?.[m.activeVersionIndex ?? 0] ?? m.versions?.[0];
  return v?.content ?? "";
}

type AnnotationContextValue = {
  agentId: string;
  getDbMessageId: (clientMessageId: string) => string | undefined;
  displayMessages: Array<{ id: string; message: UIMessage }>;
  getMessageContent: (msg: { message: UIMessage }) => string;
  annotationIdOverrides: Record<string, string>;
  setAnnotationIdOverrides: Dispatch<SetStateAction<Record<string, string>>>;
  editAnnotationId: string | null;
  setEditAnnotationId: (id: string | null) => void;
  addingAnnotationForMessageId: string | null;
  setAddingAnnotationForMessageId: (id: string | null) => void;
  createAnnotationMutation: ReturnType<typeof useCreateAgentAnnotationMutation>;
  onAddAnnotation: (clientMessageId: string) => void;
  onEditAnnotation: (annotationId: string) => void;
};

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

function useAnnotationContext(): AnnotationContextValue | null {
  return useContext(AnnotationContext);
}

function AnnotationActions({ messageId, message }: { messageId: string; message: UIMessage }) {
  const ctx = useAnnotationContext();
  if (!ctx) return null;
  console.log(message.parts);
  const isQuickCommandReply = message.parts?.some((p) => p.type === "data-reply-source");
  if (isQuickCommandReply) return null;
  const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : {};
  const annotationId =
    (metadata as { annotations?: { annotationId?: string } }).annotations?.annotationId ??
    ctx.annotationIdOverrides[messageId];
  const dbMessageId = ctx.getDbMessageId(messageId);
  const isAdding = ctx.addingAnnotationForMessageId === messageId;
  if (annotationId && ctx.onEditAnnotation) {
    return (
      <AIMessageAction
        label="Edit annotation"
        onClick={() => ctx.onEditAnnotation(annotationId)}
        tooltip="编辑标注"
      >
        <PencilLine className="size-4" />
      </AIMessageAction>
    );
  }
  if (!annotationId && ctx.onAddAnnotation && dbMessageId) {
    return (
      <AIMessageAction
        label="Add annotation"
        onClick={() => ctx.onAddAnnotation(messageId)}
        tooltip="添加标注"
        loading={isAdding}
      >
        {!isAdding && <FilePlusCorner className="size-4" />}
      </AIMessageAction>
    );
  }
  return null;
}

function AnnotationEditDialog({
  agentId,
  annotationId,
  open,
  onOpenChange,
  onSaved,
}: {
  agentId: string;
  annotationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (deletedAnnotationId?: string) => void;
}) {
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const { confirm: alertConfirm } = useAlertDialog();
  const { data: annotation, isLoading } = useAgentAnnotationDetailQuery(
    agentId,
    open && annotationId ? annotationId : undefined,
  );
  const updateMutation = useUpdateAgentAnnotationMutation(agentId);
  const deleteMutation = useDeleteAgentAnnotationMutation(agentId);

  useEffect(() => {
    if (annotation) {
      setFormQuestion(annotation.question ?? "");
      setFormAnswer(annotation.answer ?? "");
    }
  }, [annotation]);

  const handleSubmit = useCallback(async () => {
    if (!annotationId || !formQuestion.trim() || !formAnswer.trim()) return;
    try {
      await updateMutation.mutateAsync({
        annotationId,
        params: { question: formQuestion.trim(), answer: formAnswer.trim(), enabled: true },
      });
      toast.success("已更新");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("更新失败");
    }
  }, [annotationId, formQuestion, formAnswer, updateMutation, onOpenChange, onSaved]);

  const handleDelete = useCallback(async () => {
    if (!annotationId) return;
    try {
      await alertConfirm({
        title: "删除标注",
        description: "确定要删除此标注吗？",
        confirmText: "删除",
        confirmVariant: "destructive",
      });
    } catch {
      return;
    }
    onOpenChange(false);
    try {
      await deleteMutation.mutateAsync(annotationId);
      toast.success("已删除");
      onSaved(annotationId);
    } catch {
      toast.error("删除失败");
    }
  }, [annotationId, alertConfirm, deleteMutation, onOpenChange, onSaved]);

  return (
    <RightFloatingPanel
      open={open}
      onOpenChange={onOpenChange}
      title="编辑标注回复"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending || !annotationId}
          >
            <Trash2 className="size-4" />
            删除此标注
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                updateMutation.isPending || !formQuestion.trim() || !formAnswer.trim() || isLoading
              }
              loading={updateMutation.isPending}
            >
              保存
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 px-4 py-4">
        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">加载中…</div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <User className="size-4" />
                提问
              </Label>
              <Textarea
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="输入提问"
                className="bg-muted/30 min-h-[120px] resize-y rounded-lg border"
                rows={5}
              />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="size-4" />
                回复
              </Label>
              <Textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="输入回复"
                className="bg-muted/30 min-h-[160px] resize-y rounded-lg border"
                rows={6}
              />
            </div>
          </>
        )}
      </div>
    </RightFloatingPanel>
  );
}

interface DebuggingPreviewProps {
  agentId: string;
  agentName?: string;
  agentAvatar?: string;
  annotationEnabled?: boolean;
  formFields?: FormField[];
  voiceConfig?: VoiceConfig | null;
  showConversationContext?: boolean;
  showReference?: boolean;
  openingStatement?: string;
  openingQuestions?: string[];
  quickCommands?: QuickCommandItem[];
  chatAvatarEnabled?: boolean;
  chatAvatar?: string;
  thinkingSupported?: boolean;
  modelFeatures?: string[];
  hiddenTools?: PromptInputHiddenTool[];
}

function DebugPanelContent({
  formFields,
  formValues,
  onFormValueChange,
  onClear,
  isStreaming,
  annotationEnabled,
  openingStatement,
  openingQuestions,
  quickCommands = [],
  popoverOpen,
  onPopoverOpenChange,
  onOpenPopover,
  hiddenTools = [],
}: {
  formFields: FormField[];
  formValues: Record<string, string>;
  onFormValueChange: (name: string, value: string) => void;
  onClear: () => void;
  isStreaming: boolean;
  annotationEnabled?: boolean;
  openingStatement?: string;
  openingQuestions?: string[];
  quickCommands?: QuickCommandItem[];
  popoverOpen: boolean;
  onPopoverOpenChange: (open: boolean) => void;
  onOpenPopover: () => void;
  hiddenTools?: PromptInputHiddenTool[];
}) {
  const {
    displayMessages,
    streamingMessageId,
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
  const annotationContext = useAnnotationContext();

  const hasFormFields = formFields.length > 0;
  const requiredFields = useMemo(() => formFields.filter((f) => f.required), [formFields]);
  const hasRequiredMissing = useMemo(
    () => requiredFields.some((f) => (formValues[f.name] ?? "").trim() === ""),
    [requiredFields, formValues],
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
      if (hasRequiredMissing) {
        onOpenPopover();
        return;
      }
      const text = message.text?.trim();
      if (text || (message.files && message.files.length > 0)) {
        onSend(text || "", message.files);
      }
    },
    [onSend, hasRequiredMissing, onOpenPopover],
  );

  const normalizedOpeningQuestions = useMemo(
    () => (openingQuestions ?? []).map((q) => q.trim()).filter(Boolean),
    [openingQuestions],
  );
  const hasOpeningContent = useMemo(
    () => hasRenderableOpeningStatement(openingStatement),
    [openingStatement],
  );
  const hasOpening = hasOpeningContent || normalizedOpeningQuestions.length > 0;

  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 rounded-r-none! rounded-b-none! border-r-0! border-b-0! p-2">
      <CardHeader className="shrink-0 px-2 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">调试与预览</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onClear}
              title="清空对话"
              disabled={isStreaming}
            >
              <RotateCcw className="size-4" />
            </Button>
            {hasFormFields && (
              <Popover open={popoverOpen} onOpenChange={onPopoverOpenChange}>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" title="表单变量">
                    <Settings2 className="size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full" align="end">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">表单变量</h4>
                    <p className="text-muted-foreground text-xs">
                      填写表单变量后，对话中的 {"{{变量}}"} 将被替换为实际值
                    </p>
                    <Separator />
                    {formFields.map((field) => (
                      <div key={field.id} className="space-y-1.5">
                        <Label className="text-xs">
                          {field.label}
                          {field.required && <span className="ml-0.5 text-red-500">*</span>}
                        </Label>
                        {field.type === "paragraph" ? (
                          <Textarea
                            placeholder={`输入 ${field.label}`}
                            value={formValues[field.name] ?? ""}
                            onChange={(e) => onFormValueChange(field.name, e.target.value)}
                            rows={2}
                            className="text-xs"
                          />
                        ) : field.type === "select" && field.options?.length ? (
                          <select
                            className="border-input bg-background flex h-8 w-full rounded-md border px-2 text-xs"
                            value={formValues[field.name] ?? ""}
                            onChange={(e) => onFormValueChange(field.name, e.target.value)}
                          >
                            <option value="">请选择</option>
                            {field.options.map((opt) => (
                              <option key={opt.id} value={opt.label}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            placeholder={`输入 ${field.label}`}
                            value={formValues[field.name] ?? ""}
                            onChange={(e) => onFormValueChange(field.name, e.target.value)}
                            className="h-8 text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="chat-scroll flex h-full min-h-0 flex-col px-0!">
        <div className="flex h-full min-h-0 flex-col gap-4 pt-6 pb-4">
          {displayMessages.length === 0 && hasOpening && (
            <div className="flex max-w-[95%] gap-2">
              {assistantAvatar && (
                <Avatar className="size-8 shrink-0 rounded-full">
                  <AvatarImage src={assistantAvatar} alt="" />
                  <AvatarFallback className="rounded-full">
                    <Bot className="size-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="bg-muted flex w-auto min-w-0 flex-col rounded-lg p-3">
                {hasOpeningContent ? (
                  <EditorContentRenderer value={openingStatement ?? ""} />
                ) : null}
                {normalizedOpeningQuestions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {normalizedOpeningQuestions.map((q, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => {
                          if (hasRequiredMissing) {
                            onOpenPopover();
                            return;
                          }
                          onSend(q);
                        }}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {displayMessages.length === 0 && !hasOpening && (
            <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm" />
          )}
          {displayMessages.map((displayMsg) => (
            <MessageItem
              key={`${displayMsg.id}-${annotationEnabled ? "ann-on" : "ann-off"}`}
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
              extraActions={
                annotationContext && annotationEnabled ? (
                  <AnnotationActions messageId={displayMsg.id} message={displayMsg.message} />
                ) : undefined
              }
            />
          ))}
        </div>

        <div className="shrink-0 py-2">
          {quickCommands.length > 0 && (
            <div className="flex flex-wrap gap-2 py-2">
              {quickCommands.map((cmd) => (
                <Button
                  key={cmd.name}
                  type="button"
                  variant="outline"
                  size="lg"
                  className="rounded-lg"
                  onClick={() => onSend(cmd.content)}
                >
                  {cmd.name}
                </Button>
              ))}
            </div>
          )}
          <PromptInput
            textareaRef={textareaRef}
            status={status}
            onSubmit={handleSubmit}
            onStop={onStop}
            hiddenTools={hiddenTools}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DebuggingPreview({
  agentId,
  agentName,
  agentAvatar,
  annotationEnabled,
  formFields = [],
  voiceConfig = null,
  showConversationContext = true,
  showReference = true,
  openingStatement,
  openingQuestions = [],
  quickCommands = [],
  chatAvatarEnabled = false,
  chatAvatar,
  thinkingSupported = false,
  modelFeatures,
  hiddenTools: hiddenToolsProp = [],
}: DebuggingPreviewProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [annotationIdOverrides, setAnnotationIdOverrides] = useState<Record<string, string>>({});
  const [editAnnotationId, setEditAnnotationId] = useState<string | null>(null);
  const [addingAnnotationForMessageId, setAddingAnnotationForMessageId] = useState<string | null>(
    null,
  );
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasFormData = useMemo(
    () => Object.values(formValues).some((v) => String(v ?? "").trim() !== ""),
    [formValues],
  );
  const [popoverOpen, setPopoverOpen] = useState(formFields.length > 0);

  const assistantResult = useAssistantForAgent({
    agentId,
    agentName: agentName ?? "Agent",
    modelFeatures,
    saveConversation: true,
    isDebug: true,
    loadHistory: false,
    formVariables: Object.keys(formValues).length > 0 ? formValues : undefined,
    suggestions: [],
    thinkingSupported,
    voiceConfig,
    showConversationContext,
    showReference,
    assistantAvatar: chatAvatarEnabled
      ? chatAvatar?.trim()
        ? chatAvatar
        : (agentAvatar ?? undefined)
      : undefined,
    disableAutoNavigate: true,
  });

  const createAnnotationMutation = useCreateAgentAnnotationMutation(agentId);

  const onAddAnnotation = useCallback(
    (clientMessageId: string) => {
      const { displayMessages, getDbMessageId } = assistantResult;
      const dbMessageId = getDbMessageId?.(clientMessageId);
      if (!dbMessageId) {
        toast.error("无法获取消息 ID");
        return;
      }
      const idx = displayMessages.findIndex((m) => m.id === clientMessageId);
      if (idx <= 0) return;
      const assistantMsg = displayMessages[idx];
      const userMsg = displayMessages[idx - 1];
      if (userMsg.message.role !== "user" || assistantMsg.message.role !== "assistant") return;
      const question = getMessageContent(userMsg);
      const answer = getMessageContent(assistantMsg);
      if (!question.trim() || !answer.trim()) {
        toast.error("问题或回复为空");
        return;
      }
      setAddingAnnotationForMessageId(clientMessageId);
      createAnnotationMutation
        .mutateAsync({
          question: question.trim(),
          answer: answer.trim(),
          messageId: dbMessageId,
          enabled: true,
        })
        .then((created) => {
          setAnnotationIdOverrides((prev) => ({ ...prev, [clientMessageId]: created.id }));
          toast.success("已添加标注");
        })
        .catch(() => {
          toast.error("添加标注失败");
        })
        .finally(() => {
          setAddingAnnotationForMessageId(null);
        });
    },
    [assistantResult.displayMessages, assistantResult.getDbMessageId, createAnnotationMutation],
  );

  const onEditAnnotation = useCallback((annotationId: string) => {
    setEditAnnotationId(annotationId);
  }, []);

  const onAnnotationEditSaved = useCallback(
    (deletedAnnotationId?: string) => {
      setEditAnnotationId(null);
      if (deletedAnnotationId) {
        setAnnotationIdOverrides((prev) => {
          const next = { ...prev };
          for (const [msgId, annId] of Object.entries(next)) {
            if (annId === deletedAnnotationId) {
              delete next[msgId];
              break;
            }
          }
          return next;
        });
        queryClient.removeQueries({
          queryKey: ["agents", "annotations", agentId, "detail", deletedAnnotationId],
        });
      }
    },
    [agentId, queryClient],
  );

  const { clearMessages, getDbMessageId, ...contextValue } = assistantResult;

  const annotationContextValue = useMemo<AnnotationContextValue | null>(() => {
    if (!getDbMessageId) return null;
    return {
      agentId,
      getDbMessageId,
      displayMessages: assistantResult.displayMessages.map((m) => ({
        id: m.id,
        message: m.message,
      })),
      getMessageContent,
      annotationIdOverrides,
      setAnnotationIdOverrides,
      editAnnotationId,
      setEditAnnotationId,
      addingAnnotationForMessageId,
      setAddingAnnotationForMessageId,
      createAnnotationMutation,
      onAddAnnotation,
      onEditAnnotation,
    };
  }, [
    agentId,
    getDbMessageId,
    assistantResult.displayMessages,
    annotationIdOverrides,
    editAnnotationId,
    addingAnnotationForMessageId,
    createAnnotationMutation,
    onAddAnnotation,
    onEditAnnotation,
  ]);

  const promptInputHiddenTools = useMemo(
    (): PromptInputHiddenTool[] => [
      "mcp",
      "quickMenu",
      "generateImage",
      "search",
      "exploreApps",
      ...(hiddenToolsProp ?? []),
    ],
    [hiddenToolsProp],
  );

  const handleFormValueChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  useEffect(() => {
    if (hasFormData) setPopoverOpen(true);
  }, [hasFormData]);

  return (
    <AnnotationContext.Provider value={annotationContextValue}>
      <AssistantProvider {...contextValue} onLike={undefined} onDislike={undefined}>
        <AnnotationEditDialog
          agentId={agentId}
          annotationId={editAnnotationId}
          open={editAnnotationId !== null}
          onOpenChange={(open) => !open && setEditAnnotationId(null)}
          onSaved={onAnnotationEditSaved}
        />
        <div ref={scrollRef} className="flex h-full min-h-0 flex-col">
          <DebugPanelContent
            formFields={formFields}
            formValues={formValues}
            onFormValueChange={handleFormValueChange}
            onClear={clearMessages}
            isStreaming={assistantResult.status === "streaming"}
            annotationEnabled={annotationEnabled}
            openingStatement={openingStatement}
            openingQuestions={openingQuestions}
            quickCommands={quickCommands}
            popoverOpen={popoverOpen}
            onPopoverOpenChange={setPopoverOpen}
            onOpenPopover={() => setPopoverOpen(true)}
            hiddenTools={promptInputHiddenTools}
          />
        </div>
      </AssistantProvider>
    </AnnotationContext.Provider>
  );
}
