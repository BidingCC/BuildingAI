import { ModelTypeSelector } from "./model-type-selector";

export type RerankModelSelectorProps = {
  value?: string;
  onSelect: (modelId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function RerankModelSelector({
  value,
  onSelect,
  placeholder = "请选择模型",
  disabled,
  className,
}: RerankModelSelectorProps) {
  return (
    <ModelTypeSelector
      modelType="rerank"
      value={value}
      onSelect={onSelect}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
