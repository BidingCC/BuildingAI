import type { UIMessage } from "ai";
import { memo } from "react";

import { GenericTool } from "../tools/generic-tool";
import { WeatherTool } from "../tools/weather-tool";

interface ToolPartData {
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: { id?: string; approved?: boolean };
}

export interface MessageToolsProps {
  parts: UIMessage["parts"];
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

export const MessageTools = memo(function MessageTools({
  parts,
  addToolApprovalResponse,
}: MessageToolsProps) {
  const toolParts = parts.filter(
    (part) =>
      typeof part.type === "string" &&
      (part.type.startsWith("tool-") || part.type === "dynamic-tool"),
  );

  if (toolParts.length === 0) return null;

  return (
    <>
      {toolParts.map((part, index) => {
        const toolPart = part as unknown as ToolPartData;
        const key = toolPart.toolCallId || `tool-${index}`;

        if (part.type === "tool-getWeather") {
          return (
            <WeatherTool
              key={key}
              toolPart={toolPart}
              addToolApprovalResponse={addToolApprovalResponse}
            />
          );
        }

        const toolName =
          part.type === "dynamic-tool"
            ? ((part as unknown as { toolName?: string }).toolName ?? "tool")
            : (part.type as string).replace("tool-", "");
        return <GenericTool key={key} toolName={toolName} toolPart={toolPart} />;
      })}
    </>
  );
});
