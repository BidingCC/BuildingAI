import { definePageMeta, useDocumentHead } from "@buildingai/hooks";
import { useI18n } from "@buildingai/i18n";
import {
  type ChatConfig,
  useAiProvidersQuery,
  useChatConfigQuery,
  useConversationQuery,
} from "@buildingai/services/web";
import { useMemo } from "react";
import { useParams } from "react-router-dom";

import type { Suggestion } from "@/components/ask-assistant-ui";
import { AssistantProvider, Chat, useAssistant } from "@/components/ask-assistant-ui";

export const meta = definePageMeta({
  title: "chat.page.title",
  description: "chat.page.description",
  icon: "square-pen",
});

const IndexPage = () => {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const { data: providers = [] } = useAiProvidersQuery({ supportedModelTypes: "llm" });
  const { data: conversation } = useConversationQuery(id || "", { enabled: !!id });
  const { data: rawChatConfig } = useChatConfigQuery();
  const chatConfig = rawChatConfig as ChatConfig | undefined;

  useDocumentHead({
    title: id
      ? conversation?.title || t("chat.page.newConversation")
      : t("chat.page.newConversation"),
  });

  const suggestions: Suggestion[] = useMemo(() => {
    if (!chatConfig) return [];
    if (!chatConfig.suggestionsEnabled) return [];
    const list = Array.isArray(chatConfig.suggestions) ? chatConfig.suggestions : [];
    return list
      .filter((item): item is { icon?: string; text: string } => Boolean(item?.text))
      .map((item, index) => ({ id: String(index), text: item.text }));
  }, [chatConfig]);

  const welcomeInfo = chatConfig?.welcomeInfo;

  const assistant = useAssistant({ providers, suggestions });

  return (
    <AssistantProvider {...assistant}>
      <Chat
        title={conversation?.title || t("chat.page.newConversation")}
        welcomeTitle={welcomeInfo?.title}
        welcomeDescription={welcomeInfo?.description}
        footerText={welcomeInfo?.footer}
      />
    </AssistantProvider>
  );
};

export default IndexPage;
