import { uploadFilesAuto } from "@buildingai/services/shared";
import { usePromptInputAttachments } from "@buildingai/ui/components/ai-elements/prompt-input";
import type { FileUIPart } from "ai";
import { useCallback, useMemo } from "react";

const FILE_TYPES = [
  { type: "image" as const, accept: "image/*", feature: "vision", label: "图片" },
  { type: "video" as const, accept: "video/*", feature: "video", label: "视频" },
  { type: "audio" as const, accept: "audio/*", feature: "audio", label: "音频" },
  {
    type: "file" as const,
    accept: ".pdf,.docx,.doc,.ppt,.pptx,.md,.txt,.xlsx,.csv",
    feature: undefined,
    label: "文件",
  },
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

/**
 * Result of file validation
 */
export interface FileValidationResult {
  /** Files that passed validation */
  validFiles: File[];
  /** Files that failed validation */
  invalidFiles: File[];
  /** Human-readable labels of unsupported file types */
  unsupportedTypeLabels: string[];
}

/**
 * Validate files against available file types
 * @param files Files to validate
 * @param availableTypes Available file types based on model features
 * @returns Validation result with valid/invalid files and unsupported type labels
 */
export function validateFilesAgainstTypes(
  files: File[],
  availableTypes: FileType[],
): FileValidationResult {
  const validFiles: File[] = [];
  const invalidFiles: File[] = [];
  const unsupportedTypeSet = new Set<string>();

  for (const file of files) {
    const mimeType = file.type;
    let isValid = false;

    for (const type of availableTypes) {
      const fileTypeConfig = FILE_TYPES.find((ft) => ft.type === type);
      if (!fileTypeConfig) continue;

      const { accept } = fileTypeConfig;
      // Check wildcard patterns like "image/*"
      if (accept.endsWith("/*")) {
        const prefix = accept.slice(0, -1); // "image/"
        if (mimeType.startsWith(prefix)) {
          isValid = true;
          break;
        }
      } else {
        // Check file extensions like ".docx,.ppt"
        const extensions = accept.split(",").map((ext) => ext.trim().toLowerCase());
        const fileName = file.name.toLowerCase();
        if (extensions.some((ext) => fileName.endsWith(ext))) {
          isValid = true;
          break;
        }
      }
    }

    if (isValid) {
      validFiles.push(file);
    } else {
      invalidFiles.push(file);
      // Determine which type this file belongs to
      for (const ft of FILE_TYPES) {
        if (ft.accept.endsWith("/*")) {
          const prefix = ft.accept.slice(0, -1);
          if (mimeType.startsWith(prefix)) {
            unsupportedTypeSet.add(ft.label);
            break;
          }
        }
      }
      // If no match found, it's a generic file
      if (unsupportedTypeSet.size === 0 || !mimeType) {
        unsupportedTypeSet.add("文件");
      }
    }
  }

  return {
    invalidFiles,
    unsupportedTypeLabels: Array.from(unsupportedTypeSet),
    validFiles,
  };
}

/**
 * @param multiple Allow multiple file selection
 * @param features Model feature flags used to derive available file types
 * @param supportedUploadTypesOverride Explicit override (e.g. from third-party agent capability).
 *        When provided, takes precedence over features-based derivation.
 */
export function useFileUpload(
  multiple?: boolean,
  features?: string[],
  supportedUploadTypesOverride?: FileType[],
) {
  const attachments = usePromptInputAttachments();

  const availableFileTypes = useMemo(
    () => supportedUploadTypesOverride ?? getAvailableFileTypes(features),
    [features, supportedUploadTypesOverride],
  );

  /**
   * Validate files against current model's supported types
   */
  const validateFiles = useCallback(
    (files: File[]): FileValidationResult => {
      return validateFilesAgainstTypes(files, availableFileTypes);
    },
    [availableFileTypes],
  );

  const hasImageSupport = useMemo(() => availableFileTypes.includes("image"), [availableFileTypes]);

  const handleFileSelect = useCallback(() => {
    if (availableFileTypes.length === 0) return;

    // 组合所有可用文件类型的 accept 属性
    const acceptList: string[] = [];
    availableFileTypes.forEach((type) => {
      const fileType = FILE_TYPES.find((ft) => ft.type === type);
      if (fileType?.accept) {
        acceptList.push(fileType.accept);
      }
    });

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple ?? true;
    if (acceptList.length > 0) {
      input.accept = acceptList.join(",");
    }
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length) {
        attachments.add(files);
      }
    };
    input.click();
  }, [attachments, multiple, availableFileTypes]);

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

      const uploadResults = await uploadFilesAuto(filesToUpload);
      const uploadedFiles: FileUIPart[] = uploadResults.map((result) => ({
        type: "file" as const,
        url: result.url,
        mediaType: result.mimeType,
        filename: result.originalName,
        ...(result.id && { providerMetadata: { buildingai: { fileId: result.id } } }),
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
    validateFiles,
    availableFileTypes,
    hasImageSupport,
  };
}
