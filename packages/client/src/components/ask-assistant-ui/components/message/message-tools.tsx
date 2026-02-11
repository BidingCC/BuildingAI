import type { UIMessage } from "ai";
import { memo } from "react";

import { GenericTool } from "../tools/generic-tool";
import { ImageGenerationTool } from "../tools/image-generation-tool";
import { KnowledgeReferences } from "../tools/knowledge-references";
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

        if (part.type === "tool-searchKnowledgeBase") {
          const output = toolPart.output as { found?: boolean; results?: unknown[] } | undefined;
          if (output?.found && Array.isArray(output.results) && output.results.length > 0) {
            return <KnowledgeReferences key={key} toolPart={{ output: output.results }} />;
          }
          return null;
        }

        if (part.type === "tool-getInformation") {
          const output = toolPart.output;
          if (Array.isArray(output) && output.length > 0) {
            return <KnowledgeReferences key={key} toolPart={toolPart} />;
          }
          return null;
        }

        if ("output" in toolPart && Array.isArray(toolPart.output) && toolPart.output.length > 0) {
          return null;
        }

        if (part.type === "tool-getWeather") {
          return (
            <WeatherTool
              key={key}
              toolPart={toolPart}
              addToolApprovalResponse={addToolApprovalResponse}
            />
          );
        }

        if (
          part.type === "tool-dalle2ImageGeneration" ||
          part.type === "tool-dalle3ImageGeneration" ||
          part.type === "tool-gptImageGeneration"
        ) {
          return (
            <ImageGenerationTool
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
