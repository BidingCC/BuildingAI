import { useMcpServerQuickMenuQuery, useMcpServersAllQuery } from "@buildingai/services/web";
import {
  PromptInputAttachment as AIPromptInputAttachment,
  PromptInputAttachments as AIPromptInputAttachments,
} from "@buildingai/ui/components/ai-elements/attachments";
import {
  PromptInput as AIPromptInput,
  PromptInputBody as AIPromptInputBody,
  PromptInputButton as AIPromptInputButton,
  PromptInputFooter as AIPromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider as AIPromptInputProvider,
  PromptInputSubmit as AIPromptInputSubmit,
  PromptInputTextarea as AIPromptInputTextarea,
  PromptInputTools as AIPromptInputTools,
  usePromptInputController,
} from "@buildingai/ui/components/ai-elements/prompt-input";
import SvgIcons from "@buildingai/ui/components/svg-icons";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import {
  GlobeIcon,
  //   ImagesIcon,
  LayoutGridIcon,
  PaperclipIcon,
  Plus,
  Square,
  X,
} from "lucide-react";
import type { ClipboardEvent, FormEvent, ReactNode, RefObject } from "react";
import { memo, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AssistantContext } from "../../context";
import { useFileUpload } from "../../hooks/use-file-upload";
import type { Model } from "../../types";
import { McpSelector } from "../mcp-selector";
import { VoiceInput } from "./voice-input";

export type PromptInputHiddenTool =
  | "more"
  | "speech"
  | "quickMenu"
  | "mcp"
  | "file"
  | "thinking"
  | "generateImage"
  | "search"
  | "exploreApps";

export interface PromptInputProps {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  status?: "submitted" | "streaming" | "ready" | "error";
  onSubmit?: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  onStop?: () => void;
  globalDrop?: boolean;
  multiple?: boolean;
  models?: Model[];
  selectedModelId?: string;
  selectedMcpServerIds?: string[];
  onSelectMcpServers?: (ids: string[]) => void;
  onSetFeature?: (key: string, value: boolean) => void;
  hiddenTools?: PromptInputHiddenTool[];
  children?: ReactNode;
}

const StopButton = memo(({ onStop }: { onStop: () => void }) => {
  return (
    <Button
      className="bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground size-8 rounded-full p-1 transition-colors duration-200"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        onStop();
      }}
    >
      <Square size={14} />
    </Button>
  );
});

StopButton.displayName = "StopButton";

const PromptInputAttachmentsList = memo(() => (
  <AIPromptInputAttachments>
    {(attachment) => <AIPromptInputAttachment data={attachment} />}
  </AIPromptInputAttachments>
));

PromptInputAttachmentsList.displayName = "PromptInputAttachmentsList";

const VoiceInputWithTranscript = memo(function VoiceInputWithTranscript({
  textareaRef,
  onAudioRecorded,
  onRecordingChange,
}: {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onAudioRecorded: (blob: Blob) => Promise<string | void>;
  onRecordingChange: (recording: boolean) => void;
}) {
  const controller = usePromptInputController();
  return (
    <VoiceInput
      textareaRef={textareaRef}
      onAudioRecorded={onAudioRecorded}
      onRecordingChange={onRecordingChange}
      onTranscriptReceived={(text) => {
        const cur = controller.textInput.value;
        controller.textInput.setInput(cur ? `${cur} ${text}` : text);
      }}
    />
  );
});

VoiceInputWithTranscript.displayName = "VoiceInputWithTranscript";

type FeatureKey = "thinking" | "generateImage" | "search";
type SelectedMenuItem = FeatureKey | null;

interface FeatureMenuItemConfig {
  id: FeatureKey;
  icon: React.ReactNode;
  label: string;
  featureKey: FeatureKey;
}

const defaultNoop = () => {};

