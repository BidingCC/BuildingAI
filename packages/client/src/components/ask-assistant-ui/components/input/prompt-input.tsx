import { useMcpServerQuickMenuQuery, useMcpServersAllQuery } from "@buildingai/services/web";
import {
  PromptInput as AIPromptInput,
  PromptInputAttachment as AIPromptInputAttachment,
  PromptInputAttachments as AIPromptInputAttachments,
  PromptInputBody as AIPromptInputBody,
  PromptInputButton as AIPromptInputButton,
  PromptInputFooter as AIPromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider as AIPromptInputProvider,
  PromptInputSpeechButton as AIPromptInputSpeechButton,
  PromptInputSubmit as AIPromptInputSubmit,
  PromptInputTextarea as AIPromptInputTextarea,
  PromptInputTools as AIPromptInputTools,
} from "@buildingai/ui/components/ai-elements/prompt-input";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { IconBulb } from "@tabler/icons-react";
import {
  GlobeIcon,
  ImagesIcon,
  LayoutGridIcon,
  PaperclipIcon,
  Plus,
  Square,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode, RefObject } from "react";
import { memo, useCallback, useContext, useMemo, useState } from "react";

import { AssistantContext } from "../../context";
import { useFileUpload } from "../../hooks/use-file-upload";
import type { Model } from "../../types";
import { McpSelector } from "../mcp-selector";

export type PromptInputHiddenTool = "more" | "speech" | "quickMenu" | "mcp";

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

    const [selectedMenuItem, setSelectedMenuItem] = useState<SelectedMenuItem>(null);

    const { data: mcpServers = [], isLoading: isLoadingMcpServers } = useMcpServersAllQuery({
      enabled: true,
    });

    const { data: quickMenuMcpServer } = useMcpServerQuickMenuQuery({
      enabled: true,
    });

    const { handleFileSelect, uploadFilesIfNeeded, availableFileTypes, hasImageSupport } =
      useFileUpload(multiple, selectedModel?.features);

    const featureMenuItems: FeatureMenuItemConfig[] = useMemo(() => {
      const items: FeatureMenuItemConfig[] = [
        {
          id: "generateImage",
          icon: <ImagesIcon className="size-4 scale-110 transform" />,
          label: "创建图片",
          featureKey: "generateImage",
        },
        {
          id: "search",
          icon: <GlobeIcon className="size-4 scale-110 transform" />,
          label: "网页搜索",
          featureKey: "search",
        },
      ];

      console.log("featureMenuItems", selectedModel);
      if (selectedModel?.thinking) {
        items.unshift({
          id: "thinking",
          icon: <IconBulb className="size-4 scale-130 transform" />,
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
        <AIPromptInputAttachments>
          {(attachment) => <AIPromptInputAttachment data={attachment} />}
        </AIPromptInputAttachments>
        <AIPromptInputBody>
          <AIPromptInputTextarea ref={textareaRef} />
        </AIPromptInputBody>
        <AIPromptInputFooter>
          <AIPromptInputTools>
            {availableFileTypes.length > 0 && !hiddenSet.has("more") && (
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
                  <DropdownMenuItem onSelect={handleFileSelect}>
                    <PaperclipIcon className="size-4 scale-110 transform" />
                    {hasImageSupport ? "选择照片和文件" : "选择文件"}
                  </DropdownMenuItem>
                  {featureMenuItems.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onSelect={() => handleFeatureMenuItemClick(item)}
                    >
                      {item.icon}
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onSelect={handleExploreApps}>
                    <LayoutGridIcon className="size-4" />
                    全部应用
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
            {!hiddenSet.has("speech") && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <AIPromptInputSpeechButton textareaRef={textareaRef} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>听写</p>
                </TooltipContent>
              </Tooltip>
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
          {status === "submitted" || status === "streaming" ? (
            onStop ? (
              <StopButton onStop={onStop} />
            ) : (
              <AIPromptInputSubmit status={status} />
            )
          ) : (
            <AIPromptInputSubmit status={status} />
          )}
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
