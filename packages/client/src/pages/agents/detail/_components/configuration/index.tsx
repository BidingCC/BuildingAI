import { useDocumentHead } from "@buildingai/hooks";
import { useI18n } from "@buildingai/i18n";
import {
  updateAgentConfig,
  useAgentDetailQuery,
  useAiProvidersQuery,
  usePublishAgentToSquareMutation,
  useUnpublishAgentFromSquareMutation,
} from "@buildingai/services/web";
import type {
  AnnotationConfig,
  ModelRouting,
  ThirdPartyIntegrationConfig,
  VoiceConfig,
} from "@buildingai/types";
import { EditorDndScope } from "@buildingai/ui/components/editor";
import { Button } from "@buildingai/ui/components/ui/button";
// import { Switch } from "@buildingai/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { TooltipProvider } from "@buildingai/ui/components/ui/tooltip";
import { ArrowBigUp, Loader2, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import OrchestrationLayout from "../../_layouts";
import DebuggingPreview from "./debugging";
import {
  AgentFeatures,
  ContextSettings,
  FormVariables,
  KnowledgeBase,
  McpTools,
  RolePrompt,
  ThirdPartyIntegration,
} from "./function";
import {
  AutoFollowUp,
  ChatAvatar,
  QuickCommands,
  StarterQuestions,
  WelcomeMessage,
} from "./interface";
import { ModelSelector, VoiceConfigDefaultsSync, VoiceConfigSelector } from "./model";
import { PublishDialog } from "./publish-dialog";

type QuickCommandState = {
  avatar?: string;
  name: string;
  content: string;
  replyType: "custom" | "model";
  replyContent?: string;
};

type FormFieldConfig = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  maxLength?: number;
  options?: string[] | Array<{ label: string; value: string }>;
};

type AutoQuestionsState = {
  enabled: boolean;
  customRuleEnabled: boolean;
  customRule: string;
};

type ToolConfigState = {
  requireApproval?: boolean;
  toolTimeout?: number;
} | null;

type ConfigState = {
  rolePrompt: string;
  formFields: any[];
  openingStatement: string;
  openingQuestions: string[];
  autoQuestions: AutoQuestionsState;
  quickCommands: QuickCommandState[];
  chatAvatar: string;
  chatAvatarEnabled: boolean;
  datasetIds: string[];
  mcpServerIds: string[];
  toolConfig: ToolConfigState;
  showContext: boolean;
  showReference: boolean;
  annotationConfig: AnnotationConfig | null;
  enableWebSearch: boolean;
  enableFileUpload: boolean;
  maxSteps: number;
  modelConfig: { id?: string };
  modelRouting: ModelRouting | null;
  memoryConfig: { maxUserMemories?: number; maxAgentMemories?: number } | null;
  voiceConfig: VoiceConfig | null;
  thirdPartyIntegration: ThirdPartyIntegrationConfig | null;
};

const getDefaultConfig = (): ConfigState => ({
  rolePrompt: "",
  formFields: [],
  openingStatement: "",
  openingQuestions: [],
  autoQuestions: {
    enabled: false,
    customRuleEnabled: false,
    customRule: "",
  },
  quickCommands: [],
  chatAvatar: "",
  chatAvatarEnabled: false,
  datasetIds: [],
  mcpServerIds: [],
  toolConfig: null,
  showContext: true,
  showReference: true,
  annotationConfig: null,
  enableWebSearch: false,
  enableFileUpload: false,
  maxSteps: 10,
  modelConfig: {},
  modelRouting: null,
  memoryConfig: null,
  voiceConfig: null,
  thirdPartyIntegration: null,
});

type FormVariableType = "text" | "paragraph" | "select" | "number";

