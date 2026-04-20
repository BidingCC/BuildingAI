import {
    closeMcpClients,
    createClientsFromServerConfigs,
    getProvider,
    getReasoningOptions,
    type McpClient,
    type McpServerConfig,
    mergeMcpTools,
} from "@buildingai/ai-sdk";
import { withEstimatedUsage } from "@buildingai/ai-sdk/utils/text-with-usage";
import {
    extractTextFromParts,
    formatMessagesForTokenCount,
    normalizeChatUsage,
} from "@buildingai/ai-sdk/utils/token-usage";
import {
    createDatasetsSearchTool,
    createReadAttachedFileTool,
    createRequestExecutionPlanTool,
    getWeather,
} from "@buildingai/ai-toolkit/tools";
import {
    parseFile,
    processFiles as processFilesUtil,
    type ProcessFilesWriter,
    stripLocalhostFileParts,
} from "@buildingai/ai-toolkit/utils";
import { SecretService } from "@buildingai/core/modules";
import type { Agent, AiModel } from "@buildingai/db/entities";
import { In } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import type { ChatMessageUsage, ChatUIMessage } from "@buildingai/types";
import type { ModelReference } from "@buildingai/types/ai/agent-config.interface";
import { getProviderSecret } from "@buildingai/utils";
import { UserService } from "@modules/user/services/user.service";
import { Injectable, Logger } from "@nestjs/common";
import type { LanguageModel, Tool, UIMessage } from "ai";
import {
    convertToModelMessages,
    createUIMessageStream,
    generateId,
    pipeUIMessageStreamToResponse,
    stepCountIs,
    ToolLoopAgent,
} from "ai";
import type { ServerResponse } from "http";
import { validate as isUUID } from "uuid";

import { DatasetsRetrievalService } from "../../datasets/services/datasets-retrieval.service";
import { AiMcpServerService } from "../../mcp/services/ai-mcp-server.service";
import { MemoryService } from "../../memory/services/memory.service";
import { MemoryExtractionService } from "../../memory/services/memory-extraction.service";
import { AiModelService } from "../../model/services/ai-model.service";
import { AgentBillingHandler } from "../handlers/agent-billing";
import { AnnotationReplyHandler } from "../handlers/annotation-reply";
import { FollowUpSuggestionsHandler } from "../handlers/follow-up-suggestions";
import { GoalPlanner } from "../handlers/goal-planner";
import { PromptBuilder } from "../handlers/prompt-builder";
import { QuickCommandHandler, type QuickCommandStreamWriter } from "../handlers/quick-command";
import { ReflectionHandler } from "../handlers/reflection";
import { CozeChatProvider } from "../providers/coze-chat.provider";
import { DifyChatProvider } from "../providers/dify-chat.provider";
import { AgentChatMessageService } from "./agent-chat-message.service";
import { AgentChatRecordService } from "./agent-chat-record.service";
import { AgentsService } from "./agents.service";

type DataWriter = {
    write: (part: { type: `data-${string}` | string; data: unknown }) => void;
    merge: (stream: ReadableStream) => void;
};

type PartWithState = { type?: string; state?: string };

type PreHandleQuickCommandResult = {
    handled: boolean;
    conversationId?: string;
};

export interface AgentChatCompletionParams {
    agentId: string;
    userId: string;
    anonymousIdentifier?: string;
    conversationId?: string;
    saveConversation?: boolean;
    isDebug?: boolean;
    messages: UIMessage[];
    formVariables?: Record<string, string>;
    formFieldsInputs?: Record<string, unknown>;
    abortSignal?: AbortSignal;
    feature?: Record<string, boolean>;
    isRegenerate?: boolean;
    regenerateMessageId?: string;
    regenerateParentId?: string;
    parentId?: string;
    isToolApprovalFlow?: boolean;
}

interface ResolvedModel {
    languageModel: LanguageModel;
    dbModel: AiModel;
}

interface PlanningContext {
    writer: { write: (part: { type: `data-${string}`; data: unknown }) => void };
    lastUserMsg: string;
    userMemories: Array<{ content: string }>;
    agentMemories: Array<{ content: string }>;
    planModel: ResolvedModel;
    conversationId: string | undefined;
    userId: string;
    saveConversation: boolean;
    planningConsumedPowerRef: { current: number };
}

@Injectable()
export class AgentChatCompletionService {
    private readonly logger = new Logger(AgentChatCompletionService.name);

    constructor(
        private readonly agentsService: AgentsService,
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
        private readonly aiMcpServerService: AiMcpServerService,
        private readonly datasetsRetrievalService: DatasetsRetrievalService,
        private readonly agentChatRecordService: AgentChatRecordService,
        private readonly agentChatMessageService: AgentChatMessageService,
        private readonly memoryService: MemoryService,
        private readonly memoryExtractionService: MemoryExtractionService,
        private readonly promptBuilder: PromptBuilder,
        private readonly goalPlanner: GoalPlanner,
        private readonly reflectionHandler: ReflectionHandler,
        private readonly followUpSuggestionsHandler: FollowUpSuggestionsHandler,
        private readonly quickCommandHandler: QuickCommandHandler,
        private readonly annotationReplyHandler: AnnotationReplyHandler,
        private readonly agentBillingHandler: AgentBillingHandler,
        private readonly cozeChatProvider: CozeChatProvider,
        private readonly difyChatProvider: DifyChatProvider,
        private readonly userService: UserService,
    ) {}

