import type { DatasetsDocument } from "@buildingai/services/web";
import {
  useAiProvidersQuery,
  useDatasetDetail,
  useDatasetsDocumentsQuery,
} from "@buildingai/services/web";
import type { PaginatedResponse } from "@buildingai/web-types";
import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { convertProvidersToModels } from "@/components/ask-assistant-ui";

import { ChatContainer } from "./_components/chat";
import { SidebarContent } from "./_components/sidebar";
import { ContentLayout, PageLayout } from "./_layouts";
import { DEFAULT_PAGE_SIZE } from "./constants";
import { useDatasetDocumentUpload } from "./hooks";

function documentNeedsPolling(d: DatasetsDocument): boolean {
  return d.status === "pending" || d.status === "processing" || Boolean(d.summaryGenerating);
}

function getDocumentItems(data: unknown): DatasetsDocument[] {
  return (data as PaginatedResponse<DatasetsDocument> | undefined)?.items ?? [];
}

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: providers = [] } = useAiProvidersQuery({ supportedModelTypes: "llm" });
  const { data: dataset } = useDatasetDetail(id);
  const { data: documentsPage } = useDatasetsDocumentsQuery(
    id ?? "",
    { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    {
      refetchInterval: (query) =>
        getDocumentItems(query.state.data).some(documentNeedsPolling) ? 2000 : false,
    },
  );

  const { uploadDocuments } = useDatasetDocumentUpload(id);

  const models = useMemo(() => convertProvidersToModels(providers), [providers]);
  const documents = documentsPage?.items ?? [];

  const handleUpload = (files: File[]) => {
    uploadDocuments(files);
  };

  const handleDocumentClick = () => {};

  return (
    <PageLayout
      sidebar={
        <SidebarContent
          dataset={dataset}
          documents={documents}
          onUpload={handleUpload}
          onDocumentClick={handleDocumentClick}
        />
      }
    >
      <ContentLayout dataset={dataset}>
        <ChatContainer
          welcomeConfig={{
            title: dataset?.name ?? "",
            creator: dataset?.creator?.nickname ?? "",
            instruction: "你可以通过提问了解知识库中的相关内容",
          }}
          models={models}
        />
      </ContentLayout>
    </PageLayout>
  );
}
