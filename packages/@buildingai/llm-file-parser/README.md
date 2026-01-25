# @buildingai/llm-file-parser

A comprehensive document parser designed specifically for LLM consumption. Extracts structured text from various file formats with clean, well-organized output.

## Features

- 📄 **Multiple Format Support**: PDF, DOCX, PPTX, XLSX, XLS, TXT, MD, CSV, RTF, HTML, JSON, XML
- 🔗 **HTTP/HTTPS URL Support**: Download and parse files directly from URLs
- 🎯 **Structured Output**: Clean paragraphs, headings, lists with proper hierarchy
- 🤖 **LLM-Optimized**: Output format designed for optimal LLM understanding
- 🔌 **Unstructured.io Integration**: Optional integration with unstructured.io API
- 📦 **Type-Safe**: Full TypeScript support

## Installation

```bash
pnpm add @buildingai/llm-file-parser
```

## Quick Start

### Parse from URL

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

// Parse and get structured result
const result = await llmFileParser.parseFromUrl("https://example.com/document.pdf");

// Get formatted text for LLM
const text = llmFileParser.formatForLLM(result);
console.log(text);

// Or parse and format in one call
const formattedText = await llmFileParser.parseAndFormat("https://example.com/document.pdf");
```

### Parse from Buffer

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";
import { readFile } from "fs/promises";

const buffer = await readFile("./document.docx");
const result = await llmFileParser.parseFromBuffer(
    buffer,
    "document.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
);

const text = llmFileParser.formatForLLM(result);
```

### Using Unstructured.io Service

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

const result = await llmFileParser.parseFromUrl("https://example.com/document.pdf", {
    useUnstructuredService: true,
    unstructuredApiUrl: "https://api.unstructured.io",
    unstructuredApiKey: "your-api-key",
});
```

### Parse HTML

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

const result = await llmFileParser.parseFromUrl("https://example.com/page.html");
const text = llmFileParser.formatForLLM(result);
```

### Parse JSON/XML

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

// Parse JSON
const jsonResult = await llmFileParser.parseFromUrl("https://example.com/data.json");

// Parse XML
const xmlResult = await llmFileParser.parseFromUrl("https://example.com/data.xml");
```

### Stream Parsing (Like AI SDK's streamText)

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

// Stream parse document (similar to streamText)
const stream = await llmFileParser.streamParseFromUrl("https://example.com/document.pdf");

// Process chunks as they arrive
for await (const chunk of stream) {
    if (chunk.type === "metadata") {
        console.log("Document metadata:", chunk.metadata);
    } else if (chunk.type === "block") {
        console.log("Block:", chunk.block);
        // Process block immediately
    } else if (chunk.type === "done") {
        console.log("Final result:", chunk.result);
    }
}

// Or get final result directly
const finalResult = await stream.finalResult();
console.log("Complete document:", finalResult);
```

### Stream Parse and Format

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

// Stream parse and get formatted text chunks
for await (const textChunk of llmFileParser.streamParseAndFormat("https://example.com/document.pdf")) {
    console.log(textChunk);
    // Process formatted text chunks as they arrive
}
```

## API Reference

### `LLMFileParser`

#### `parseFromUrl(url: string, options?: ParseOptions): Promise<ParseResult>`

Parse document from HTTP/HTTPS URL.

#### `parseFromBuffer(buffer: Buffer, filename: string, mimeType?: string, options?: ParseOptions): Promise<ParseResult>`

Parse document from buffer.

#### `formatForLLM(result: ParseResult): string`

Format parse result to structured text for LLM consumption.

#### `parseAndFormat(url: string, options?: ParseOptions): Promise<string>`

Parse and format in one call (convenience method).

#### `streamParseFromUrl(url: string, options?: ParseOptions): Promise<ParseStream>`

Stream parse document from URL. Returns an async iterable that yields chunks as they are parsed.

#### `streamParseFromBuffer(buffer: Buffer, filename: string, mimeType?: string, options?: ParseOptions): Promise<ParseStream>`

Stream parse document from buffer.

#### `streamParseAndFormat(url: string, options?: ParseOptions): AsyncGenerator<string>`

Stream parse and format in one call. Yields formatted text chunks as they are parsed.

### `ParseOptions`

```typescript
interface ParseOptions {
    maxFileSize?: number;              // Max file size in bytes (default: 50MB)
    preserveFormatting?: boolean;       // Preserve formatting (default: true)
    includeMetadata?: boolean;          // Include metadata (default: false)
    unstructuredApiUrl?: string;       // Unstructured API endpoint
    unstructuredApiKey?: string;       // Unstructured API key
    useUnstructuredService?: boolean;   // Use unstructured.io (default: false)
    timeout?: number;                   // Timeout in ms (default: 30000)
}
```

### `ParseResult`

```typescript
interface ParseResult {
    blocks: StructuredTextBlock[];       // Structured text blocks
    text: string;                       // Plain text representation
    metadata: {                         // Document metadata
        filename?: string;
        filetype?: string;
        size?: number;
        pages?: number;
    };
    elements?: UnstructuredElement[];   // Raw unstructured elements (if available)
}
```

### `ParseStream`

```typescript
interface ParseStream {
    // Async iterator for streaming chunks
    [Symbol.asyncIterator](): AsyncIterator<ParseStreamChunk>;
    
    // Get final parse result (waits for stream to complete)
    finalResult(): Promise<ParseResult>;
    
    // Cancel the parsing process (optional)
    cancel?(): void;
}

interface ParseStreamChunk {
    type: "block" | "text" | "metadata" | "done";
    block?: StructuredTextBlock;      // If type is "block"
    text?: string;                     // If type is "text"
    metadata?: ParseResult["metadata"]; // If type is "metadata"
    result?: ParseResult;              // If type is "done"
}
```

## Supported Formats

- **PDF**: `.pdf`
- **Word**: `.docx`
- **PowerPoint**: `.pptx`
- **Excel**: `.xlsx`, `.xls`, `.csv`
- **Text**: `.txt`, `.md`, `.rtf`
- **HTML**: `.html`, `.htm`, `.xhtml`
- **JSON**: `.json`, `.jsonl`
- **XML**: `.xml`

## Output Format

The parser outputs structured text blocks optimized for LLM consumption:

- **Headings**: Properly formatted with markdown-style `#` prefixes
- **Paragraphs**: Clean, normalized text with proper spacing
- **Lists**: Bullet-point format with proper indentation
- **Tables**: Structured representation
- **Metadata**: Optional document information

## Example Output

```markdown
# Document: example.pdf

# Introduction

This is the first paragraph of the document. It contains important information about the topic.

## Section 1

This section discusses various aspects of the subject matter.

- First item in the list
- Second item in the list
- Third item in the list

## Section 2

Another paragraph with more detailed information.
```

## License

MIT
