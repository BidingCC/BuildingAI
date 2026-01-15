import { Button } from "@buildingai/ui/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@buildingai/ui/components/ui/button-group";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { memo } from "react";

export interface MessageBranchProps {
  branchNumber: number;
  branchCount: number;
  branches: string[];
  onSwitchBranch?: (messageId: string) => void;
}

export const MessageBranch = memo(function MessageBranch({
  branchNumber,
  branchCount,
  branches,
  onSwitchBranch,
}: MessageBranchProps) {
  if (branchCount <= 1) return null;

  const handlePrevious = () => {
    if (branchNumber > 1) {
      const prevId = branches[branchNumber - 2];
      if (prevId) onSwitchBranch?.(prevId);
    }
  };

  const handleNext = () => {
    if (branchNumber < branchCount) {
      const nextId = branches[branchNumber];
      if (nextId) onSwitchBranch?.(nextId);
    }
  };

  return (
    <ButtonGroup
      className="[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md"
      orientation="horizontal"
    >
      <Button
        aria-label="Previous branch"
        disabled={branchNumber <= 1}
        onClick={handlePrevious}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <ChevronLeftIcon size={14} />
      </Button>
      <ButtonGroupText className="text-muted-foreground border-none bg-transparent shadow-none">
        {branchNumber}/{branchCount}
      </ButtonGroupText>
      <Button
        aria-label="Next branch"
        disabled={branchNumber >= branchCount}
        onClick={handleNext}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <ChevronRightIcon size={14} />
      </Button>
    </ButtonGroup>
  );
});