    async streamChat(params: AgentChatCompletionParams, response: ServerResponse): Promise<void> {
        const saveConversation = params.saveConversation !== false;
        let conversationId = params.conversationId;
        if (saveConversation && conversationId && !isUUID(conversationId)) {
            conversationId = undefined;
        }
        const isNew = !conversationId;

        try {
            const agent = await this.agentsService.findOne({
                where: { id: params.agentId },
            });
            if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
            if (agent.createMode === "coze" || agent.createMode === "dify") {
                const quickCommandResult = await this.preHandleQuickCommandReply({
                    agent,
                    params,
                    response,
                    conversationId,
                    saveConversation,
                });
                if (quickCommandResult.handled) {
                    return;
                }
                conversationId = quickCommandResult.conversationId;
            }
            if (agent.createMode === "coze") {
                await this.cozeChatProvider.streamChat(
                    agent,
                    {
                        ...params,
                        ...(conversationId ? { conversationId } : {}),
                    },
                    response,
                );
                return;
            }
            if (agent.createMode === "dify") {
                await this.difyChatProvider.streamChat(
                    agent,
                    {
                        ...params,
                        ...(conversationId ? { conversationId } : {}),
                    },
                    response,
                );
                return;
            }

            const chatModel = await this.resolveModel(agent.modelConfig?.id);
            if (!chatModel) throw HttpErrorFactory.badRequest("智能体未配置模型");

            if (saveConversation && isNew) {
                const initialTitle = this.extractLastUserText(params.messages);
                const record = await this.agentChatRecordService.createConversation({
                    agentId: params.agentId,
                    userId: params.userId,
                    anonymousIdentifier: params.anonymousIdentifier,
                    title: initialTitle,
                    metadata: params.isDebug ? { isDebug: true } : undefined,
                });
                conversationId = record.id;
            }

            const stream = createUIMessageStream({
                ...(params.isToolApprovalFlow ? { originalMessages: params.messages } : {}),
                execute: async ({ writer }) => {
                    if (conversationId) {
                        writer.write({
                            type: "data-conversation-id",
                            data: conversationId,
                            transient: true,
                        } as any);
                    }

                    let messages = params.messages;
                    if (params.isToolApprovalFlow && saveConversation && conversationId) {
                        messages = await this.buildApprovalMessages(
                            conversationId,
                            params.messages[0],
                        );
                    }

                    const assistantMessageId = params.isToolApprovalFlow
                        ? (messages.findLast((message) => message.role === "assistant")?.id ??
                          generateId())
                        : generateId();
                    writer.write({
                        type: "start",
                        messageId: assistantMessageId,
                    });

                    if (params.abortSignal?.aborted) return;

                    const lastUserText = this.extractLastUserText(messages);
                    const customReply = this.quickCommandHandler.getCustomReply(
                        lastUserText,
                        agent.quickCommands,
                    );
                    if (customReply !== null) {
                        await this.quickCommandHandler.emitCustomReplyStream({
                            writer: writer as unknown as QuickCommandStreamWriter,
                            assistantMessageId,
                            messages,
                            customReply,
                            replySource: "quick-command",
                            conversationId: conversationId ?? undefined,
                            saveConversation,
                            params,
                            saveMessages: (ctx) =>
                                this.saveMessages({
                                    ...ctx,
                                    params: ctx.params as AgentChatCompletionParams,
                                    writer: ctx.writer as unknown as DataWriter,
                                }),
                            serializeContextForDisplay: (msgs) =>
                                this.serializeContextForDisplay(msgs),
                        });
                        return;
                    }

                    const annotationReply =
                        agent.annotationConfig?.enabled && lastUserText
                            ? await this.annotationReplyHandler.getAnnotationReply(
                                  params.agentId,
                                  lastUserText,
                                  agent.annotationConfig,
                              )
                            : null;
                    if (annotationReply !== null) {
                        await this.quickCommandHandler.emitCustomReplyStream({
                            writer: writer as unknown as QuickCommandStreamWriter,
                            assistantMessageId,
                            messages,
                            customReply: annotationReply,
                            replySource: "annotation",
                            conversationId: conversationId ?? undefined,
                            saveConversation,
                            params,
                            saveMessages: (ctx) =>
                                this.saveMessages({
                                    ...ctx,
                                    params: ctx.params as AgentChatCompletionParams,
                                    writer: ctx.writer as unknown as DataWriter,
                                }),
                            serializeContextForDisplay: (msgs) =>
                                this.serializeContextForDisplay(msgs),
                        });
                        return;
                    }

                    if (params.userId && chatModel?.dbModel?.membershipLevel?.length > 0) {
                        await this.validateUserMembershipForModel(
                            params.userId,
                            chatModel.dbModel.membershipLevel,
                        );
                    }

                    if (params.userId && chatModel?.dbModel?.billingRule) {
                        await this.agentBillingHandler.validateUserPower(
                            params.userId,
                            chatModel.dbModel.billingRule,
                        );
                    }

                    const memoryConfig = agent.memoryConfig;
                    const maxUserMem = memoryConfig?.maxUserMemories ?? 20;
                    const maxAgentMem = memoryConfig?.maxAgentMemories ?? 20;

                    const [userMemories, agentMemories] = agent.modelRouting?.memoryModel?.modelId
                        ? await Promise.all([
                              this.memoryService.getUserMemories(params.userId, maxUserMem),
                              this.memoryService.getAgentMemories(
                                  params.userId,
                                  params.agentId,
                                  maxAgentMem,
                              ),
                          ])
                        : [[], []];

                    let planModel: ResolvedModel | null = null;
                    if (agent.modelRouting?.planningModel?.modelId) {
                        planModel = await this.resolveRoutingModel(
                            agent.modelRouting.planningModel,
                            chatModel,
                        );
                    }
                    const planningConsumedPowerRef = { current: 0 };

                    let mcpClients: McpClient[] = [];

                    try {
                        const { messages: processed, documentContents } = await processFilesUtil(
                            messages,
                            writer as unknown as ProcessFilesWriter,
                            parseFile,
                        );

                        const hasToolSupport = Boolean(
                            chatModel.dbModel.features?.some((f) => f.includes("tool")),
                        );
                        const useToolForDocuments = hasToolSupport && documentContents.length > 0;

                        const systemPrompt = this.promptBuilder.buildSystemPrompt(
                            agent,
                            userMemories,
                            agentMemories,
                            {
                                formVariables: params.formVariables,
                                formFieldsInputs: params.formFieldsInputs,
                                documents: documentContents,
                                useToolForDocuments,
                                planningToolAvailable: !!planModel,
                            },
                        );

                        const truncated = this.truncateMessages(processed, agent);
                        const modelMsgs = (
                            await convertToModelMessages(stripLocalhostFileParts(truncated))
                        ).filter(
                            // Drop ghost assistant messages produced when data-only
                            // parts appear before a step-start boundary
                            (msg) =>
                                msg.role !== "assistant" ||
                                (Array.isArray(msg.content) && msg.content.length > 0),
                        );
                        const finalMessages = systemPrompt
                            ? [{ role: "system" as const, content: systemPrompt }, ...modelMsgs]
                            : modelMsgs;
                        const promptText = formatMessagesForTokenCount(finalMessages);

                        const mcpResult = await this.initMcpClients(agent.mcpServerIds);
                        mcpClients = mcpResult.clients;

                        const lastUserMsg = this.extractLastUserText(processed);
                        const planningContext: PlanningContext | undefined =
                            planModel && lastUserMsg
                                ? ({
                                      writer,
                                      lastUserMsg,
                                      userMemories,
                                      agentMemories,
                                      planModel,
                                      conversationId,
                                      userId: params.userId,
                                      saveConversation,
                                      planningConsumedPowerRef,
                                  } as PlanningContext)
                                : undefined;

                        const tools = this.buildTools(
                            agent,
                            mcpResult.tools as Record<string, Tool>,
                            useToolForDocuments ? documentContents : undefined,
                            planningContext,
                        );

                        const providerOptions = chatModel.dbModel.enableThinkingParam
                            ? getReasoningOptions(chatModel.dbModel.provider.provider, {
                                  thinking: params.feature?.thinking ?? false,
                              })
                            : {};

                        const maxSteps = agent.maxSteps ?? 10;
                        const agentInstance = new ToolLoopAgent({
                            model: chatModel.languageModel,
                            ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
                            ...(hasToolSupport && Object.keys(tools).length > 0 && { tools }),
                            stopWhen: stepCountIs(maxSteps),
                        });

                        const result = await agentInstance.stream({
                            messages: finalMessages,
                            abortSignal: params.abortSignal,
                        });
                        result.consumeStream();

                        const uiMessageStream = result.toUIMessageStream({
                            sendStart: false,
                            originalMessages: params.isToolApprovalFlow
                                ? messages
                                : params.messages,
                            onFinish: async ({
                                messages: finished,
                                responseMessage: responseMsg,
                                isAborted: aborted,
                            }) => {
                                try {
                                    const { textText, reasoningText, fullText } =
                                        extractTextFromParts(
                                            (responseMsg?.parts ?? []) as Array<{
                                                type?: unknown;
                                                text?: string;
                                            }>,
                                        );

                                    const rawUsage = await withEstimatedUsage(result, {
                                        model: chatModel.dbModel.model,
                                        inputText: promptText,
                                        outputTextPromise: Promise.resolve(fullText),
                                    }).usage;

                                    const baseUsage = normalizeChatUsage({
                                        rawUsage,
                                        model: chatModel.dbModel.model,
                                        textText,
                                        reasoningText,
                                    }) as ChatMessageUsage;

                                    let userConsumedPower = 0;
                                    const hasPendingApproval = this.hasPendingApproval(responseMsg);
                                    const previousApprovalUsage =
                                        params.isToolApprovalFlow && conversationId
                                            ? await this.getPendingApprovalUsage(conversationId)
                                            : undefined;
                                    const billingUsage = params.isToolApprovalFlow
                                        ? this.mergeUsage(previousApprovalUsage, baseUsage)
                                        : baseUsage;
                                    if (
                                        !hasPendingApproval &&
                                        saveConversation &&
                                        conversationId &&
                                        params.userId &&
                                        chatModel?.dbModel?.billingRule &&
                                        billingUsage
                                    ) {
                                        try {
                                            userConsumedPower =
                                                await this.agentBillingHandler.deduct({
                                                    userId: params.userId,
                                                    conversationId,
                                                    usage: billingUsage,
                                                    billingRule: chatModel.dbModel.billingRule,
                                                });
                                        } catch (err) {
                                            this.logger.warn(
                                                `Agent billing deduct failed (conversation already completed): ${this.errMsg(err)}`,
                                            );
                                        }
                                    }

                                    let extraTokens = 0;
                                    let extraPower = 0;
                                    if (
                                        saveConversation &&
                                        conversationId &&
                                        !params.isToolApprovalFlow
                                    ) {
                                        const post = await this.applyPostProcessingUsage({
                                            agent,
                                            chatModel,
                                            params,
                                            conversationId,
                                            saveConversation,
                                            finished,
                                        });
                                        extraTokens = post.extraTokens;
                                        extraPower = post.extraPower;
                                    }
                                    const totalUsage: ChatMessageUsage = {
                                        ...baseUsage,
                                        totalTokens: (baseUsage.totalTokens ?? 0) + extraTokens,
                                        ...(extraTokens > 0 && { extraTokens }),
                                    };
                                    userConsumedPower += extraPower;
                                    userConsumedPower += planningConsumedPowerRef.current;

                                    const needTitleModel =
                                        agent.modelRouting?.titleModel?.modelId &&
                                        !aborted &&
                                        fullText;
                                    if (
                                        needTitleModel &&
                                        saveConversation &&
                                        conversationId &&
                                        params.abortSignal?.aborted !== true
                                    ) {
                                        const lastUserText = this.extractLastUserText(
                                            params.messages,
                                        );
                                        if (lastUserText) {
                                            const titleModel = await this.resolveRoutingModel(
                                                agent.modelRouting!.titleModel,
                                                chatModel,
                                            );
                                            const suggestions =
                                                await this.followUpSuggestionsHandler.generateSuggestions(
                                                    lastUserText,
                                                    fullText,
                                                    titleModel.languageModel,
                                                    titleModel.dbModel.provider.provider,
                                                );
                                            if (params.userId && titleModel.dbModel.billingRule) {
                                                try {
                                                    const followUpPower =
                                                        await this.agentBillingHandler.deductForFollowUpSuggestions(
                                                            params.userId,
                                                            conversationId,
                                                            titleModel.dbModel.billingRule,
                                                        );
                                                    if (followUpPower > 0)
                                                        userConsumedPower += followUpPower;
                                                } catch (err) {
                                                    this.logger.warn(
                                                        `Agent follow-up suggestions billing failed: ${this.errMsg(err)}`,
                                                    );
                                                }
                                            }
                                            if (suggestions.length > 0) {
                                                writer.write({
                                                    type: "data-follow-up-suggestions",
                                                    data: suggestions,
                                                });
                                            }
                                        }
                                    }

                                    writer.write({
                                        type: "data-usage",
                                        data: { ...totalUsage, userConsumedPower },
                                    });

                                    writer.write({
                                        type: "data-conversation-context",
                                        data: {
                                            messageId: assistantMessageId,
                                            messages:
                                                this.serializeContextForDisplay(finalMessages),
                                        },
                                    });

                                    if (!conversationId) return;

                                    if (saveConversation && conversationId) {
                                        if (params.isToolApprovalFlow) {
                                            await this.saveApprovalMessages(
                                                finished,
                                                conversationId,
                                                totalUsage,
                                                userConsumedPower,
                                            );
                                        } else {
                                            await this.saveMessages({
                                                finished,
                                                responseMsg: responseMsg
                                                    ? { ...responseMsg, id: assistantMessageId }
                                                    : responseMsg,
                                                params,
                                                conversationId,
                                                usage: totalUsage,
                                                userConsumedPower,
                                                aborted,
                                                writer: writer as unknown as DataWriter,
                                            });
                                        }
                                    }

                                    if (agent.modelRouting?.reflectionModel?.modelId && fullText) {
                                        const lastQuery = this.extractLastUserText(params.messages);
                                        if (lastQuery) {
                                            const reflModel = await this.resolveRoutingModel(
                                                agent.modelRouting?.reflectionModel,
                                                chatModel,
                                            );
                                            this.reflectionHandler
                                                .reflect(
                                                    lastQuery,
                                                    fullText,
                                                    reflModel.languageModel,
                                                )
                                                .then((reflResult) => {
                                                    if (!reflResult.pass) {
                                                        this.logger.warn(
                                                            `Reflection flagged issues: ${reflResult.issues.join(", ")}`,
                                                        );
                                                    }
                                                })
                                                .catch(() => {});
                                        }
                                    }
                                } catch (error) {
                                    this.logger.error(
                                        `onFinish error: ${this.errMsg(error)}`,
                                        error instanceof Error ? error.stack : undefined,
                                    );
                                } finally {
                                    await closeMcpClients(mcpClients);
                                }
                            },
                            onError: (error) => {
                                const msg = this.errMsg(error);
                                this.logger.error(`Stream error: ${msg}`);
                                closeMcpClients(mcpClients).catch(() => {});
                                return msg;
                            },
                        });

                        writer.merge(uiMessageStream);
                    } catch (error) {
                        await closeMcpClients(mcpClients);
                        throw error;
                    }
                },
            });

            pipeUIMessageStreamToResponse({ stream, response });
        } catch (error) {
            this.logger.error(
                `Agent stream chat error: ${this.errMsg(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            this.handleError(error, response);
        }
    }

    private async resolveModel(modelId?: string): Promise<ResolvedModel | null> {
        if (!modelId) return null;

        const model = await this.aiModelService.findOne({
            where: { id: modelId, isActive: true },
            relations: ["provider"],
        });
        if (!model?.provider?.isActive) return null;

        const providerSecret = await this.secretService.getConfigKeyValuePairs(
            model.provider.bindSecretId,
        );
        const provider = getProvider(model.provider.provider, {
            apiKey: getProviderSecret("apiKey", providerSecret),
            baseURL: getProviderSecret("baseUrl", providerSecret) || undefined,
        });
        const languageModel = provider(model.model).model as LanguageModel;

        return { languageModel, dbModel: model };
    }

    private async resolveRoutingModel(
        ref: ModelReference | undefined,
        fallback: ResolvedModel,
    ): Promise<ResolvedModel> {
        if (!ref?.modelId) return fallback;

        const resolved = await this.resolveModel(ref.modelId);
        return resolved ?? fallback;
    }

    private truncateMessages(messages: UIMessage[], agent: Agent): UIMessage[] {
        const config = agent.contextConfig;
        if (!config) return messages;

        const maxMessages = config.maxContextMessages;
        if (!maxMessages || messages.length <= maxMessages) return messages;

        const lastUser = messages.findLastIndex((m) => m.role === "user");
        if (lastUser < 0) return messages.slice(-maxMessages);

        const keep = messages.slice(Math.max(0, messages.length - maxMessages));
        if (!keep.some((m) => m.role === "user")) {
            return [...messages.slice(lastUser, lastUser + 1), ...keep];
        }
        return keep;
    }

    private serializeContextForDisplay(
        messages: Array<{ role: string; content: unknown }>,
    ): Array<{ role: string; content: string }> {
        return messages.map((m) => {
            const raw =
                typeof m.content === "string"
                    ? m.content
                    : Array.isArray(m.content)
                      ? (m.content as Array<{ type?: string; text?: string }>)
                            .map((p) => (p?.type === "text" ? (p.text ?? "") : ""))
                            .join("\n")
                      : "";
            return { role: m.role, content: raw || "(无文本内容)" };
        });
    }

    private buildTools(
        agent: Agent,
        mcpTools: Record<string, Tool>,
        documentContents?: Array<{ filename: string; content: string }>,
        planningContext?: PlanningContext,
    ): Record<string, Tool> {
        const tools: Record<string, Tool> = { ...mcpTools };

        tools.getWeather = getWeather;

        if (documentContents?.length) {
            tools.read_attached_file = createReadAttachedFileTool({ documents: documentContents });
        }

        if (agent.datasetIds?.length) {
            tools.datasetsSearch = createDatasetsSearchTool({
                retrieve: async (query: string) => {
                    const results = await Promise.all(
                        agent.datasetIds!.map((id) =>
                            this.datasetsRetrievalService.retrieve(id, query).catch(() => ({
                                chunks: [],
                                totalTime: 0,
                            })),
                        ),
                    );
                    return {
                        chunks: results.flatMap((r) => r.chunks),
                        totalTime: Math.max(...results.map((r) => r.totalTime)),
                    };
                },
            });
        }

        if (planningContext) {
            const {
                writer,
                lastUserMsg,
                userMemories,
                agentMemories,
                planModel,
                conversationId,
                userId,
                saveConversation,
                planningConsumedPowerRef,
            } = planningContext;
            const memoryContext = [
                ...userMemories.map((m) => m.content),
                ...agentMemories.map((m) => m.content),
            ].join("\n");
            tools.request_execution_plan = createRequestExecutionPlanTool({
                userMessage: lastUserMsg,
                memoryContext,
                generatePlan: (userMessage, memContext) =>
                    this.goalPlanner.generateStructuredPlan(
                        userMessage,
                        memContext,
                        planModel.languageModel,
                    ),
                onStatus: (phase, planPreview) =>
                    writer.write({
                        type: "data-planning-status",
                        data: { phase, planPreview },
                    }),
                onBilling: async () => {
                    if (
                        saveConversation &&
                        conversationId &&
                        userId &&
                        planModel.dbModel.billingRule
                    ) {
                        try {
                            planningConsumedPowerRef.current =
                                await this.agentBillingHandler.deductForPlanning(
                                    userId,
                                    conversationId,
                                    planModel.dbModel.billingRule,
                                );
                        } catch (err) {
                            this.logger.warn(`Agent planning billing failed: ${this.errMsg(err)}`);
                        }
                    }
                },
            });
        }

        const requireApproval = agent.toolConfig?.requireApproval === true;
        const toolTimeoutMs = Math.max(0, Number(agent.toolConfig?.toolTimeout) || 0);

        if (!requireApproval) {
            return Object.fromEntries(
                Object.entries(tools).map(([name, t]) => [
                    name,
                    { ...t, needsApproval: false } as Tool,
                ]),
            );
        }

        const skipApproval = new Set([
            "getWeather",
            "read_attached_file",
            "request_execution_plan",
        ]);

        return Object.fromEntries(
            Object.entries(tools).map(([name, t]) => [
                name,
                this.wrapToolWithConfig(
                    t as Tool,
                    name,
                    requireApproval && !skipApproval.has(name),
                    toolTimeoutMs,
                ),
            ]),
        );
    }

    private wrapToolWithConfig(
        t: Tool,
        name: string,
        needsApproval: boolean,
        timeoutMs: number,
    ): Tool {
        const out = { ...t };
        if (needsApproval) (out as Tool).needsApproval = true;
        if (timeoutMs > 0 && typeof (out as Tool & { execute?: unknown }).execute === "function") {
            const exec = (out as Tool & { execute: (...args: unknown[]) => Promise<unknown> })
                .execute;
            (out as Tool & { execute: (...args: unknown[]) => Promise<unknown> }).execute = (
                ...args: unknown[]
            ) =>
                Promise.race([
                    exec(...args),
                    new Promise<never>((_, reject) =>
                        setTimeout(
                            () =>
                                reject(
                                    new Error(
                                        `Tool "${name}" execution timed out (${timeoutMs}ms)`,
                                    ),
                                ),
                            timeoutMs,
                        ),
                    ),
                ]);
        }
        return out as Tool;
    }

    private async initMcpClients(
        mcpServerIds?: string[],
    ): Promise<{ clients: McpClient[]; tools: Record<string, unknown> }> {
        if (!mcpServerIds?.length) return { clients: [], tools: {} };

        try {
            const mcpServers = await this.aiMcpServerService.findAll({
                where: { id: In(mcpServerIds), isDisabled: false },
            });

            const serverConfigs: McpServerConfig[] = mcpServers
                .filter((s) => s.url && s.communicationType)
                .map((s) => ({
                    id: s.id,
                    name: s.name,
                    description: s.description ?? undefined,
                    url: s.url,
                    communicationType: s.communicationType,
                    headers: s.headers ?? undefined,
                }));

            if (!serverConfigs.length) return { clients: [], tools: {} };

            const clients = await createClientsFromServerConfigs(serverConfigs);
            const tools = await mergeMcpTools(clients);
            return { clients, tools };
        } catch (error) {
            this.logger.warn(`MCP init failed: ${this.errMsg(error)}`);
            return { clients: [], tools: {} };
        }
    }

    private needsApproval(msg: UIMessage): boolean {
        return (
            msg.role === "assistant" &&
            !!msg.parts?.some((part) => (part as PartWithState).state === "approval-requested")
        );
    }

    private hasPendingApproval(msg?: UIMessage): boolean {
        return !!msg?.parts?.some((part) => (part as PartWithState).state === "approval-requested");
    }

    private async getPendingApprovalUsage(
        conversationId: string,
    ): Promise<ChatMessageUsage | undefined> {
        const dbMsgs = await this.agentChatMessageService.findAll({
            where: { conversationId },
            order: { createdAt: "DESC" },
        });
        const approvalMsg = dbMsgs.find((m) => this.needsApproval(m.message as UIMessage));
        return (approvalMsg?.message as ChatUIMessage | undefined)?.usage;
    }

    private async buildApprovalMessages(
        conversationId: string,
        approvalMsg: UIMessage,
    ): Promise<UIMessage[]> {
        const history = await this.agentChatMessageService.getConversationMessages(conversationId);

        return history.map((m) => {
            const msg = m.message;
            return this.needsApproval(msg as UIMessage) && approvalMsg?.role === "assistant"
                ? approvalMsg
                : (msg as UIMessage);
        });
    }

    private async saveApprovalMessages(
        finished: UIMessage[],
        conversationId: string,
        usage?: ChatMessageUsage,
        userConsumedPower?: number,
    ): Promise<void> {
        const dbMsgs = await this.agentChatMessageService.findAll({
            where: { conversationId },
            order: { createdAt: "DESC" },
        });

        const approvalMsg = dbMsgs.find((m) => this.needsApproval(m.message as UIMessage));
        const lastAssistant = finished.findLast((m) => m.role === "assistant");

        if (!approvalMsg || !lastAssistant) return;

        const cleanedParts = lastAssistant.parts?.filter((part) => !part.type?.startsWith("data-"));
        const previousMessage = approvalMsg.message as ChatUIMessage;
        const mergedUsage = this.mergeUsage(previousMessage.usage, usage);
        const mergedUserConsumedPower =
            previousMessage.userConsumedPower != null || userConsumedPower != null
                ? (previousMessage.userConsumedPower ?? 0) + (userConsumedPower ?? 0)
                : undefined;

        const messageToSave: ChatUIMessage = {
            ...lastAssistant,
            parts: cleanedParts,
            ...(mergedUsage && { usage: mergedUsage }),
            ...(mergedUserConsumedPower != null && { userConsumedPower: mergedUserConsumedPower }),
        } as ChatUIMessage;

        await this.agentChatMessageService.updateMessage(approvalMsg.id, {
            message: messageToSave,
        });
        await this.agentChatRecordService.updateStats(conversationId);
    }

    private mergeUsage(
        previous?: ChatMessageUsage,
        current?: ChatMessageUsage,
    ): ChatMessageUsage | undefined {
        if (!previous) return current;
        if (!current) return previous;

        return {
            ...previous,
            ...current,
            inputTokens: (previous.inputTokens ?? 0) + (current.inputTokens ?? 0),
            outputTokens: (previous.outputTokens ?? 0) + (current.outputTokens ?? 0),
            totalTokens: (previous.totalTokens ?? 0) + (current.totalTokens ?? 0),
            extraTokens: (previous.extraTokens ?? 0) + (current.extraTokens ?? 0),
            reasoningTokens: (previous.reasoningTokens ?? 0) + (current.reasoningTokens ?? 0),
            cachedInputTokens: (previous.cachedInputTokens ?? 0) + (current.cachedInputTokens ?? 0),
            inputTokenDetails: {
                noCacheTokens:
                    (previous.inputTokenDetails?.noCacheTokens ?? 0) +
                    (current.inputTokenDetails?.noCacheTokens ?? 0),
                cacheReadTokens:
                    (previous.inputTokenDetails?.cacheReadTokens ?? 0) +
                    (current.inputTokenDetails?.cacheReadTokens ?? 0),
                cacheWriteTokens:
                    (previous.inputTokenDetails?.cacheWriteTokens ?? 0) +
                    (current.inputTokenDetails?.cacheWriteTokens ?? 0),
            },
            outputTokenDetails: {
                textTokens:
                    (previous.outputTokenDetails?.textTokens ?? 0) +
                    (current.outputTokenDetails?.textTokens ?? 0),
                reasoningTokens:
                    (previous.outputTokenDetails?.reasoningTokens ?? 0) +
                    (current.outputTokenDetails?.reasoningTokens ?? 0),
            },
            raw: current.raw ?? previous.raw,
        };
    }

    private async saveMessages(ctx: {
        finished: UIMessage[];
        responseMsg: UIMessage | undefined;
        params: AgentChatCompletionParams;
        conversationId: string;
        usage: ChatMessageUsage | undefined;
        userConsumedPower?: number;
        aborted: boolean;
        writer: DataWriter;
    }): Promise<void> {
        const { finished, responseMsg, params, conversationId, usage, userConsumedPower, writer } =
            ctx;

        let userMsgId: string | undefined;
        if (params.isRegenerate) {
            userMsgId = params.regenerateParentId;
        } else {
            const lastUser =
                params.messages.findLast((m) => m.role === "user") ??
                finished.findLast((m) => m.role === "user");
            if (lastUser) {
                const saved = await this.agentChatMessageService.createMessage({
                    conversationId,
                    agentId: params.agentId,
                    userId: params.userId,
                    anonymousIdentifier: params.anonymousIdentifier,
                    message: lastUser as ChatUIMessage,
                    formVariables: params.formVariables,
                    formFieldsInputs: params.formFieldsInputs,
                    parentId: params.parentId,
                });
                userMsgId = saved.id;
                writer.write({ type: "data-user-message-id", data: saved.id });
            }
        }

        if (responseMsg?.parts?.length) {
            const fileParseParts = finished
                .findLast((m) => m.role === "user")
                ?.parts?.filter((part) => part.type?.startsWith("data-file-parse-"));

            const messageToSave: ChatUIMessage = {
                ...(fileParseParts?.length && responseMsg.parts
                    ? { ...responseMsg, parts: [...fileParseParts, ...responseMsg.parts] }
                    : responseMsg),
                usage,
                ...(userConsumedPower != null && { userConsumedPower }),
            } as ChatUIMessage;

            const saved = await this.agentChatMessageService.createMessage({
                conversationId,
                agentId: params.agentId,
                userId: params.userId,
                anonymousIdentifier: params.anonymousIdentifier,
                message: messageToSave,
                parentId: userMsgId,
            });
            writer.write({ type: "data-assistant-message-id", data: saved.id });
        }

        await this.agentChatRecordService.updateStats(conversationId);
    }

    private async preHandleQuickCommandReply(params: {
        agent: Agent;
        params: AgentChatCompletionParams;
        response: ServerResponse;
        conversationId?: string;
        saveConversation: boolean;
    }): Promise<PreHandleQuickCommandResult> {
        const { agent, params: chatParams, response, saveConversation } = params;
        let { conversationId } = params;
        let messages = chatParams.messages;

        if (chatParams.isToolApprovalFlow && saveConversation && conversationId) {
            messages = await this.buildApprovalMessages(conversationId, chatParams.messages[0]);
        }

        const lastUserText = this.extractLastUserText(messages);
        const customReply = this.quickCommandHandler.getCustomReply(
            lastUserText,
            agent.quickCommands,
        );
        if (customReply === null) {
            return {
                handled: false,
                conversationId,
            };
        }

        if (saveConversation && !conversationId) {
            const initialTitle = this.extractLastUserText(chatParams.messages);
            const record = await this.agentChatRecordService.createConversation({
                agentId: chatParams.agentId,
                userId: chatParams.userId,
                anonymousIdentifier: chatParams.anonymousIdentifier,
                title: initialTitle,
                metadata: chatParams.isDebug ? { isDebug: true } : undefined,
            });
            conversationId = record.id;
        }

        const stream = createUIMessageStream({
            ...(chatParams.isToolApprovalFlow ? { originalMessages: chatParams.messages } : {}),
            execute: async ({ writer }) => {
                if (conversationId) {
                    writer.write({
                        type: "data-conversation-id",
                        data: conversationId,
                        transient: true,
                    } as any);
                }
                const assistantMessageId = generateId();
                writer.write({
                    type: "start",
                    messageId: assistantMessageId,
                });

                if (chatParams.abortSignal?.aborted) {
                    return;
                }

                await this.quickCommandHandler.emitCustomReplyStream({
                    writer: writer as unknown as QuickCommandStreamWriter,
                    assistantMessageId,
                    messages,
                    customReply,
                    replySource: "quick-command",
                    conversationId: conversationId ?? undefined,
                    saveConversation,
                    params: chatParams,
                    saveMessages: (ctx) =>
                        this.saveMessages({
                            ...ctx,
                            params: ctx.params as AgentChatCompletionParams,
                            writer: ctx.writer as unknown as DataWriter,
                        }),
                    serializeContextForDisplay: (msgs) => this.serializeContextForDisplay(msgs),
                });
            },
            onError: (error) => this.errMsg(error),
        });

        pipeUIMessageStreamToResponse({ stream, response });

        return {
            handled: true,
            conversationId,
        };
    }

    private extractLastUserText(messages: UIMessage[]): string {
        const lastUser = messages.findLast((m) => m.role === "user");
        return lastUser ? extractTextFromParts(lastUser.parts ?? []).fullText : "";
    }

    private buildConversationText(messages: UIMessage[]): string {
        return messages
            .map((m) => `${m.role}: ${extractTextFromParts(m.parts ?? []).fullText}`)
            .join("\n");
    }

    private async applyPostProcessingUsage(params: {
        agent: Agent;
        chatModel: ResolvedModel;
        params: AgentChatCompletionParams;
        conversationId: string | undefined;
        saveConversation: boolean;
        finished: UIMessage[];
    }): Promise<{ extraTokens: number; extraPower: number }> {
        const { agent, chatModel, params: p, conversationId, saveConversation, finished } = params;
        let extraTokens = 0;
        let extraPower = 0;
        if (saveConversation && conversationId && agent.modelRouting?.memoryModel?.modelId) {
            const memModel = await this.resolveRoutingModel(
                agent.modelRouting.memoryModel,
                chatModel,
            );
            const conversationText = this.buildConversationText(finished);
            try {
                const { usageTokens } = await this.memoryExtractionService.extractAndSaveMemories({
                    userId: p.userId,
                    agentId: p.agentId,
                    conversationId,
                    conversationText,
                    model: memModel.languageModel,
                    memoryConfig: agent.memoryConfig,
                });
                if (usageTokens && usageTokens > 0) extraTokens += usageTokens;
                if (p.userId && memModel.dbModel.billingRule) {
                    try {
                        const power = await this.agentBillingHandler.deductForMemoryExtraction(
                            p.userId,
                            conversationId,
                            memModel.dbModel.billingRule,
                        );
                        if (power > 0) extraPower += power;
                    } catch (err) {
                        this.logger.warn(`Agent memory billing failed: ${this.errMsg(err)}`);
                    }
                }
            } catch (err) {
                this.logger.warn(`Agent memory extraction failed: ${this.errMsg(err)}`);
            }
        }
        return { extraTokens, extraPower };
    }

    private errMsg(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    private handleError(error: unknown, response: ServerResponse): void {
        if (response.headersSent) return;
        response.writeHead(500, { "Content-Type": "text/event-stream" });
        response.write(`data: ${JSON.stringify({ type: "error", error: this.errMsg(error) })}\n\n`);
        response.end();
    }

    /**
     * 校验用户会员等级是否有权限使用指定模型
     *
     * @param userId 用户ID
     * @param requiredMembershipLevels 模型要求的会员等级ID列表
     * @throws 如果用户会员等级不满足要求，抛出错误
     */
    private async validateUserMembershipForModel(
        userId: string,
        requiredMembershipLevels: string[],
    ): Promise<void> {
        const userMembership = await this.userService.getUserMembershipLevel(userId);

        // 如果用户没有会员等级，或者用户的会员等级不在允许列表中
        if (!userMembership || !requiredMembershipLevels.includes(userMembership.id)) {
            // 获取模型要求的会员等级名称
            const requiredLevelNames = await this.getMembershipLevelNames(requiredMembershipLevels);
            const requiredLevelsText = requiredLevelNames.join("、");

            const errorMessage = userMembership
                ? `该模型仅限${requiredLevelsText}会员使用，请升级会员后再试`
                : `该模型仅限${requiredLevelsText}会员使用，请开通会员后再试`;

            throw HttpErrorFactory.forbidden(errorMessage);
        }
    }

    /**
     * 根据会员等级ID列表获取会员等级名称列表
     *
     * @param levelIds 会员等级ID列表
     * @returns 会员等级名称列表
     */
    private async getMembershipLevelNames(levelIds: string[]): Promise<string[]> {
        const levels = await this.userService.getMembershipLevelsByIds(levelIds);
        return levels.map((level) => level.name);
    }
}
