import {
  uploadFile as uploadFileService,
  type UploadFileResult,
} from "@buildingai/services/shared";
import * as React from "react";
import { toast } from "sonner";

export type UploadedFile = {
  name: string;
  size: number;
  type: string;
  url: string;
};

interface UseUploadFileProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
}

export function useUploadFile({ onUploadComplete, onUploadError }: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadFile(file: File) {
    setIsUploading(true);
    setUploadingFile(file);

    try {
      const result: UploadFileResult = await uploadFileService(file, undefined, {
        onUploadProgress: (event) => {
          const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
          setProgress(Math.min(percent, 100));
        },
      });

      const uploaded: UploadedFile = {
        name: result.originalName,
        size: result.size,
        type: result.mimeType,
        url: result.url,
      };

      setUploadedFile(uploaded);
      onUploadComplete?.(uploaded);

      return uploaded;
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      toast.error(
        errorMessage.length > 0 ? errorMessage : "Something went wrong, please try again later.",
      );

      onUploadError?.(error);
    } finally {
      setProgress(0);
      setIsUploading(false);
      setUploadingFile(undefined);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile,
    uploadingFile,
  };
}

export function getErrorMessage(err: unknown) {
  const unknownError = "Something went wrong, please try again later.";

  if (err instanceof Error) {
    return err.message;
  }
  return unknownError;
}

export function showErrorToast(err: unknown) {
  const errorMessage = getErrorMessage(err);

  return toast.error(errorMessage);
}
