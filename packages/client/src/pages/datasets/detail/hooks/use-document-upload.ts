import { useI18n } from "@buildingai/i18n";
import { uploadFilesAuto } from "@buildingai/services/shared";
import { createDatasetsDocument } from "@buildingai/services/web";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * 知识库文档上传 Hook
 *
 * 统一处理两处上传入口的上传逻辑：
 * 1. 侧边栏拖拽区域 (useDocumentDrop)
 * 2. 上传对话框 (UploadDialog)
 *
 * 流程：先调用 uploadFiles 上传文件获取 fileId，再调用 createDatasetsDocument 创建文档
 */
export function useDatasetDocumentUpload(datasetId: string | undefined) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const uploadDocuments = useCallback(
    async (files: File[]) => {
      if (!datasetId || files.length === 0) return;

      setIsUploading(true);
      try {
        const results = await uploadFilesAuto(files);
        const createPromises = results.map((result) =>
          createDatasetsDocument(datasetId, { fileId: result.id }),
        );

        await Promise.all(createPromises);

        queryClient.invalidateQueries({ queryKey: ["datasets", datasetId, "documents"] });
        queryClient.invalidateQueries({ queryKey: ["datasets", "documents-infinite", datasetId] });
        queryClient.invalidateQueries({ queryKey: ["datasets", datasetId] });
        queryClient.invalidateQueries({ queryKey: ["user", "storage"] });

        toast.success(t("dataset.document.uploadSuccess", { count: results.length }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "上传失败";
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [datasetId, queryClient],
  );

  return {
    uploadDocuments,
    uploadDocumentFromUrl: useCallback(
      async (url: string) => {
        if (!datasetId) return;
        const value = url.trim();
        if (!value) return;
        setIsUploading(true);
        try {
          await createDatasetsDocument(datasetId, { url: value });
          queryClient.invalidateQueries({ queryKey: ["datasets", datasetId, "documents"] });
          queryClient.invalidateQueries({
            queryKey: ["datasets", "documents-infinite", datasetId],
          });
          queryClient.invalidateQueries({ queryKey: ["datasets", datasetId] });
          queryClient.invalidateQueries({ queryKey: ["user", "storage"] });
          toast.success(t("dataset.document.addUrlDocumentSuccess"));
        } catch (error) {
          const message = error instanceof Error ? error.message : "上传失败";
          toast.error(message);
        } finally {
          setIsUploading(false);
        }
      },
      [datasetId, queryClient],
    ),
    isUploading,
  };
}
