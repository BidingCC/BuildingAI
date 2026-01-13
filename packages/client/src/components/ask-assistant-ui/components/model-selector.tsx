import {
  ModelSelector as AIModelSelector,
  ModelSelectorContent as AIModelSelectorContent,
  ModelSelectorEmpty as AIModelSelectorEmpty,
  ModelSelectorGroup as AIModelSelectorGroup,
  ModelSelectorInput as AIModelSelectorInput,
  ModelSelectorItem as AIModelSelectorItem,
  ModelSelectorList as AIModelSelectorList,
  ModelSelectorLogo as AIModelSelectorLogo,
  ModelSelectorLogoGroup as AIModelSelectorLogoGroup,
  ModelSelectorName as AIModelSelectorName,
  ModelSelectorTrigger as AIModelSelectorTrigger,
} from "@buildingai/ui/components/ai-elements/model-selector";
import { PromptInputButton as AIPromptInputButton } from "@buildingai/ui/components/ai-elements/prompt-input";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

export interface ModelData {
  id: string;
  name: string;
  chef: string;
  chefSlug: string;
  providers: string[];
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
            <AIModelSelectorLogo className="size-5" provider={selectedModel.chefSlug} />
          )}
          {selectedModel?.name && <AIModelSelectorName>{selectedModel.name}</AIModelSelectorName>}
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
                    <AIModelSelectorLogo provider={m.chefSlug} />
                    <AIModelSelectorName>{m.name}</AIModelSelectorName>
                    <AIModelSelectorLogoGroup>
                      {m.providers.map((provider) => (
                        <AIModelSelectorLogo key={provider} provider={provider} />
                      ))}
                    </AIModelSelectorLogoGroup>
                    {selectedModelId === m.id ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </AIModelSelectorItem>
                ))}
            </AIModelSelectorGroup>
          ))}
        </AIModelSelectorList>
      </AIModelSelectorContent>
    </AIModelSelector>
  );
};