type FormVariable = {
  id: string;
  type: FormVariableType;
  name: string;
  label: string;
  maxLength?: number;
  required: boolean;
  options?: Array<{ id: string; label: string }>;
};

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function toApiFormFields(input: any[]): FormFieldConfig[] {
  if (!Array.isArray(input) || input.length === 0) return [];

  return input
    .map((raw): FormFieldConfig | null => {
      const item = raw as Partial<FormVariable>;
      const name = String(item.name ?? "").trim();
      const label = String(item.label ?? "").trim();
      const type = item.type;
      if (!name || !label || !type) return null;

      if (type === "select") {
        const options = (item.options ?? ([] as Array<{ id: string; label: string }>))
          .map((x) => String(x.label ?? "").trim())
          .filter(Boolean)
          .map((v) => ({ label: v, value: v }));

        return {
          name,
          label,
          type: "select",
          required: !!item.required,
          options: options.length ? options : undefined,
        };
      }

      const mappedType: "text" | "textarea" = type === "paragraph" ? "textarea" : "text";
      const maxLength =
        mappedType === "text" || mappedType === "textarea"
          ? typeof item.maxLength === "number" && Number.isFinite(item.maxLength)
            ? item.maxLength
            : undefined
          : undefined;

      return {
        name,
        label,
        type: mappedType,
        required: !!item.required,
        maxLength,
      };
    })
    .filter((x): x is FormFieldConfig => Boolean(x));
}

function fromApiFormFields(input: unknown): FormVariable[] {
  if (!Array.isArray(input) || input.length === 0) return [];

  return (input as FormFieldConfig[])
    .map((f): FormVariable | null => {
      const name = String(f.name ?? "").trim();
      const label = String(f.label ?? "").trim();
      if (!name || !label) return null;

      if (f.type === "select") {
        const opts = Array.isArray(f.options)
          ? f.options.map((x: string | { label: string; value: string }) => {
              if (typeof x === "string") return x;
              return String(x.label ?? "").trim();
            })
          : [];

        return {
          id: createId(),
          type: "select",
          name,
          label,
          required: !!f.required,
          options: opts.filter(Boolean).map((t: string) => ({ id: createId(), label: t })),
        };
      }

      return {
        id: createId(),
        type: f.type === "textarea" ? "paragraph" : "text",
        name,
        label,
        required: !!f.required,
        maxLength: typeof f.maxLength === "number" ? f.maxLength : undefined,
      };
    })
    .filter((x): x is FormVariable => Boolean(x));
}

