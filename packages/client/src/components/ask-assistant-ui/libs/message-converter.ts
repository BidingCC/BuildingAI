import type { ReasoningUIPart, ToolUIPart, UIMessage } from "ai";

import type { Message, MessageToolCall } from "../types";

/**
 * Converts UIMessage to Message format (reverse conversion)
 *
 * Converts from AI SDK's UIMessage format back to custom Message type for view rendering.
 * Conversion includes:
 * 1. Extracting text content, attachments, reasoning, source URLs, and tool calls from parts
 * 2. Restoring tool call descriptions from metadata
 * 3. Building MessageVersion array
 */
export function convertUIMessageToMessage(uiMsg: UIMessage): Message {
  let content = "";
  const attachments: Array<{
    type: "file";
    url: string;
    mediaType?: string;
    filename?: string;
  }> = [];
  let reasoning: { content: string; duration: number } | undefined;
  const sources: Array<{ href: string; title: string }> = [];
  const tools: MessageToolCall[] = [];

  const metadata = uiMsg.metadata as
    | {
        toolDescriptions?: Array<{
          name: string;
          description: string;
        }>;
      }
    | undefined;
  const toolDescriptionsMap = new Map<string, string>();
  if (metadata?.toolDescriptions) {
    for (const desc of metadata.toolDescriptions) {
      toolDescriptionsMap.set(desc.name, desc.description);
    }
  }

  for (const part of uiMsg.parts) {
    switch (part.type) {
      case "text":
        content += part.text;
        break;

      case "file":
        attachments.push({
          type: "file",
          url: part.url,
          ...(part.mediaType && { mediaType: part.mediaType }),
          ...(part.filename && { filename: part.filename }),
        });
        break;

      case "reasoning": {
        const reasoningPart = part as ReasoningUIPart;
        const existingContent = reasoning?.content || "";
        const newContent = reasoningPart.text || "";
        if (!reasoning) {
          reasoning = {
            content: newContent,
            duration:
              (reasoningPart.providerMetadata as { duration?: number } | undefined)?.duration ?? 0,
          };
        } else {
          reasoning.content = existingContent + newContent;
          if (reasoningPart.providerMetadata) {
            const duration = (reasoningPart.providerMetadata as { duration?: number } | undefined)
              ?.duration;
            if (duration !== undefined) {
              reasoning.duration = duration;
            }
          }
        }
        break;
      }

      case "source-url":
        sources.push({
          href: part.url,
          title: part.title ?? "",
        });
        break;

      default:
        if (typeof part.type === "string" && part.type.startsWith("tool-")) {
          const toolName = part.type.replace("tool-", "");
          const toolPart = part as {
            toolCallId: string;
            state: ToolUIPart["state"];
            input: Record<string, unknown>;
            output?: unknown;
            errorText?: string;
          };

          const result =
            toolPart.state === "output-available" &&
            toolPart.output !== undefined &&
            toolPart.output !== null
              ? String(toolPart.output)
              : undefined;

          tools.push({
            name: toolName,
            description: toolDescriptionsMap.get(toolName) ?? "",
            status: toolPart.state,
            parameters: toolPart.input,
            result,
            error:
              toolPart.state === "output-error" && toolPart.errorText
                ? toolPart.errorText
                : undefined,
          });
        }
        break;
    }
  }

  const version: {
    id: string;
    content: string;
    attachments?: Array<{
      type: "file";
      url: string;
      mediaType?: string;
      filename?: string;
    }>;
  } = {
    id: `${uiMsg.id}-v0`,
    content,
    ...(attachments.length > 0 && { attachments }),
  };

  return {
    key: uiMsg.id,
    from: uiMsg.role === "user" ? "user" : "assistant",
    versions: [version],
    activeVersionIndex: 0,
    ...(sources.length > 0 && { sources }),
    ...(reasoning && { reasoning }),
    ...(tools.length > 0 && { tools }),
  };
}
