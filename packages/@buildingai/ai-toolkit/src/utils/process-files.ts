export type FilePartLike = {
    type: string;
    url: string;
    mediaType?: string;
    filename?: string;
};

export type MessageWithParts = { role: string; parts?: unknown[] };

export type DocumentContent = { filename: string; content: string };

export type ProcessFilesWriter = {
    write: (part: { type: string; data: unknown }) => void;
};

export type ParseFileResult = {
    content: string;
    filename: string;
    progressParts: unknown[];
};

export type ParseFileFn = (
    filePart: FilePartLike,
    writer: ProcessFilesWriter,
    shouldStream: boolean,
) => Promise<ParseFileResult>;

export function deduplicateFilename(name: string, existing: Set<string>): string {
    if (!existing.has(name)) return name;
    const dot = name.lastIndexOf(".");
    const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
    let n = 2;
    while (existing.has(`${base} (${n})${ext}`)) n++;
    return `${base} (${n})${ext}`;
}

function isMediaType(type?: string): boolean {
    return (
        type?.startsWith("image/") === true ||
        type?.startsWith("video/") === true ||
        type?.startsWith("audio/") === true
    );
}

export async function processFiles<M extends MessageWithParts>(
    messages: M[],
    writer: ProcessFilesWriter,
    parseFile: ParseFileFn,
): Promise<{ messages: M[]; documentContents: DocumentContent[] }> {
    const documents: DocumentContent[] = [];
    const usedNames = new Set<string>();
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg?.role === "user") {
            lastUserIdx = i;
            break;
        }
    }

    const processed = await Promise.all(
        messages.map(async (msg, index) => {
            if (!msg.parts?.length) return msg;

            const isCurrentUserMsg = index === lastUserIdx;
            if (!isCurrentUserMsg) return msg;

            const parts: unknown[] = [];
            const hasFile = (msg.parts as FilePartLike[]).some(
                (part) => part.type === "file" && !isMediaType(part.mediaType),
            );

            for (const part of msg.parts as FilePartLike[]) {
                if (part.type !== "file") {
                    parts.push(part);
                    continue;
                }
                if (isMediaType(part.mediaType)) {
                    parts.push(part);
                } else {
                    const {
                        content,
                        filename: rawName,
                        progressParts,
                    } = await parseFile(part, writer, hasFile);
                    const filename = deduplicateFilename(rawName, usedNames);
                    usedNames.add(filename);
                    documents.push({ filename, content });
                    parts.push(...progressParts);
                }
            }

            return { ...msg, parts } as M;
        }),
    );

    return { messages: processed, documentContents: documents };
}

function isLocalhostUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return u.hostname === "localhost" || u.hostname === "127.0.0.1";
    } catch {
        return false;
    }
}

export function stripLocalhostFileParts<M extends MessageWithParts>(messages: M[]): M[] {
    return messages.map((msg) => {
        if (!msg.parts?.length) return msg;
        const parts = (msg.parts as FilePartLike[]).filter(
            (p) => p.type !== "file" || !isLocalhostUrl(p.url),
        );
        return { ...msg, parts } as M;
    }) as M[];
}
