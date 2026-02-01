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
import type { FormEvent, RefObject } from "react";
import { memo, useCallback, useMemo, useState } from "react";

import { useAssistantContext } from "../../context";
import { useFileUpload } from "../../hooks/use-file-upload";
import { McpSelector } from "../mcp-selector";

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

const PromptInputInner = memo(
  ({ textareaRef, status, onStop, globalDrop, multiple, onSubmit }: PromptInputProps) => {
    const { models, selectedModelId, selectedMcpServerIds, onSelectMcpServers, onSetFeature } =
      useAssistantContext();
    const selectedModel = useMemo(
      () => models.find((m) => m.id === selectedModelId),
      [models, selectedModelId],
    );

    const [selectedMenuItem, setSelectedMenuItem] = useState<SelectedMenuItem>(null);

    const { data: mcpServers = [], isLoading: isLoadingMcpServers } = useMcpServersAllQuery({
      enabled: true,
    });

    const { data: quickMenuMcpServer } = useMcpServerQuickMenuQuery({
      enabled: true,
    });

    const { handleFileSelect, uploadFilesIfNeeded, availableFileTypes, hasImageSupport } =
      useFileUpload(multiple, selectedModel?.features);

    const featureMenuItems: FeatureMenuItemConfig[] = useMemo(
      () => [
        {
          id: "thinking",
          icon: <IconBulb className="size-4 scale-130 transform" />,
          label: "思考",
          featureKey: "thinking",
        },
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
      ],
      [],
    );

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
            {availableFileTypes.length > 0 && (
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
            {quickMenuMcpServer && (
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
            {!isLoadingMcpServers && (
              <McpSelector
                mcpServers={mcpServers}
                selectedMcpServerIds={selectedMcpServerIds}
                onSelectionChange={onSelectMcpServers}
              />
            )}
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

export const PromptInput = memo(
  ({ textareaRef, status = "ready", onSubmit, onStop, globalDrop, multiple }: PromptInputProps) => {
    return (
      <AIPromptInputProvider>
        <PromptInputInner
          textareaRef={textareaRef}
          status={status}
          onSubmit={onSubmit}
          onStop={onStop}
          globalDrop={globalDrop}
          multiple={multiple}
        />
      </AIPromptInputProvider>
    );
  },
);

PromptInput.displayName = "PromptInput";
