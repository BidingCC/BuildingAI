import { ModelTypeSelector } from "./model-type-selector";

export type EmbeddingModelSelectorProps = {
  value?: string;
  onSelect: (modelId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function EmbeddingModelSelector({
  value,
  onSelect,
  placeholder = "请选择模型",
  disabled,
  className,
}: EmbeddingModelSelectorProps) {
  return (
    <ModelTypeSelector
      modelType="text-embedding"
      value={value}
      onSelect={onSelect}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
