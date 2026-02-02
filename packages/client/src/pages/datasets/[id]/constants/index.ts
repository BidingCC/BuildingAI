import type { DocumentSortBy, Suggestion } from "../types";

// ============================================================================
// Upload Constants
// ============================================================================

export const SUPPORTED_FORMATS = "支持 docx、xlsx、pptx、pdf、csv、md 等格式";

export const UPLOAD_ACCEPT = "*/*";

// ============================================================================
// Chat Constants
// ============================================================================

export const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { id: "1", text: "这个知识库主要包含哪些内容？" },
  { id: "2", text: "请根据知识库内容回答我的问题" },
  { id: "3", text: "总结一下知识库中的关键信息" },
];

export const DEFAULT_INSTRUCTION = "你可以通过提问了解知识库中的相关内容";

export const AI_DISCLAIMER = "内容由 AI 生成，请仔细甄别";

// ============================================================================
// Document Constants
// ============================================================================

export const SORT_OPTIONS: { value: DocumentSortBy; label: string }[] = [
  { value: "name", label: "文件名称" },
  { value: "size", label: "文件大小" },
  { value: "uploadTime", label: "上传时间" },
];

export const DEFAULT_PAGE_SIZE = 50;
