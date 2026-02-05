const DOCUMENT_EXTENSIONS = [
    "pdf",
    "docx",
    "pptx",
    "xlsx",
    "xls",
    "csv",
    "txt",
    "md",
    "markdown",
    "rtf",
    "html",
    "htm",
    "xhtml",
    "json",
    "jsonl",
    "xml",
] as const;

export const CODE_EXTENSIONS = [
    "js",
    "jsx",
    "ts",
    "tsx",
    "mjs",
    "cjs",
    "py",
    "pyw",
    "pyi",
    "java",
    "kt",
    "kts",
    "go",
    "rs",
    "c",
    "h",
    "cpp",
    "hpp",
    "cc",
    "cxx",
    "cs",
    "rb",
    "php",
    "swift",
    "vue",
    "svelte",
    "css",
    "scss",
    "sass",
    "less",
    "sh",
    "bash",
    "zsh",
    "yaml",
    "yml",
    "toml",
    "sql",
    "r",
    "lua",
    "pl",
    "pm",
    "scala",
    "groovy",
] as const;

const ALL_EXTENSIONS_LOWER = [...DOCUMENT_EXTENSIONS, ...CODE_EXTENSIONS] as readonly string[];

const withDot = (ext: string) => `.${ext}`;
const bothCases = (ext: string) => [withDot(ext), withDot(ext.toUpperCase())];

export const SUPPORTED_FILE_EXTENSIONS: readonly string[] = ALL_EXTENSIONS_LOWER.flatMap(bothCases);

export const SUPPORTED_FORMATS_DISPLAY: string = [
    ...ALL_EXTENSIONS_LOWER.map((e) => e.toUpperCase()),
    ...ALL_EXTENSIONS_LOWER,
].join(", ");

export const SUPPORTED_EXTENSIONS_LOWER = ALL_EXTENSIONS_LOWER;

export function isSupportedExtension(filename: string): boolean {
    const lower = filename.toLowerCase();
    return ALL_EXTENSIONS_LOWER.some((ext) => lower.endsWith(withDot(ext)));
}