export default function Configuration() {
  const { t } = useI18n();
  const { id } = useParams();
  const agentId = id ?? "";
  const { data: agent, refetch: refetchAgentDetail } = useAgentDetailQuery(id, {
    refetchOnWindowFocus: false,
  });

  useDocumentHead({
    title: agent?.name || t("agent.detail.configuration.title"),
  });

  const [autoSave] = useState(true);
  const [config, setConfig] = useState<ConfigState>(() => getDefaultConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const hydratedRef = useRef(false);
  const skipNextAutoSaveRef = useRef(false);
  const saveConfigRef = useRef<(next: ConfigState) => Promise<void>>(null!);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState(false);

  const createMode = agent?.createMode ?? "direct";
  const isThirdPartyMode = createMode === "coze" || createMode === "dify";

  const createConfigFromAgent = useCallback(
    (currentAgent: NonNullable<typeof agent>): ConfigState => ({
      rolePrompt: currentAgent.rolePrompt ?? "",
      formFields: fromApiFormFields(currentAgent.formFields),
      openingStatement: currentAgent.openingStatement ?? "",
      openingQuestions: currentAgent.openingQuestions ?? [],
      autoQuestions: {
        enabled: currentAgent.autoQuestions?.enabled ?? false,
        customRuleEnabled: currentAgent.autoQuestions?.customRuleEnabled ?? false,
        customRule: currentAgent.autoQuestions?.customRule ?? "",
      },
      quickCommands: currentAgent.quickCommands ?? [],
      chatAvatar: currentAgent.chatAvatar ?? "",
      chatAvatarEnabled: currentAgent.chatAvatarEnabled ?? false,
      datasetIds: currentAgent.datasetIds ?? [],
      mcpServerIds: currentAgent.mcpServerIds ?? [],
      toolConfig: currentAgent.toolConfig ?? null,
      showContext: currentAgent.showContext ?? true,
      showReference: currentAgent.showReference ?? true,
      annotationConfig: currentAgent.annotationConfig ?? null,
      enableWebSearch: currentAgent.enableWebSearch ?? false,
      enableFileUpload: currentAgent.enableFileUpload ?? false,
      maxSteps: (currentAgent.maxSteps as number) ?? 10,
      modelConfig: { id: currentAgent.modelConfig?.id },
      modelRouting: (currentAgent.modelRouting as ModelRouting) ?? null,
      memoryConfig: currentAgent.memoryConfig ?? null,
      voiceConfig: (currentAgent.voiceConfig as VoiceConfig) ?? null,
      thirdPartyIntegration:
        (currentAgent.thirdPartyIntegration as ThirdPartyIntegrationConfig) ?? null,
    }),
    [],
  );

  const updateConfig = useCallback(<K extends keyof ConfigState>(key: K, value: ConfigState[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<ConfigState>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveConfig = useCallback(
    async (next: ConfigState) => {
      if (!agentId) return;
      setIsSaving(true);

      setSaveError(false);
      try {
        const payload: Record<string, unknown> = {
          rolePrompt: next.rolePrompt,
          formFields: toApiFormFields(next.formFields),
          openingStatement: next.openingStatement,
          openingQuestions: next.openingQuestions,
          autoQuestions: {
            enabled: next.autoQuestions.enabled,
            customRuleEnabled: next.autoQuestions.customRuleEnabled,
            customRule: next.autoQuestions.customRuleEnabled
              ? next.autoQuestions.customRule
              : undefined,
          },
          quickCommands: next.quickCommands.map((x) => ({
            avatar: x.avatar ?? "",
            name: x.name,
            content: x.content,
            replyType: x.replyType,
            replyContent: x.replyContent ?? "",
          })),
          chatAvatar: next.chatAvatar,
          datasetIds: next.datasetIds,
          mcpServerIds: next.mcpServerIds,
          toolConfig: next.toolConfig ?? undefined,
          showContext: next.showContext,
          showReference: next.showReference,
          annotationConfig: next.annotationConfig ?? undefined,
          enableWebSearch: next.enableWebSearch,
          enableFileUpload: next.enableFileUpload,
          chatAvatarEnabled: next.chatAvatarEnabled,
          maxSteps: next.maxSteps,
          modelConfig: next.modelConfig,
          modelRouting: next.modelRouting ?? undefined,
          memoryConfig: next.memoryConfig ?? undefined,
          voiceConfig: next.voiceConfig ?? undefined,
        };

        if (agent?.createMode === "coze" || agent?.createMode === "dify") {
          payload.thirdPartyIntegration = next.thirdPartyIntegration ?? undefined;
        }

        const savedAgent = await updateAgentConfig(agentId, payload as any);
        const extConfig = (savedAgent?.thirdPartyIntegration as any)?.extendedConfig;

        if (
          agent?.createMode === "coze" &&
          extConfig?.cozeSyncStatus === "failed" &&
          extConfig?.cozeSyncError
        ) {
          toast.error(`${extConfig.cozeSyncError}`);
        }
        if (
          agent?.createMode === "dify" &&
          extConfig?.difySyncStatus === "failed" &&
          extConfig?.difySyncError
        ) {
          toast.error(`${extConfig.difySyncError}`);
        }

        if (savedAgent?.createMode === "coze" || savedAgent?.createMode === "dify") {
          const refreshedAgentResult = await refetchAgentDetail();
          const latestAgent =
            !refreshedAgentResult.error && refreshedAgentResult.data
              ? refreshedAgentResult.data
              : savedAgent;

          if (latestAgent) {
            skipNextAutoSaveRef.current = true;
            setConfig(createConfigFromAgent(latestAgent));
          }
        } else {
          void refetchAgentDetail();
        }

        setLastSavedAt(new Date());
      } catch (error) {
        setSaveError(true);
        console.error("Failed to save agent config:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [agentId, agent?.createMode, createConfigFromAgent, refetchAgentDetail],
  );

  saveConfigRef.current = saveConfig;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formFieldsForDebug = useMemo(() => config.formFields, [config.formFields]);

  const { data: providers = [] } = useAiProvidersQuery({ supportedModelTypes: "llm" });
  const publishSquareMutation = usePublishAgentToSquareMutation(agentId);
  const unpublishSquareMutation = useUnpublishAgentFromSquareMutation(agentId);
  const chatModelThinkingSupported = useMemo(() => {
    const modelId = config.modelConfig?.id;
    if (modelId == null || modelId === "" || !providers.length) return false;
    const idStr = String(modelId);
    for (const p of providers) {
      const m = p.models?.find((x) => String(x.id) === idStr);
      if (m) return m.thinking ?? false;
    }
    return false;
  }, [providers, config.modelConfig?.id]);

  useEffect(() => {
    if (!agent || hydratedRef.current) return;
    setConfig(createConfigFromAgent(agent));
    hydratedRef.current = true;
  }, [agent, createConfigFromAgent]);

  useEffect(() => {
    if (!autoSave) return;
    if (!hydratedRef.current) return;
    if (!agentId) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      void saveConfigRef.current(config);
    }, 800);
    return () => window.clearTimeout(t);
  }, [agentId, autoSave, config]);

  const publishLoading = publishSquareMutation.isPending || unpublishSquareMutation.isPending;

  const handleConfirmSquarePublish = useCallback(
    async (publishToSquare: boolean, tagIds?: string[]) => {
      try {
        if (publishToSquare) {
          await publishSquareMutation.mutateAsync({ tagIds: tagIds ?? [] });
          toast.success(t("agent.detail.publishDialog.submitted"));
        } else {
          await unpublishSquareMutation.mutateAsync();
          toast.success(t("agent.detail.publishDialog.unpublished"));
        }
        setPublishDialogOpen(false);
      } catch (error) {
        console.log(
          `${t("agent.detail.publishDialog.operationFailed")}: ${(error as Error).message}`,
        );
      }
    },
    [publishSquareMutation, unpublishSquareMutation],
  );

  return (
    <div className="relative h-dvh w-dvw">
      <VoiceConfigDefaultsSync
        voiceConfig={config.voiceConfig}
        onSync={(v) => updateConfig("voiceConfig", v)}
      />
      <OrchestrationLayout>
        <Tabs defaultValue="function" className="flex h-full min-h-0 flex-col gap-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <h1 className="shrink-0 text-lg font-semibold">{t("agent.detail.orchestration")}</h1>
              <TabsList className="shrink-0">
                <TabsTrigger value="function">{t("agent.detail.functionConfig")}</TabsTrigger>
                <TabsTrigger value="interface">{t("agent.detail.interfaceConfig")}</TabsTrigger>
                {!isThirdPartyMode && (
                  <TabsTrigger value="model">{t("agent.detail.modelConfig")}</TabsTrigger>
                )}
              </TabsList>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  {isSaving && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("agent.detail.saving")}</span>
                    </>
                  )}

                  {!isSaving && saveError && (
                    <span className="text-red-500">{t("agent.detail.saveFailed")}</span>
                  )}

                  {!isSaving && !saveError && lastSavedAt && (
                    <span>{t("agent.detail.draftSavedAt", { time: formatTime(lastSavedAt) })}</span>
                  )}
                </div>
              </div>
              {agent?.squarePublishStatus === "pending" ? (
                <></>
              ) : (
                <Button
                  variant={agent?.squarePublishStatus === "rejected" ? "destructive" : "default"}
                  onClick={() => setPublishDialogOpen(true)}
                  disabled={!agentId}
                >
                  <span>
                    {agent?.squarePublishStatus === "rejected"
                      ? t("agent.detail.publishDialog.reviewFailed")
                      : t("agent.detail.publishDialog.publish")}
                  </span>
                  {agent?.squarePublishStatus === "rejected" ? <RefreshCcw /> : <ArrowBigUp />}
                </Button>
              )}
            </div>
          </div>

          <div className="grid h-full min-h-0 grid-cols-2 gap-4 pt-px pl-3">
            <div className="flex h-full min-h-0 flex-col pb-4">
              <TabsContent
                value="function"
                className="chat-scroll mt-0 flex h-full min-h-0 flex-col"
              >
                <TooltipProvider>
                  <div className="space-y-4">
                    {isThirdPartyMode ? (
                      <ThirdPartyIntegration
                        mode={createMode as "coze" | "dify"}
                        value={config.thirdPartyIntegration as any}
                        onChange={(v: any) => updateConfig("thirdPartyIntegration", v)}
                      />
                    ) : (
                      <>
                        <RolePrompt
                          value={config.rolePrompt}
                          formFields={config.formFields}
                          onChange={(v) => updateConfig("rolePrompt", v)}
                        />
                        <FormVariables
                          value={config.formFields}
                          onChange={(v) => updateConfig("formFields", v)}
                        />
                        <KnowledgeBase
                          value={config.datasetIds}
                          onChange={(v) => updateConfig("datasetIds", v)}
                        />
                        <ContextSettings
                          showContext={config.showContext}
                          showReference={config.showReference}
                          annotationConfig={config.annotationConfig}
                          enableFileUpload={config.enableFileUpload}
                          onChange={updateMultiple}
                        />
                        <McpTools
                          value={config.mcpServerIds}
                          onChange={(v) => updateConfig("mcpServerIds", v)}
                          toolConfig={config.toolConfig}
                          onToolConfigChange={(v) => updateConfig("toolConfig", v)}
                        />
                        <AgentFeatures maxSteps={config.maxSteps} onChange={updateMultiple} />
                      </>
                    )}
                  </div>
                </TooltipProvider>
              </TabsContent>

              <TabsContent
                value="interface"
                className="chat-scroll mt-0 flex h-full min-h-0 flex-col"
              >
                <EditorDndScope>
                  <div className="space-y-4">
                    {!isThirdPartyMode && (
                      <>
                        <WelcomeMessage
                          value={config.openingStatement}
                          onChange={(v) => updateConfig("openingStatement", v)}
                        />
                        <StarterQuestions
                          value={config.openingQuestions}
                          onChange={(v) => updateConfig("openingQuestions", v)}
                        />
                        <AutoFollowUp
                          value={config.autoQuestions}
                          onChange={(v) => updateConfig("autoQuestions", v)}
                          titleModelId={config.modelRouting?.titleModel?.modelId}
                          onTitleModelChange={(id) => {
                            const next: ModelRouting = { ...(config.modelRouting ?? {}) };
                            if (id) {
                              next.titleModel = { modelId: id };
                            } else {
                              delete next.titleModel;
                            }
                            updateConfig("modelRouting", next);
                          }}
                        />
                      </>
                    )}
                    <QuickCommands
                      value={config.quickCommands}
                      onChange={(v) => updateConfig("quickCommands", v)}
                    />
                    <ChatAvatar
                      value={config.chatAvatar}
                      enabled={config.chatAvatarEnabled}
                      onChange={(v) => updateConfig("chatAvatar", v)}
                      onEnabledChange={(enabled) => {
                        updateConfig("chatAvatarEnabled", enabled);
                        if (!enabled) updateConfig("chatAvatar", "");
                      }}
                    />
                  </div>
                </EditorDndScope>
              </TabsContent>

              {!isThirdPartyMode && (
                <TabsContent
                  value="model"
                  className="chat-scroll mt-0 flex h-full min-h-0 flex-col"
                >
                  <TooltipProvider>
                    <div className="space-y-6">
                      <ModelSelector
                        chatModelId={config.modelConfig.id}
                        modelRouting={config.modelRouting}
                        memoryConfig={config.memoryConfig}
                        onChatModelChange={(id) => updateConfig("modelConfig", { id })}
                        onModelRoutingChange={(routing) => updateConfig("modelRouting", routing)}
                        onMemoryConfigChange={(v) => updateConfig("memoryConfig", v)}
                      />
                      <VoiceConfigSelector
                        value={config.voiceConfig}
                        onChange={(v) => updateConfig("voiceConfig", v)}
                      />
                    </div>
                  </TooltipProvider>
                </TabsContent>
              )}
            </div>

            <div className="flex h-full min-h-0 flex-col">
              <DebuggingPreview
                key={config.modelConfig?.id ?? "no-model"}
                agentId={agentId}
                agentName={agent?.name}
                agentAvatar={agent?.avatar ?? undefined}
                formFields={formFieldsForDebug}
                voiceConfig={config.voiceConfig ?? null}
                showConversationContext={config.showContext}
                openingStatement={config.openingStatement}
                openingQuestions={config.openingQuestions}
                quickCommands={config.quickCommands.map((x) => ({
                  name: x.name,
                  content: x.content,
                }))}
                chatAvatarEnabled={config.chatAvatarEnabled}
                chatAvatar={config.chatAvatar || undefined}
                thinkingSupported={chatModelThinkingSupported}
                hiddenTools={config.enableFileUpload ? undefined : ["file"]}
              />
            </div>
          </div>
        </Tabs>
      </OrchestrationLayout>
      <PublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        defaultPublishedToSquare={agent?.publishedToSquare ?? false}
        defaultTagIds={(agent?.tags ?? []).map((t) => t.id)}
        squarePublishStatus={(agent?.squarePublishStatus as any) ?? "none"}
        squareRejectReason={agent?.squareRejectReason ?? null}
        loading={publishLoading}
        onConfirm={handleConfirmSquarePublish}
      />
    </div>
  );
}
