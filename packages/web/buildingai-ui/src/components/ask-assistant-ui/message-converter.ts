import type {
  FileUIPart,
  ReasoningUIPart,
  SourceUrlUIPart,
  TextUIPart,
  ToolUIPart,
  UIMessage,
  UIMessagePart,
} from "ai";

import type { Message, MessageToolCall } from "./types";

/**
 * 将 Message 转换为 UIMessage 格式
 *
 * 根据 AI SDK 的 UIMessage 规范，将自定义的 Message 类型转换为标准的 UIMessage 格式。
 * 转换包括：
 * 1. 文本内容（从当前激活的版本）
 * 2. 附件（文件）
 * 3. 推理过程
 * 4. 信息来源
 * 5. 工具调用
 */
export function convertMessageToUIMessage(msg: Message): UIMessage {
  const activeVersionIndex = msg.activeVersionIndex ?? 0;
  const activeVersion = msg.versions[activeVersionIndex];

  const parts: UIMessagePart<never, never>[] = [];

  // 1. 添加文本内容（从当前激活的版本）
  if (activeVersion?.content) {
    const textPart: TextUIPart = {
      type: "text",
      text: activeVersion.content,
      state: "done",
    };
    parts.push(textPart);
  }

  // 2. 添加附件（从当前激活的版本）
  if (activeVersion?.attachments) {
    for (const attachment of activeVersion.attachments) {
      // FileUIPart 要求 mediaType 是必需的，如果没有则使用默认值
      const filePart: FileUIPart = {
        type: "file",
        url: attachment.url,
        mediaType: attachment.mediaType || "application/octet-stream",
        ...(attachment.filename && { filename: attachment.filename }),
      };
      parts.push(filePart);
    }
  }

  // 3. 添加推理过程
  if (msg.reasoning) {
    const reasoningPart: ReasoningUIPart = {
      type: "reasoning",
      text: msg.reasoning.content,
      state: "done",
      // 将 duration 存储在 providerMetadata 中
      ...(msg.reasoning.duration !== undefined && {
        providerMetadata: {
          duration: msg.reasoning.duration,
        },
      }),
    } as ReasoningUIPart;
    parts.push(reasoningPart);
  }

  // 4. 添加信息来源
  if (msg.sources) {
    for (const source of msg.sources) {
      const sourcePart: SourceUrlUIPart = {
        type: "source-url",
        sourceId: source.href,
        url: source.href,
        title: source.title,
      };
      parts.push(sourcePart);
    }
  }

  // 5. 添加工具调用
  if (msg.tools) {
    for (const tool of msg.tools) {
      // ToolUIPart 是动态类型，根据工具名称和状态有不同的结构
      // 使用类型断言，因为工具名称是动态的
      const toolPart = {
        type: `tool-${tool.name}` as const,
        toolCallId: `${msg.key}-${tool.name}-${Date.now()}`,
        state: tool.status,
        input: tool.parameters,
        // 根据状态添加相应的字段
        ...(tool.status === "output-available" && tool.result && { output: tool.result }),
        ...(tool.status === "output-error" && tool.error && { errorText: tool.error }),
      } as UIMessagePart<never, never>;

      parts.push(toolPart);
    }
  }

  // 构建 metadata，存储无法直接映射到 parts 的字段
  interface MessageMetadata {
    toolDescriptions?: Array<{
      name: string;
      description: string;
    }>;
  }
  const metadata: MessageMetadata = {};

  // 存储工具调用的 description（因为 ToolUIPart 没有 description 字段）
  if (msg.tools && msg.tools.length > 0) {
    metadata.toolDescriptions = msg.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }

  return {
    id: msg.key,
    role: msg.from === "user" ? "user" : "assistant",
    ...(Object.keys(metadata).length > 0 && { metadata }),
    parts,
  };
}

/**
 * 将 UIMessage 转换为 Message 格式（反向转换）
 *
 * 从 AI SDK 的 UIMessage 格式转换回自定义的 Message 类型，用于视图渲染。
 * 转换包括：
 * 1. 从 parts 中提取文本内容、附件、推理过程、信息来源、工具调用
 * 2. 从 metadata 中恢复工具调用的 description
 * 3. 构建 MessageVersion 数组
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

  // 从 metadata 中获取工具描述
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

  // 遍历 parts 提取信息
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

      case "reasoning":
        reasoning = {
          content: part.text,
          duration: (part.providerMetadata as { duration?: number } | undefined)?.duration ?? 0,
        };
        break;

      case "source-url":
        sources.push({
          href: part.url,
          title: part.title ?? "",
        });
        break;

      default:
        // 处理工具调用 (tool-*)
        if (typeof part.type === "string" && part.type.startsWith("tool-")) {
          const toolName = part.type.replace("tool-", "");
          const toolPart = part as {
            toolCallId: string;
            state: ToolUIPart["state"];
            input: Record<string, unknown>;
            output?: unknown;
            errorText?: string;
          };

          tools.push({
            name: toolName,
            description: toolDescriptionsMap.get(toolName) ?? "",
            status: toolPart.state,
            parameters: toolPart.input,
            result:
              toolPart.state === "output-available" && toolPart.output !== undefined
                ? String(toolPart.output)
                : undefined,
            error:
              toolPart.state === "output-error" && toolPart.errorText
                ? toolPart.errorText
                : undefined,
          });
        }
        break;
    }
  }

  // 构建 MessageVersion（只有一个版本，因为转换时只使用了激活版本）
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
