const MIME_TO_LABEL: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word 格式",
  "application/msword": "Word 格式",

  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel 格式",
  "application/vnd.ms-excel": "Excel 格式",
  "text/csv": "CSV 格式",

  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT 格式",
  "application/vnd.ms-powerpoint": "PPT 格式",

  "application/pdf": "PDF 格式",

  "text/plain": "TXT 格式",
  "text/markdown": "Markdown 格式",
  "text/md": "Markdown 格式",
  "text/rtf": "RTF 格式",
  "application/rtf": "RTF 格式",

  "text/html": "HTML 格式",
  "application/xhtml+xml": "HTML 格式",

  "application/json": "JSON 格式",
  "text/json": "JSON 格式",
  "application/xml": "XML 格式",
  "text/xml": "XML 格式",

  "image/jpeg": "JPEG 图片",
  "image/png": "PNG 图片",
  "image/gif": "GIF 图片",
  "image/webp": "WebP 图片",
  "image/svg+xml": "SVG 图片",

  "audio/mpeg": "MP3 音频",
  "audio/wav": "WAV 音频",
  "audio/ogg": "OGG 音频",

  "video/mp4": "MP4 视频",
  "video/webm": "WebM 视频",
  "video/ogg": "OGG 视频",

  "application/zip": "ZIP 压缩包",
  "application/x-zip-compressed": "ZIP 压缩包",
  "application/x-rar-compressed": "RAR 压缩包",
  "application/x-7z-compressed": "7Z 压缩包",

  "application/octet-stream": "二进制文件",
};

const FALLBACK_RULES: Array<[RegExp, string]> = [
  [/wordprocessingml|msword/, "Word 格式"],
  [/spreadsheetml|ms-excel/, "Excel 格式"],
  [/presentationml|ms-powerpoint/, "PPT 格式"],
  [/pdf/, "PDF 格式"],
  [/markdown|md$/, "Markdown 格式"],
  [/plain|txt$/, "TXT 格式"],
  [/csv/, "CSV 格式"],
  [/json/, "JSON 格式"],
  [/xml/, "XML 格式"],
  [/html|xhtml/, "HTML 格式"],
  [/rtf/, "RTF 格式"],
  [/^image\//, "图片文件"],
  [/^audio\//, "音频文件"],
  [/^video\//, "视频文件"],
];

export function formatFileType(mimeType?: string): string {
  if (!mimeType) return "未知格式";

  const normalized = mimeType.toLowerCase().trim();

  const exact = MIME_TO_LABEL[normalized];
  if (exact) return exact;

  for (const [rule, label] of FALLBACK_RULES) {
    if (rule.test(normalized)) return label;
  }

  return "未知格式";
}

/** file-fomat-icons 中使用的格式 key：docx, html, csv, pdf, txt, ppt, pptx, xls, xlsx, json, md, rtf, xml */
const MIME_TO_FORMAT_KEY: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/md": "md",
  "text/rtf": "rtf",
  "application/rtf": "rtf",
  "text/html": "html",
  "application/xhtml+xml": "html",
  "application/json": "json",
  "text/json": "json",
  "application/xml": "xml",
  "text/xml": "xml",
};

const FORMAT_KEY_FALLBACK: Array<[RegExp, string]> = [
  [/wordprocessingml|msword/, "docx"],
  [/spreadsheetml/, "xlsx"],
  [/ms-excel/, "xls"],
  [/presentationml/, "pptx"],
  [/ms-powerpoint/, "ppt"],
  [/pdf/, "pdf"],
  [/markdown|^text\/md/, "md"],
  [/^text\/plain|txt$/, "txt"],
  [/csv/, "csv"],
  [/json/, "json"],
  [/xml/, "xml"],
  [/html|xhtml/, "html"],
  [/rtf/, "rtf"],
];

/**
 * 将 MIME 类型转换为 fileFormatIconsMap 的 key，用于 FileFormatIcon
 */
export function getFileFormatKey(mimeType?: string): string {
  if (!mimeType) return "";

  const normalized = mimeType.toLowerCase().trim();
  const exact = MIME_TO_FORMAT_KEY[normalized];
  if (exact) return exact;

  for (const [rule, key] of FORMAT_KEY_FALLBACK) {
    if (rule.test(normalized)) return key;
  }

  return "";
}
