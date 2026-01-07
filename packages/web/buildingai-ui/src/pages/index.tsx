import type { Model, Suggestion } from "../components/ask-assistant-ui";
import {
  AssistantProvider,
  Thread,
  ThreadList,
  useAssistant,
} from "../components/ask-assistant-ui";

const MODELS: Model[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai", "azure"],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai", "azure"],
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude 4 Opus",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"],
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude 4 Sonnet",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"],
  },
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash",
    chef: "Google",
    chefSlug: "google",
    providers: ["google"],
  },
];

const SUGGESTIONS: Suggestion[] = [
  { id: "1", text: "如何开始使用 React Hooks？" },
  { id: "2", text: "TypeScript 的最佳实践是什么？" },
  { id: "3", text: "如何优化 React 应用的性能？" },
];

const IndexPage = () => {
  const assistant = useAssistant({
    models: MODELS,
    defaultModelId: MODELS[0].id,
    suggestions: SUGGESTIONS,
  });

  return (
    <AssistantProvider {...assistant}>
      <div className="flex h-full w-full">
        <ThreadList />
        <Thread title="关于这个那个的标题" />
      </div>
    </AssistantProvider>
  );
};

export default IndexPage;
