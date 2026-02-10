/**
 * @fileoverview Type definitions for LLM file parser
 * @description Types for unstructured document parsing and structured text output
 */

/**
 * Unstructured element types (compatible with unstructured.io format)
 */
export enum ElementType {
    Title = "Title",
    NarrativeText = "NarrativeText",
    ListItem = "ListItem",
    Table = "Table",
    Figure = "Figure",
    PageBreak = "PageBreak",
    Header = "Header",
    Footer = "Footer",
    UnorderedList = "UnorderedList",
    OrderedList = "OrderedList",
    Abstract = "Abstract",
    Summary = "Summary",
    Text = "Text",
}

/**
 * Unstructured element (compatible with unstructured.io format)
 */
export interface UnstructuredElement {
    type: ElementType | string;
    text: string;
    metadata?: {
        page_number?: number;
        filename?: string;
        filetype?: string;
        [key: string]: unknown;
    };
    element_id?: string;
}

/**
 * Structured text block for LLM consumption
 */
export interface StructuredTextBlock {
    type: "heading" | "paragraph" | "list" | "table" | "code" | "quote";
    level?: number; // For headings (1-6)
    content: string;
    items?: string[]; // For lists
    metadata?: {
        page?: number;
        [key: string]: unknown;
    };
}

/**
 * Document parsing options
 */
export interface ParseOptions {
    /**
     * Maximum file size in bytes (default: 50MB)
     */
    maxFileSize?: number;

    /**
     * Whether to preserve formatting (default: true)
     */
    preserveFormatting?: boolean;

    /**
     * Whether to include metadata (default: false)
     */
    includeMetadata?: boolean;

    /**
     * Custom unstructured API endpoint (optional)
     */
    unstructuredApiUrl?: string;

    /**
     * Unstructured API key (optional)
     */
    unstructuredApiKey?: string;

    /**
     * Whether to use unstructured.io service (default: false)
     */
    useUnstructuredService?: boolean;

    /**
     * Timeout in milliseconds (default: 30000)
     */
    timeout?: number;
}

/**
 * Document parsing result
 */
export interface ParseResult {
    /**
     * Structured text blocks
     */
    blocks: StructuredTextBlock[];

    /**
     * Plain text representation (for backward compatibility)
     */
    text: string;

    /**
     * Metadata about the document
     */
    metadata: {
        filename?: string;
        filetype?: string;
        size?: number;
        pages?: number;
        [key: string]: unknown;
    };

    /**
     * Raw unstructured elements (if available)
     */
    elements?: UnstructuredElement[];
}

/**
 * Progress information for streaming parse
 */
export interface ParseProgress {
    /**
     * Current step/stage of parsing
     */
    stage: "downloading" | "parsing" | "extracting" | "formatting" | "complete";

    /**
     * Progress message
     */
    message: string;

    /**
     * Current progress (0-100)
     */
    progress?: number;

    /**
     * Current item being processed (e.g., page number, block index)
     */
    current?: number;

    /**
     * Total items to process (e.g., total pages, total blocks)
     */
    total?: number;
}

/**
 * Stream chunk for streaming parse
 */
export interface ParseStreamChunk {
    /**
     * Type of chunk
     */
    type: "block" | "text" | "metadata" | "progress" | "done";

    /**
     * Block data (if type is "block")
     */
    block?: StructuredTextBlock;

    /**
     * Text chunk (if type is "text")
     */
    text?: string;

    /**
     * Metadata (if type is "metadata")
     */
    metadata?: ParseResult["metadata"];

    /**
     * Progress information (if type is "progress")
     */
    progress?: ParseProgress;

    /**
     * Final statistics (if type is "done")
     */
    stats?: {
        blocksCount: number;
        textLength: number;
        metadata: ParseResult["metadata"];
    };
}

/**
 * Stream parse result (async iterable)
 */
export interface ParseStream {
    /**
     * Async iterator for streaming chunks
     */
    [Symbol.asyncIterator](): AsyncIterator<ParseStreamChunk>;

    /**
     * Get final parse result (waits for stream to complete)
     */
    finalResult(): Promise<ParseResult>;

    /**
     * Cancel the parsing process
     */
    cancel?(): void;
}

/**
 * Stream parse result with both stream and result promise
 */
export interface ParseStreamWithResult {
    /**
     * Stream for progress updates
     */
    stream: ParseStream;

    /**
     * Promise that resolves to the complete parse result
     */
    result: Promise<ParseResult>;
}

/**
 * File download result
 */
export interface FileDownloadResult {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
}
