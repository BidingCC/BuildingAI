import { useAiProvidersQuery } from "@buildingai/services/web";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { convertProvidersToModels } from "@/components/ask-assistant-ui";

import { ChatContent } from "./_components/chat-content";
import type { DocumentItem } from "./_components/documents";
import { Content, DatasetDetailLayout } from "./_layouts/index";

const MyKnowledgeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: providers = [] } = useAiProvidersQuery({
    supportedModelTypes: "llm",
  });
  const models = useMemo(() => convertProvidersToModels(providers), [providers]);
  const [mode] = useState<"own" | "others">("own");

  const dataset = useMemo(
    () => ({
      id: id || "1",
      title: mode === "own" ? "超级无敌知识库" : "天涯神贴",
      avatar: undefined,
      creator: mode === "own" ? "175*****330" : "王者老闫",
      memberCount: mode === "own" ? 1 : 18250,
      description: mode === "own" ? undefined : "这个知识库收集了许多天涯神帖,超值得抽空一读!",
      contentCount: mode === "own" ? 2 : 42,
      totalSize: mode === "own" ? "30.45KB" : "793.33MB",
    }),
    [id, mode],
  );

  const documents: DocumentItem[] = useMemo(() => {
    if (mode === "own") {
      return [
        {
          id: "1",
          title: "(院级) 校企共建研发中心合同...",
          summary: '总结: 这是xx公司与厦门大学 关于建立"xx 研发中心"的合同。双方本着友好...',
          fileType: "Word文件",
          fileSize: "29.4KB",
          tags: ["校企合作", "研发中心"],
        },
        {
          id: "2",
          title: "代码解释器.yaml",
          summary: '该文档介绍了名为"代码解释器"的 工具。它能阐明代码语法与语义,作者自称科...',
          fileType: "其他文件",
          fileSize: "1.05KB",
          tags: ["编程语言", "代码解释"],
        },
      ];
    } else {
      return [
        {
          id: "1",
          number: "03.",
          title: "《DNA鉴定师手记-1-人性实验...》",
          summary: "AI生成摘要: 这是法医鉴定师的手记，记录了亲子鉴定案例...",
          fileType: "PDF文件",
          fileSize: "44.35MB",
        },
        {
          id: "2",
          number: "02.",
          title: "《2005中国年度网络文学》[...]",
          summary: "AI生成摘要: 这是由天涯社区选编的年度网络文学选集...",
          fileType: "PDF文件",
          fileSize: "13.47MB",
        },
        {
          id: "3",
          number: "01.",
          title: "《20-30岁,我拿十年做什么...》",
          summary: "AI生成摘要: 这本书讨论了20-30岁这个人生关键阶段...",
          fileType: "PDF文件",
          fileSize: "47.14MB",
        },
      ];
    }
  }, [mode]);

  const handleUpload = (files: File[]) => {
    console.log("Upload files:", files);
    // TODO: 实现文件上传逻辑
  };

  const handleJoin = () => {
    console.log("Join dataset");
    // TODO: 实现加入知识库逻辑
  };

  const handlePublish = () => {
    console.log("Publish to knowledge square");
    // TODO: 实现发布到知识广场逻辑
  };

  const handleDocumentClick = (document: DocumentItem) => {
    console.log("Document clicked:", document);
    // TODO: 实现文档点击逻辑
  };

  return (
    <DatasetDetailLayout
      mode={mode}
      dataset={dataset}
      documents={documents}
      onUpload={handleUpload}
      onJoin={handleJoin}
      onPublish={handlePublish}
      onDocumentClick={handleDocumentClick}
    >
      <Content mode={mode} dataset={dataset}>
        <ChatContent
          welcomeConfig={{
            title: dataset.title,
            creator: dataset.creator,
            instruction: "你可以通过提问了解知识库中的相关内容",
          }}
          models={models}
        />
      </Content>
    </DatasetDetailLayout>
  );
};

export default MyKnowledgeDetailPage;
