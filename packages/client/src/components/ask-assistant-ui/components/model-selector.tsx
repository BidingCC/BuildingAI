import {
  ModelSelector as AIModelSelector,
  ModelSelectorContent as AIModelSelectorContent,
  ModelSelectorEmpty as AIModelSelectorEmpty,
  ModelSelectorGroup as AIModelSelectorGroup,
  ModelSelectorInput as AIModelSelectorInput,
  ModelSelectorItem as AIModelSelectorItem,
  ModelSelectorList as AIModelSelectorList,
  ModelSelectorName as AIModelSelectorName,
  ModelSelectorTrigger as AIModelSelectorTrigger,
} from "@buildingai/ui/components/ai-elements/model-selector";
import { PromptInputButton as AIPromptInputButton } from "@buildingai/ui/components/ai-elements/prompt-input";
import { Badge } from "@buildingai/ui/components/ui/badge";
import {
  AudioLinesIcon,
  CheckIcon,
  ChevronDownIcon,
  FileIcon,
  ImageIcon,
  VideoIcon,
} from "lucide-react";

import { ProviderIcon } from "../../provider-icons";

export interface ModelData {
  id: string;
  name: string;
  chef: string;
  chefSlug: string;
  providers: string[];
  features?: string[];
  billingRule?: {
    power: number;
    tokens: number;
  };
}

export interface ModelSelectorProps {
  models: ModelData[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ModelSelector = ({
  models,
  selectedModelId,
  onModelChange,
  open,
  onOpenChange,
}: ModelSelectorProps) => {
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const chefs = Array.from(new Set(models.map((m) => m.chef)));

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    onOpenChange?.(false);
  };

  return (
    <AIModelSelector open={open} onOpenChange={onOpenChange}>
      <AIModelSelectorTrigger asChild>
        <AIPromptInputButton>
          {selectedModel?.chefSlug && (
            <ProviderIcon className="size-5" provider={selectedModel.chefSlug} />
          )}
          {selectedModel?.name && (
            <AIModelSelectorName>
              {selectedModel.name}
              <Badge variant="secondary" className="text-muted-foreground ml-1.5 text-xs">
                {selectedModel.billingRule?.power
                  ? `${selectedModel.billingRule.power} 积分`
                  : "免费"}
              </Badge>
            </AIModelSelectorName>
          )}
          <ChevronDownIcon className="text-muted-foreground size-4" />
        </AIPromptInputButton>
      </AIModelSelectorTrigger>
      <AIModelSelectorContent>
        <AIModelSelectorInput placeholder="Search models..." />
        <AIModelSelectorList>
          <AIModelSelectorEmpty>No models found.</AIModelSelectorEmpty>
          {chefs.map((chef) => (
            <AIModelSelectorGroup heading={chef} key={chef}>
              {models
                .filter((m) => m.chef === chef)
                .map((m) => (
                  <AIModelSelectorItem
                    key={m.id}
                    onSelect={() => handleModelSelect(m.id)}
                    value={m.id}
                  >
                    <ProviderIcon provider={m.chefSlug} />
                    <AIModelSelectorName>
                      {m.name}
                      <Badge variant="secondary" className="text-muted-foreground ml-1.5 text-xs">
                        {m.billingRule?.power ? `${m.billingRule.power} 积分` : "免费"}
                      </Badge>
                    </AIModelSelectorName>
                    {/* <AIModelSelectorLogoGroup>
                      {m.providers.map((provider) => (
                        <AIModelSelectorLogo key={provider} provider={provider} />
                      ))}
                    </AIModelSelectorLogoGroup> */}
                    <div className="ml-auto flex items-center gap-1.5">
                      {m.features?.includes("vision") && (
                        <ImageIcon
                          aria-label="支持多模态（图像）"
                          className="text-muted-foreground size-3.5"
                        />
                      )}
                      {m.features?.includes("video") && (
                        <VideoIcon
                          aria-label="支持视频输入"
                          className="text-muted-foreground size-4"
                        />
                      )}
                      {m.features?.includes("audio") && (
                        <AudioLinesIcon
                          aria-label="支持音频输入/输出"
                          className="text-muted-foreground size-3.5"
                        />
                      )}
                      <FileIcon
                        aria-label="支持文件处理"
                        className="text-muted-foreground size-3.5"
                      />
                      {selectedModelId === m.id ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <div className="size-4" />
                      )}
                    </div>
                  </AIModelSelectorItem>
                ))}
            </AIModelSelectorGroup>
          ))}
        </AIModelSelectorList>
      </AIModelSelectorContent>
    </AIModelSelector>
  );
};