const PromptInputInner = memo(
  ({
    textareaRef,
    status,
    onStop,
    globalDrop,
    multiple,
    onSubmit,
    models: modelsProp,
    selectedModelId: selectedModelIdProp,
    selectedMcpServerIds: selectedMcpServerIdsProp,
    onSelectMcpServers: onSelectMcpServersProp,
    onSetFeature: onSetFeatureProp,
    hiddenTools = [],
    children,
  }: PromptInputProps) => {
    const context = useContext(AssistantContext);
    const models = modelsProp ?? context?.models ?? [];
    const selectedModelId = selectedModelIdProp ?? context?.selectedModelId ?? "";
    const selectedMcpServerIds = selectedMcpServerIdsProp ?? context?.selectedMcpServerIds ?? [];
    const onSelectMcpServers = onSelectMcpServersProp ?? context?.onSelectMcpServers ?? defaultNoop;
    const onSetFeature = onSetFeatureProp ?? context?.onSetFeature ?? defaultNoop;

    const selectedModel = useMemo(
      () => models.find((m) => m.id === selectedModelId),
      [models, selectedModelId],
    );

    const hiddenSet = useMemo(() => new Set<PromptInputHiddenTool>(hiddenTools), [hiddenTools]);
    const shouldLoadMcpServers = !hiddenSet.has("mcp");
    const shouldLoadQuickMenu = !hiddenSet.has("quickMenu");

    const [selectedMenuItem, setSelectedMenuItem] = useState<SelectedMenuItem>(null);
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);

    useEffect(() => {
      setSelectedMenuItem(null);
    }, [selectedModelId]);

    const { data: mcpServers = [], isLoading: isLoadingMcpServers } = useMcpServersAllQuery(
      {
        isDisabled: false,
      },
      {
        enabled: shouldLoadMcpServers,
      },
    );

    const { data: quickMenuMcpServer } = useMcpServerQuickMenuQuery({
      enabled: shouldLoadQuickMenu,
    });

    useEffect(() => {
      if (!shouldLoadMcpServers) return;
      if (isLoadingMcpServers) return;
      if (selectedMcpServerIds.length === 0) return;

      const availableIdSet = new Set(mcpServers.map((s) => s.id));
      /**
       * Keep ids that exist in the MCP list, and also preserve QuickMenu MCP id.
       * QuickMenu server can be a virtual/ephemeral entry and may not appear in `useMcpServersAllQuery`.
       */
      const nextSelectedIds = selectedMcpServerIds.filter((id) => {
        if (availableIdSet.has(id)) return true;
        return id === quickMenuMcpServer?.id;
      });

      if (nextSelectedIds.length === selectedMcpServerIds.length) return;
      onSelectMcpServers(nextSelectedIds);
    }, [
      shouldLoadMcpServers,
      isLoadingMcpServers,
      mcpServers,
      quickMenuMcpServer?.id,
      selectedMcpServerIds,
      onSelectMcpServers,
    ]);

    const {
      handleFileSelect,
      uploadFilesIfNeeded,
      validateFiles,
      availableFileTypes,
      hasImageSupport,
    } = useFileUpload(multiple, selectedModel?.features, context?.supportedUploadTypes);

    const controller = usePromptInputController();

    /**
     * Handle paste event with file type validation
     */
    const handlePaste = useCallback(
      (event: ClipboardEvent<HTMLTextAreaElement>) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        const files: File[] = [];
        for (const item of items) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) {
              files.push(file);
            }
          }
        }

        if (files.length === 0) return;

        // Validate files against current model's supported types
        const { validFiles, invalidFiles, unsupportedTypeLabels } = validateFiles(files);

        if (invalidFiles.length > 0) {
          const typeText = unsupportedTypeLabels.join("、");
          toast.error(`当前模型不支持${typeText}类型`);
        }

        // Always prevent default to take full control of file handling
        event.preventDefault();

        // Add only valid files using the controller's attachments context
        if (validFiles.length > 0) {
          controller.attachments.add(validFiles);
        }
      },
      [validateFiles, controller.attachments],
    );

    const featureMenuItems: FeatureMenuItemConfig[] = useMemo(() => {
      const items: FeatureMenuItemConfig[] = [
        // {
        //   id: "generateImage",
        //   icon: <ImagesIcon className="size-4 scale-110 transform" />,
        //   label: "创建图片",
        //   featureKey: "generateImage",
        // },
        // {
        //   id: "search",
        //   icon: <GlobeIcon className="size-4 scale-110 transform" />,
        //   label: "网页搜索",
        //   featureKey: "search",
        // },
      ];

      if (selectedModel?.thinking) {
        items.unshift({
          id: "thinking",
          icon: <SvgIcons.bulb className="size-4 scale-130 transform" />,
          label: "思考",
          featureKey: "thinking",
        });
      }

      return items;
    }, [selectedModel?.thinking]);

    const handleFeatureMenuItemClick = useCallback(
      (item: FeatureMenuItemConfig) => {
        setSelectedMenuItem((prev) => {
          const isSelected = prev === item.id;
          const newValue = isSelected ? null : item.id;
          onSetFeature(item.featureKey, !isSelected);
          return newValue;
        });
      },
      [onSetFeature],
    );

    const handleExploreApps = useCallback(() => {
      // TODO: 跳转到全部应用页面
      window.open("/apps", "_blank");
    }, []);

    const selectedMenuItemConfig = useMemo(
      () => featureMenuItems.find((item) => item.id === selectedMenuItem),
      [featureMenuItems, selectedMenuItem],
    );

    const handleQuickMenuClick = useCallback(() => {
      if (quickMenuMcpServer?.id) {
        const isSelected = selectedMcpServerIds.includes(quickMenuMcpServer.id);
        if (isSelected) {
          onSelectMcpServers(selectedMcpServerIds.filter((id) => id !== quickMenuMcpServer.id));
        } else {
          onSelectMcpServers([...selectedMcpServerIds, quickMenuMcpServer.id]);
        }
      }
    }, [quickMenuMcpServer, selectedMcpServerIds, onSelectMcpServers]);

    const handleRemoveSelectedMenuItem = useCallback(() => {
      const currentItem = featureMenuItems.find((item) => item.id === selectedMenuItem);
      if (currentItem) {
        onSetFeature(currentItem.featureKey, false);
      }
      setSelectedMenuItem(null);
    }, [featureMenuItems, selectedMenuItem, onSetFeature]);

    const handleSubmit = useCallback(
      async (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
        if (message.files?.length) {
          message.files = await uploadFilesIfNeeded(message.files);
        }
        onSubmit?.(message, event);
      },
      [onSubmit, uploadFilesIfNeeded],
    );

    return (
      <AIPromptInput globalDrop={globalDrop} multiple={multiple} onSubmit={handleSubmit}>
        <PromptInputAttachmentsList />
        <AIPromptInputBody>
          <AIPromptInputTextarea ref={textareaRef} onPaste={handlePaste} />
        </AIPromptInputBody>
        <AIPromptInputFooter className="h-13 py-0">
          <AIPromptInputTools>
            {(() => {
              const showFile =
                availableFileTypes.length > 0 && !hiddenSet.has("file") && !hiddenSet.has("more");
              const showFeatureItems = featureMenuItems.filter(
                (item) =>
                  !hiddenSet.has(item.id as PromptInputHiddenTool) && !hiddenSet.has("more"),
              );
              const showExploreApps = !hiddenSet.has("exploreApps") && !hiddenSet.has("more");
              const hasMoreItems = showFile || showFeatureItems.length > 0 || showExploreApps;
              return (
                hasMoreItems && (
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <AIPromptInputButton>
                            <Plus size={16} />
                          </AIPromptInputButton>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>更多操作</p>
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent className="w-38">
                      {showFile && (
                        <DropdownMenuItem onSelect={handleFileSelect}>
                          <PaperclipIcon className="size-4 scale-110 transform" />
                          {hasImageSupport ? "选择照片和文件" : "选择文件"}
                        </DropdownMenuItem>
                      )}
                      {showFeatureItems.map((item) => (
                        <DropdownMenuItem
                          key={item.id}
                          onSelect={() => handleFeatureMenuItemClick(item)}
                        >
                          {item.icon}
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                      {showExploreApps && (
                        <DropdownMenuItem onSelect={handleExploreApps}>
                          <LayoutGridIcon className="size-4" />
                          全部应用
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              );
            })()}
            {selectedMenuItemConfig && (
              <AIPromptInputButton
                onClick={handleRemoveSelectedMenuItem}
                className="bg-accent text-accent-foreground"
              >
                {selectedMenuItemConfig.icon}
                <span>{selectedMenuItemConfig.label}</span>
                <X size={14} className="ml-1" />
              </AIPromptInputButton>
            )}
            {quickMenuMcpServer && !hiddenSet.has("quickMenu") && (
              <AIPromptInputButton
                onClick={handleQuickMenuClick}
                className={
                  selectedMcpServerIds.includes(quickMenuMcpServer.id)
                    ? "bg-accent text-accent-foreground"
                    : undefined
                }
              >
                <GlobeIcon size={16} />
                <span>{quickMenuMcpServer.name || "Search"}</span>
              </AIPromptInputButton>
            )}
            {!hiddenSet.has("mcp") && !isLoadingMcpServers && (
              <McpSelector
                mcpServers={mcpServers}
                selectedMcpServerIds={selectedMcpServerIds}
                onSelectionChange={onSelectMcpServers}
              />
            )}
            {children}
          </AIPromptInputTools>
          <div className="flex min-w-0 items-center">
            {context?.onVoiceAudio && !hiddenSet.has("speech") ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex min-w-0 flex-1 items-center">
                    <VoiceInputWithTranscript
                      textareaRef={textareaRef}
                      onAudioRecorded={context.onVoiceAudio}
                      onRecordingChange={setIsVoiceRecording}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>语音输入</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
            <div
              className={cn(
                "ml-2 flex shrink-0 items-center overflow-hidden transition-all duration-300 ease-out",
                isVoiceRecording && "ml-0 w-0 opacity-0",
              )}
            >
              {status === "submitted" || status === "streaming" ? (
                onStop ? (
                  <StopButton onStop={onStop} />
                ) : (
                  <AIPromptInputSubmit className="rounded-full" status={status} />
                )
              ) : (
                <AIPromptInputSubmit className="rounded-full" status={status} />
              )}
            </div>
          </div>
        </AIPromptInputFooter>
      </AIPromptInput>
    );
  },
);

PromptInputInner.displayName = "PromptInputInner";

export const PromptInput = memo((props: PromptInputProps) => {
  const {
    textareaRef,
    status = "ready",
    onSubmit,
    onStop,
    globalDrop,
    multiple,
    models,
    selectedModelId,
    selectedMcpServerIds,
    onSelectMcpServers,
    onSetFeature,
    hiddenTools,
    children,
  } = props;

  return (
    <AIPromptInputProvider>
      <PromptInputInner
        textareaRef={textareaRef}
        status={status}
        onSubmit={onSubmit}
        onStop={onStop}
        globalDrop={globalDrop}
        multiple={multiple}
        models={models}
        selectedModelId={selectedModelId}
        selectedMcpServerIds={selectedMcpServerIds}
        onSelectMcpServers={onSelectMcpServers}
        onSetFeature={onSetFeature}
        hiddenTools={hiddenTools}
      >
        {children}
      </PromptInputInner>
    </AIPromptInputProvider>
  );
});

PromptInput.displayName = "PromptInput";
