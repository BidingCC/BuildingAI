import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@buildingai/ui/components/ai-elements/tool";
import { memo } from "react";

interface ToolPartData {
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: { id?: string; approved?: boolean };
}

export interface GenericToolProps {
  toolName: string;
  toolPart: ToolPartData;
}

export const GenericTool = memo(function GenericTool({ toolName, toolPart }: GenericToolProps) {
  return (
    <Tool>
      <ToolHeader
        state={toolPart.state as "input-available"}
        title={toolName}
        type="tool-invocation"
      />
      <ToolContent>
        <ToolInput input={toolPart.input} />
        <ToolOutput errorText={toolPart.errorText} output={toolPart.output} />
      </ToolContent>
    </Tool>
  );
});
