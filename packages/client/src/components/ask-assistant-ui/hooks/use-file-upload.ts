import { uploadFiles } from "@buildingai/services/shared";
import { usePromptInputAttachments } from "@buildingai/ui/components/ai-elements/prompt-input";
import type { FileUIPart } from "ai";
import { useCallback, useMemo } from "react";

const FILE_TYPES = [
  { type: "image" as const, accept: "image/*", feature: "vision" },
  { type: "video" as const, accept: "video/*", feature: "video" },
  { type: "audio" as const, accept: "audio/*", feature: "audio" },
  { type: "file" as const, accept: ".docx,.ppt,.pptx,.md,.txt,.xlsx", feature: undefined },
] as const;

export type FileType = (typeof FILE_TYPES)[number]["type"];

export function getAvailableFileTypes(features?: string[]): FileType[] {
  const availableTypes: FileType[] = ["file"];

  if (!features?.length) {
    return availableTypes;
  }

  FILE_TYPES.forEach((fileType) => {
    if (fileType.feature && features.includes(fileType.feature)) {
      availableTypes.push(fileType.type);
    }
  });

  return availableTypes;
}

export function useFileUpload(multiple?: boolean, features?: string[]) {
  const attachments = usePromptInputAttachments();

  const availableFileTypes = useMemo(() => getAvailableFileTypes(features), [features]);

  const handleFileSelect = useCallback(
    (type: FileType) => {
      const fileType = FILE_TYPES.find((ft) => ft.type === type);
      if (!fileType) return;

      const input = document.createElement("input");
      input.type = "file";
      input.multiple = multiple ?? true;
      if (fileType.accept) {
        input.accept = fileType.accept;
      }
      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        if (files.length) {
          attachments.add(files);
        }
      };
      input.click();
    },
    [attachments, multiple],
  );

  const uploadFilesIfNeeded = useCallback(async (files: FileUIPart[]): Promise<FileUIPart[]> => {
    const needsUpload = files.some(
      (file) => file.url.startsWith("blob:") || file.url.startsWith("data:"),
    );

    if (!needsUpload) {
      return files;
    }

    try {
      const filePromises = files.map(async (file) => {
        if (file.url.startsWith("blob:") || file.url.startsWith("data:")) {
          const response = await fetch(file.url);
          const blob = await response.blob();
          const extension = file.mediaType?.split("/")[1] || "bin";
          return new File([blob], file.filename || `file.${extension}`, {
            type: file.mediaType || "application/octet-stream",
          });
        }
        return null;
      });

      const filesToUpload = (await Promise.all(filePromises)).filter((f): f is File => f !== null);

      if (!filesToUpload.length) {
        return files;
      }

      const uploadResults = await uploadFiles(filesToUpload);
      const uploadedFiles: FileUIPart[] = uploadResults.map((result) => ({
        type: "file" as const,
        url: result.url,
        mediaType: result.mimeType,
        filename: result.originalName,
      }));

      const remoteFiles = files.filter(
        (file) => !file.url.startsWith("blob:") && !file.url.startsWith("data:"),
      );

      return [...uploadedFiles, ...remoteFiles];
    } catch (error) {
      console.error("Failed to upload files:", error);
      return files;
    }
  }, []);

  return {
    handleFileSelect,
    uploadFilesIfNeeded,
    availableFileTypes,
  };
}
