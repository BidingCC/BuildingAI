import { useDocumentHead } from "@buildingai/hooks";
import { useI18n } from "@buildingai/i18n";
import {
  type AiProvider,
  useAiProvidersQuery,
  useDatasetDetail,
  useDatasetsDocumentsInfiniteQuery,
  usePublishDatasetToSquare,
  useUnpublishDatasetFromSquare,
} from "@buildingai/services/web";
import { useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { AssistantProvider } from "@/components/ask-assistant-ui";

import { ChatContainer, getDefaultSuggestions } from "./_components/chat";
import { DatasetActions } from "./_components/dataset-actions";
import { DatasetInfo } from "./_components/dataset-info";
import {
  DatasetEditDialog,
  EditTagsDialog,
  MemberDialog,
  PublishDialog,
  TransferDialog,
  UploadDialog,
} from "./_components/dialogs";
import { DocumentList } from "./_components/document-list";
import { DocumentTabs } from "./_components/document-tabs";
import { ContentLayout, PageLayout } from "./_layouts";
import type { DatasetDetailContextValue, DocumentTab } from "./context";
import { DatasetDetailProvider } from "./context";
import { useDatasetDocumentUpload, useDatasetsAssistant, useDialogManager } from "./hooks";

const ChatPanel = memo(function ChatPanel({
  datasetId,
  providers,
  datasetName,
  creatorNickname,
}: {
  datasetId: string;
  providers: AiProvider[];
  datasetName: string;
  creatorNickname: string;
}) {
  const { t } = useI18n();
  const { providerValue, setConversationId } = useDatasetsAssistant({
    datasetId,
    providers,
    suggestions: getDefaultSuggestions(t),
  });

  return (
    <AssistantProvider key={datasetId} {...providerValue}>
      <ChatContainer
        datasetId={datasetId}
        currentConversationId={providerValue.currentThreadId}
        onSelectConversation={setConversationId}
        welcomeConfig={{
          title: datasetName,
          creator: creatorNickname,
          instruction: t("chat.askAssistantTip"),
        }}
      />
    </AssistantProvider>
  );
});

export default function DatasetDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DocumentTab>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const dialog = useDialogManager();

  const { data: providers = [] } = useAiProvidersQuery({ supportedModelTypes: "llm" });
  const { data: dataset } = useDatasetDetail(id);
  const documentsInfiniteQuery = useDatasetsDocumentsInfiniteQuery(id ?? "", {
    pageSize: 20,
    sortBy: "uploadTime",
    fileType: activeTab,
  });

  useDocumentHead({
    title: dataset?.name || t("dataset.detail.title"),
  });

  const { uploadDocuments, uploadDocumentFromUrl } = useDatasetDocumentUpload(id);

  const documents = useMemo(
    () => documentsInfiniteQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [documentsInfiniteQuery.data?.pages],
  );

  const setActiveTabWithReset = useCallback((tab: DocumentTab) => {
    setActiveTab(tab);
    setSelectedIds([]);
  }, []);

  const documentsInfinite = useMemo(
    () => ({
      hasMore: documentsInfiniteQuery.hasNextPage ?? false,
      loading: documentsInfiniteQuery.isFetchingNextPage,
      isFetching: documentsInfiniteQuery.isFetching,
      onLoadMore: () => documentsInfiniteQuery.fetchNextPage(),
    }),
    [
      documentsInfiniteQuery.hasNextPage,
      documentsInfiniteQuery.isFetchingNextPage,
      documentsInfiniteQuery.isFetching,
      documentsInfiniteQuery.fetchNextPage,
    ],
  );

  const selectAll = useCallback((ids: string[]) => setSelectedIds(ids), []);
  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const publishMutation = usePublishDatasetToSquare(dataset?.id ?? "");
  const unpublishMutation = useUnpublishDatasetFromSquare(dataset?.id ?? "");

  const handlePublishConfirm = useCallback(
    (publishToSquare: boolean, tagIds?: string[], memberJoinApprovalRequired?: boolean) => {
      if (!dataset?.id) return;
      if (publishToSquare) {
        publishMutation.mutate(
          { tagIds: tagIds ?? [], memberJoinApprovalRequired },
          {
            onSuccess: (data) => {
              dialog.close();
              const published = Boolean(
                data?.publishedToSquare || data?.squarePublishStatus === "approved",
              );
              toast.success(
                published
                  ? t("dataset.detail.publishSuccess")
                  : t("dataset.detail.submittedForReview"),
              );
              queryClient.refetchQueries({ queryKey: ["datasets", dataset.id] });
            },
            onError: (error) => {
              toast.error(
                error instanceof Error
                  ? error.message
                  : t("dataset.detail.publishFailed", { message: "" }),
              );
            },
          },
        );
      } else {
        unpublishMutation.mutate(undefined, {
          onSuccess: () => {
            dialog.close();
            toast.success(t("dataset.detail.unpublishSuccess"));
            queryClient.refetchQueries({ queryKey: ["datasets", dataset.id] });
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : t("dataset.detail.unpublishFailed", { message: "" }),
            );
          },
        });
      }
    },
    [dataset?.id, publishMutation, unpublishMutation, queryClient, dialog],
  );

  const handleUploadFromDialog = useCallback(
    (files: File[]) => {
      uploadDocuments(files);
      dialog.close();
    },
    [uploadDocuments, dialog],
  );

  const handleUploadUrlFromDialog = useCallback(
    (value: string) => {
      uploadDocumentFromUrl(value);
      dialog.close();
    },
    [uploadDocumentFromUrl, dialog],
  );

  const contextValue = useMemo<DatasetDetailContextValue>(
    () => ({
      dataset,
      documents,
      canManageDocuments: dataset?.canManageDocuments ?? false,
      isOwner: dataset?.isOwner ?? false,
      activeTab,
      setActiveTab: setActiveTabWithReset,
      uploadDocuments,
      selectedIds,
      selectAll,
      clearSelection,
      dialog,
      documentsInfinite,
    }),
    [
      dataset,
      documents,
      activeTab,
      setActiveTabWithReset,
      uploadDocuments,
      selectedIds,
      selectAll,
      clearSelection,
      dialog,
      documentsInfinite,
    ],
  );

  return (
    <DatasetDetailProvider value={contextValue}>
      <PageLayout
        panel={
          <ChatPanel
            datasetId={id ?? ""}
            providers={providers}
            datasetName={dataset?.name ?? ""}
            creatorNickname={dataset?.creator?.nickname ?? ""}
          />
        }
      >
        <ContentLayout>
          <div className="flex flex-col gap-2 pt-20 pb-10">
            <div className="flex items-center justify-between">
              <DatasetInfo />
              <DatasetActions />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {dataset?.description ?? t("dataset.detail.emptyDescription")}
            </p>
          </div>
          <DocumentTabs />
          <DocumentList />
        </ContentLayout>

        {dialog.current?.type === "upload" && (
          <UploadDialog
            open
            onOpenChange={() => dialog.close()}
            onUpload={handleUploadFromDialog}
            onUploadUrl={handleUploadUrlFromDialog}
          />
        )}

        {dialog.current?.type === "member" && dataset?.id && (
          <MemberDialog
            datasetId={dataset.id}
            isOwner={dataset.isOwner}
            open
            onOpenChange={() => dialog.close()}
          />
        )}

        {dialog.current?.type === "publish" && (
          <PublishDialog
            open
            onOpenChange={() => dialog.close()}
            defaultPublishedToSquare={Boolean(
              dataset?.publishedToSquare || dataset?.squarePublishStatus === "rejected",
            )}
            defaultTagIds={
              Array.isArray(dataset?.tags) ? dataset.tags.map((t: any) => t.id) : undefined
            }
            defaultMemberJoinApprovalRequired={dataset?.memberJoinApprovalRequired ?? true}
            squarePublishStatus={dataset?.squarePublishStatus ?? "none"}
            squareRejectReason={dataset?.squareRejectReason ?? null}
            loading={publishMutation.isPending || unpublishMutation.isPending}
            onConfirm={handlePublishConfirm}
          />
        )}

        {dialog.current?.type === "editDataset" && dataset && (
          <DatasetEditDialog
            mode="edit"
            open
            onOpenChange={() => dialog.close()}
            initialValues={{
              name: dataset.name ?? "",
              coverUrl: dataset.coverUrl ?? undefined,
              description: dataset.description ?? "",
            }}
          />
        )}

        {dialog.current?.type === "editTags" && dataset?.id && (
          <EditTagsDialog
            open
            onOpenChange={() => dialog.close()}
            datasetId={dataset.id}
            mode={dialog.current.mode}
            document={dialog.current.document}
            documentIds={dialog.current.documentIds}
            onSuccess={() => {
              if (dialog.current?.type === "editTags" && dialog.current.mode === "batch") {
                clearSelection();
              }
            }}
          />
        )}

        {dialog.current?.type === "transfer" && dataset?.id && (
          <TransferDialog
            open
            onOpenChange={() => dialog.close()}
            mode={dialog.current.mode}
            sourceDatasetId={dataset.id}
            documentIds={dialog.current.documentIds}
            onSuccess={clearSelection}
          />
        )}
      </PageLayout>
    </DatasetDetailProvider>
  );
}
