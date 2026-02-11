# @buildingai/llm-file-parser

面向 LLM 使用的文档解析库，从多种文件格式中提取结构化文本，输出清晰、易读的内容。

## 特性

- 📄
  **多格式支持**：PDF、DOCX、PPTX、XLSX、XLS、TXT、MD、CSV、RTF、HTML、JSON、XML，以及常见代码文件（JS、TS、PY、Java、Go、Rust、Vue、CSS、YAML、SQL 等）
- 🔗 **HTTP/HTTPS URL**：支持从 URL 下载并解析文件
- 🎯 **结构化输出**：段落、标题、列表层级清晰
- 🤖 **适配 LLM**：输出格式便于模型理解
- 🔌 **Unstructured.io**：可选接入 unstructured.io API
- 📦 **类型安全**：完整 TypeScript 支持

## 安装

```bash
pnpm add @buildingai/llm-file-parser
```

## 快速开始

### 从 URL 解析

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

const result = await llmFileParser.parseFromUrl("https://example.com/document.pdf");
const text = llmFileParser.formatForLLM(result);
console.log(text);

const formattedText = await llmFileParser.parseAndFormat("https://example.com/document.pdf");
```

### 从 Buffer 解析

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

### 使用 Unstructured.io

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

const result = await llmFileParser.parseFromUrl("https://example.com/document.pdf", {
    useUnstructuredService: true,
    unstructuredApiUrl: "https://api.unstructured.io",
    unstructuredApiKey: "your-api-key",
});
```

### 解析 HTML

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

const result = await llmFileParser.parseFromUrl("https://example.com/page.html");
const text = llmFileParser.formatForLLM(result);
```

### 解析 JSON / XML

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

const jsonResult = await llmFileParser.parseFromUrl("https://example.com/data.json");
const xmlResult = await llmFileParser.parseFromUrl("https://example.com/data.xml");
```

### 解析代码文件

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";
import { readFile } from "fs/promises";

const buffer = await readFile("./src/index.ts");
const result = await llmFileParser.parseFromBuffer(buffer, "index.ts", "application/typescript");
const text = llmFileParser.formatForLLM(result);
```

### 支持格式常量

用于文件选择器 `accept`、筛选或 UI 展示：

```typescript
import {
    SUPPORTED_FILE_EXTENSIONS,
    SUPPORTED_FORMATS_DISPLAY,
    SUPPORTED_EXTENSIONS_LOWER,
    isSupportedExtension,
} from "@buildingai/llm-file-parser";

// <input type="file" accept={...} />
<input type="file" accept={SUPPORTED_FILE_EXTENSIONS.join(",")} />

// 展示支持格式（含大小写）
console.log(SUPPORTED_FORMATS_DISPLAY);

// 判断文件名是否支持
if (isSupportedExtension(file.name)) {
    // ...
}
```

- **`SUPPORTED_FILE_EXTENSIONS`**：`readonly string[]`，带点号扩展名，大小写各一份（如
  `.pdf`、`.PDF`、`.docx`、`.DOCX` 等）
- **`SUPPORTED_FORMATS_DISPLAY`**：`string`，逗号分隔的展示用字符串
- **`SUPPORTED_EXTENSIONS_LOWER`**：`readonly string[]`，仅小写扩展名
- **`isSupportedExtension(filename: string)`**：`boolean`，判断文件名是否为支持格式

### 流式解析（类似 AI SDK 的 streamText）

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

const stream = await llmFileParser.streamParseFromUrl("https://example.com/document.pdf");

for await (const chunk of stream) {
    if (chunk.type === "metadata") {
        console.log("Document metadata:", chunk.metadata);
    } else if (chunk.type === "block") {
        console.log("Block:", chunk.block);
    } else if (chunk.type === "done") {
        console.log("Final result:", chunk.result);
    }
}

const finalResult = await stream.finalResult();
console.log("Complete document:", finalResult);
```

### 流式解析并格式化

```typescript
import { llmFileParser } from "@buildingai/llm-file-parser";

for await (const textChunk of llmFileParser.streamParseAndFormat(
    "https://example.com/document.pdf",
)) {
    console.log(textChunk);
}
```

## API 参考

### `LLMFileParser`

#### `parseFromUrl(url: string, options?: ParseOptions): Promise<ParseResult>`

从 HTTP/HTTPS URL 解析文档。

#### `parseFromBuffer(buffer: Buffer, filename: string, mimeType?: string, options?: ParseOptions): Promise<ParseResult>`

从 Buffer 解析文档。

#### `formatForLLM(result: ParseResult): string`

将解析结果格式化为供 LLM 使用的文本。

#### `parseAndFormat(url: string, options?: ParseOptions): Promise<string>`

解析并格式化，一步完成。

#### `streamParseFromUrl(url: string, options?: ParseOptions): Promise<ParseStream>`

从 URL 流式解析，返回可迭代的解析块。

#### `streamParseFromBuffer(buffer: Buffer, filename: string, mimeType?: string, options?: ParseOptions): Promise<ParseStream>`

从 Buffer 流式解析。

#### `streamParseAndFormat(url: string, options?: ParseOptions): AsyncGenerator<string>`

流式解析并直接产出格式化文本块。

### `ParseOptions`

```typescript
interface ParseOptions {
    maxFileSize?: number;
    preserveFormatting?: boolean;
    includeMetadata?: boolean;
    unstructuredApiUrl?: string;
    unstructuredApiKey?: string;
    useUnstructuredService?: boolean;
    timeout?: number;
}
```

### `ParseResult`

```typescript
interface ParseResult {
    blocks: StructuredTextBlock[];
    text: string;
    metadata: {
        filename?: string;
        filetype?: string;
        size?: number;
        pages?: number;
    };
    elements?: UnstructuredElement[];
}
```

### `ParseStream`

```typescript
interface ParseStream {
    [Symbol.asyncIterator](): AsyncIterator<ParseStreamChunk>;
    finalResult(): Promise<ParseResult>;
    cancel?(): void;
}

interface ParseStreamChunk {
    type: "block" | "text" | "metadata" | "done";
    block?: StructuredTextBlock;
    text?: string;
    metadata?: ParseResult["metadata"];
    result?: ParseResult;
}
```

## 支持格式

- **PDF**：`.pdf`
- **Word**：`.docx`
- **PowerPoint**：`.pptx`
- **Excel**：`.xlsx`、`.xls`、`.csv`
- **文本**：`.txt`、`.md`、`.markdown`、`.rtf`
- **HTML**：`.html`、`.htm`、`.xhtml`
- **JSON / XML**：`.json`、`.jsonl`、`.xml`
- **代码**：`.js`、`.jsx`、`.ts`、`.tsx`、`.mjs`、`.cjs`、`.py`、`.pyw`、`.pyi`、`.java`、`.kt`、`.kts`、`.go`、`.rs`、`.c`、`.h`、`.cpp`、`.hpp`、`.cc`、`.cxx`、`.cs`、`.rb`、`.php`、`.swift`、`.vue`、`.svelte`、`.css`、`.scss`、`.sass`、`.less`、`.sh`、`.bash`、`.zsh`、`.yaml`、`.yml`、`.toml`、`.sql`、`.r`、`.lua`、`.pl`、`.pm`、`.scala`、`.groovy`

## 输出格式

解析结果为面向 LLM 的结构化文本块：

- **标题**：Markdown 风格 `#` 层级
- **段落**：归一化文本与间距
- **列表**：缩进与项目符号
- **表格**：结构化表示
- **元数据**：可选文档信息

## 输出示例

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
