export type AttachedDocument = { filename: string; content: string };

export function buildAttachedFilesSection(
    documents: AttachedDocument[],
    useToolForDocuments: boolean,
): string {
    if (!documents?.length) return "";

    if (useToolForDocuments) {
        const filenames = documents.map((d) => d.filename).join(", ");
        return `<attached_files>\nThe user has attached the following files: ${filenames}.\nUse the read_attached_file tool to read a file's content when you need to answer questions about it.\n</attached_files>`;
    }

    const docTexts = documents.map((d) => `[文档: ${d.filename}]\n\n${d.content}`);
    return docTexts.join("\n\n");
}
