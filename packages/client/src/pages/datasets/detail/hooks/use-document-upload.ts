import { uploadFiles } from "@buildingai/services/shared";
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
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const uploadDocuments = useCallback(
    async (files: File[]) => {
      if (!datasetId || files.length === 0) return;

      setIsUploading(true);
      try {
        // 1. 上传文件到服务器，获取 fileId
        const results = await uploadFiles(files);

        // 2. 为每个上传成功的文件创建知识库文档
        const createPromises = results.map((result) =>
          createDatasetsDocument(datasetId, { fileId: result.id }),
        );

        await Promise.all(createPromises);

        // 3. 刷新文档列表和知识库详情
        queryClient.invalidateQueries({
          queryKey: ["datasets", datasetId, "documents"],
        });
        queryClient.invalidateQueries({
          queryKey: ["datasets", datasetId],
        });

        toast.success(`已成功上传 ${results.length} 个文件`);
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
    isUploading,
  };
}
