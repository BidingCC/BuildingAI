const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

// ============================================================================
// MIME 类型 → 用户可读格式映射
// ============================================================================

const MIME_TO_LABEL: Record<string, string> = {
  // Office Word
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word 文档 (.docx)",
  "application/msword": "Word 文档 (.doc)",
  // Office Excel
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel 表格 (.xlsx)",
  "application/vnd.ms-excel": "Excel 表格 (.xls)",
  "text/csv": "CSV 表格 (.csv)",
  // Office PowerPoint
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint 演示 (.pptx)",
  "application/vnd.ms-powerpoint": "PowerPoint 演示 (.ppt)",
  // PDF
  "application/pdf": "PDF 文档 (.pdf)",
  // 文本
  "text/plain": "纯文本 (.txt)",
  "text/markdown": "Markdown (.md)",
  "text/rtf": "富文本 (.rtf)",
  "application/rtf": "富文本 (.rtf)",
  // 网页
  "text/html": "HTML 网页 (.html)",
  "application/xhtml+xml": "XHTML (.xhtml)",
  // 数据
  "application/json": "JSON (.json)",
  "application/xml": "XML (.xml)",
  "text/xml": "XML (.xml)",
  "text/json": "JSON (.json)",
  // 二进制
  "application/octet-stream": "未知格式",
};

/**
 * 将 MIME 类型转换为用户可读的文件格式标签
 * @param mimeType MIME 类型，如 application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * @returns 用户可读的格式，如 "Word 文档 (.docx)"，未知类型时尝试从 MIME 推导
 */
export function formatFileType(mimeType: string): string {
  const normalized = mimeType?.toLowerCase().trim();
  if (!normalized) return "未知格式";

  const exact = MIME_TO_LABEL[normalized];
  if (exact) return exact;

  // 模糊匹配：按 MIME 片段推导
  if (normalized.includes("wordprocessingml") || normalized.includes("msword"))
    return "Word 文档 (.docx/.doc)";
  if (normalized.includes("spreadsheetml") || normalized.includes("ms-excel"))
    return "Excel 表格 (.xlsx/.xls)";
  if (normalized.includes("presentationml") || normalized.includes("ms-powerpoint"))
    return "PowerPoint 演示 (.pptx/.ppt)";
  if (normalized.includes("pdf")) return "PDF 文档 (.pdf)";
  if (normalized.includes("markdown") || normalized === "text/md") return "Markdown (.md)";
  if (normalized.includes("plain") || normalized === "text/txt") return "纯文本 (.txt)";
  if (normalized.includes("csv")) return "CSV 表格 (.csv)";
  if (normalized.includes("json")) return "JSON (.json)";
  if (normalized.includes("xml")) return "XML (.xml)";
  if (normalized.includes("html")) return "HTML (.html)";
  if (normalized.includes("rtf")) return "富文本 (.rtf)";

  return normalized;
}

export function bytesToReadable(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), BYTE_UNITS.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${BYTE_UNITS[i]}`;
}
