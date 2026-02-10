import { useAiProvidersQuery, useConversationQuery } from "@buildingai/services/web";
import { useParams } from "react-router-dom";

import type { Suggestion } from "../components/ask-assistant-ui";
import { AssistantProvider, Chat, useAssistant } from "../components/ask-assistant-ui";

const SUGGESTIONS: Suggestion[] = [
  { id: "1", text: "如何开始使用 React Hooks？" },
  { id: "2", text: "TypeScript 的最佳实践是什么？" },
  { id: "3", text: "如何优化 React 应用的性能？" },
];

const IndexPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: providers = [] } = useAiProvidersQuery({
    supportedModelTypes: "llm",
  });
  const { data: conversation } = useConversationQuery(id || "", { enabled: !!id });

  const assistant = useAssistant({
    providers,
    suggestions: SUGGESTIONS,
  });

  return (
    <AssistantProvider {...assistant}>
      <Chat title={conversation?.title || "新对话"} />
    </AssistantProvider>
  );
};

export default IndexPage;
