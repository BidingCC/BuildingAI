import { Button } from "@buildingai/ui/components/ui/button";
import { memo } from "react";

export interface SuggestionData {
  id: string;
  text: string;
}

export interface SuggestionsProps {
  suggestions?: SuggestionData[];
  onSuggestionClick?: (suggestion: SuggestionData) => void;
}

export const Suggestions = memo(
  ({ suggestions = [], onSuggestionClick }: SuggestionsProps) => {
    if (suggestions.length === 0) {
      return null;
    }

    return (
      <div className="mx-auto w-full max-w-3xl py-4 pr-4">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.id}
              className="border-border bg-background text-foreground hover:bg-accent rounded-lg border px-4 py-2 text-sm transition-colors"
              onClick={() => onSuggestionClick?.(suggestion)}
              type="button"
            >
              {suggestion.text}
            </Button>
          ))}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    const prevSuggestions = prevProps.suggestions ?? [];
    const nextSuggestions = nextProps.suggestions ?? [];

    if (prevSuggestions.length !== nextSuggestions.length) {
      return false;
    }
    return prevSuggestions.every(
      (suggestion, index) => suggestion.id === nextSuggestions[index]?.id,
    );
  },
);
