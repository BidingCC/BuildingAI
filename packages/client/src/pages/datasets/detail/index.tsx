import type { DatasetsDocument, DocumentSortBy } from "@buildingai/services/web";
import {
  useAiProvidersQuery,
  useDatasetDetail,
  useDatasetsDocumentsQuery,
} from "@buildingai/services/web";
import type { PaginatedResponse } from "@buildingai/web-types";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { AssistantProvider } from "@/components/ask-assistant-ui";

import { ChatContainer, DEFAULT_SUGGESTIONS } from "./_components/chat";
import { SidebarContent } from "./_components/sidebar";
import { ContentLayout, PageLayout } from "./_layouts";
import { useDatasetDocumentUpload, useDatasetsAssistant } from "./hooks";

function documentNeedsPolling(d: DatasetsDocument): boolean {
  return d.status === "pending" || d.status === "processing" || Boolean(d.summaryGenerating);
}

function getDocumentItems(data: unknown): DatasetsDocument[] {
  return (data as PaginatedResponse<DatasetsDocument> | undefined)?.items ?? [];
}

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sortBy, setSortBy] = useState<DocumentSortBy>("uploadTime");
  const [keyword, setKeyword] = useState("");

  const { data: providers = [] } = useAiProvidersQuery({ supportedModelTypes: "llm" });
  const { data: dataset } = useDatasetDetail(id);
  const listParams = useMemo(
    () => ({
      page: 1,
      pageSize: 20,
      sortBy,
      keyword: keyword.trim() || undefined,
    }),
    [sortBy, keyword],
  );
  const { data: documentsPage } = useDatasetsDocumentsQuery(id ?? "", listParams, {
    refetchInterval: (query) =>
      getDocumentItems(query.state.data).some(documentNeedsPolling) ? 2000 : false,
  });

  const { uploadDocuments } = useDatasetDocumentUpload(id);

  const documents = documentsPage?.items ?? [];

  const assistantValue = useDatasetsAssistant({
    datasetId: id ?? "",
    providers,
    suggestions: DEFAULT_SUGGESTIONS,
  });

  const handleUpload = (files: File[]) => {
    uploadDocuments(files);
  };

  const handleDocumentClick = () => {};

  const welcomeMessage = (
    <div className="text-center">
      <h2 className="text-2xl font-semibold">{dataset?.name ?? "知识库"}</h2>
      <p className="text-muted-foreground mt-2">
        {dataset?.creator?.nickname
          ? `创建者：${dataset.creator.nickname}`
          : "你可以通过提问了解知识库中的相关内容"}
      </p>
      <p className="text-muted-foreground mt-1">开始对话，或选择一个推荐问题</p>
    </div>
  );

  const { setConversationId, ...providerValue } = assistantValue;

  return (
    <PageLayout
      sidebar={
        <SidebarContent
          dataset={dataset}
          documents={documents}
          sortBy={sortBy}
          onSortChange={setSortBy}
          searchKeyword={keyword}
          onSearchChange={setKeyword}
          onUpload={handleUpload}
          onDocumentClick={handleDocumentClick}
        />
      }
    >
      <ContentLayout dataset={dataset}>
        <AssistantProvider {...providerValue}>
          <ChatContainer
            assistantMode
            datasetId={id ?? ""}
            currentConversationId={assistantValue.currentThreadId}
            onSelectConversation={setConversationId}
            welcomeConfig={{
              title: dataset?.name ?? "",
              creator: dataset?.creator?.nickname ?? "",
              instruction: "你可以通过提问了解知识库中的相关内容",
            }}
            welcomeMessage={welcomeMessage}
          />
        </AssistantProvider>
      </ContentLayout>
    </PageLayout>
  );
}
