import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { nanoid } from "nanoid";
import type { FormEvent } from "react";

import type { MessageData } from "../components/ask-assistant-ui/components/message";
import type { ModelData } from "../components/ask-assistant-ui/components/model-selector";
import type { SuggestionData } from "../components/ask-assistant-ui/components/suggestions";
import { AskAssistantProvider } from "../components/ask-assistant-ui/provider";
import { Thread } from "../components/ask-assistant-ui/thread";
import { ThreadList } from "../components/ask-assistant-ui/thread-list";
import type { ThreadItem } from "../components/ask-assistant-ui/threadlist-sidebar";

const messages: MessageData[] = [
  {
    key: nanoid(),
    from: "user",
    content: "How do React hooks work and when should I use them?",
    attachments: [
      {
        type: "file",
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
        mediaType: "image/jpeg",
        filename: "palace-of-fine-arts.jpg",
      },
      {
        type: "file",
        url: "",
        mediaType: "application/pdf",
        filename: "react-hooks-guide.pdf",
      },
    ],
  },
  {
    key: nanoid(),
    from: "assistant",
    versions: [
      {
        id: nanoid(),
        content: `# React Hooks Guide

React hooks are functions that let you "hook into" React state and lifecycle features from function components. Here's what you need to know:

## Core Hooks

### useState
Adds state to functional components:

\`\`\`jsx
const [count, setCount] = useState(0);

return (
  <button onClick={() => setCount(count + 1)}>
    Count: {count}
  </button>
);
\`\`\`

### useEffect
Handles side effects (data fetching, subscriptions, DOM updates):

\`\`\`jsx
useEffect(() => {
  document.title = \`You clicked \${count} times\`;

  // Cleanup function (optional)
  return () => {
    document.title = 'React App';
  };
}, [count]); // Dependency array
\`\`\`

## When to Use Hooks

- ✅ **Function components** - Hooks only work in function components
- ✅ **Replacing class components** - Modern React favors hooks over classes
- ✅ **Sharing stateful logic** - Create custom hooks to reuse logic
- ❌ **Class components** - Use lifecycle methods instead

## Rules of Hooks

1. Only call hooks at the **top level** (not inside loops, conditions, or nested functions)
2. Only call hooks from **React functions** (components or custom hooks)

Would you like to explore more advanced hooks like \`useCallback\` or \`useMemo\`?`,
      },
      {
        id: nanoid(),
        content: `React hooks are special functions that let you use React features in function components. The most common ones are:

- **useState** - for managing component state
- **useEffect** - for side effects like data fetching
- **useContext** - for consuming context values
- **useRef** - for accessing DOM elements

Here's a simple example:

\`\`\`jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
\`\`\`

Which specific hook would you like to learn more about?`,
      },
      {
        id: nanoid(),
        content: `Absolutely! React hooks are a powerful feature introduced in React 16.8. They solve several problems:

## Key Benefits

1. **Simpler code** - No need for class components
2. **Reusable logic** - Extract stateful logic into custom hooks
3. **Better organization** - Group related code together

## Most Popular Hooks

| Hook | Purpose |
|------|---------|
| useState | Add state to components |
| useEffect | Handle side effects |
| useContext | Access context values |
| useReducer | Complex state logic |
| useCallback | Memoize functions |
| useMemo | Memoize values |

The beauty of hooks is that they let you reuse stateful logic without changing your component hierarchy. Want to dive into a specific hook?`,
      },
    ],
  },
];

const models: ModelData[] = [
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

const suggestions: SuggestionData[] = [
  {
    id: "1",
    text: "如何开始使用 React Hooks？",
  },
  {
    id: "2",
    text: "TypeScript 的最佳实践是什么？",
  },
  {
    id: "3",
    text: "如何优化 React 应用的性能？",
  },
];

// Mock thread list data
const threads: ThreadItem[] = [
  {
    id: "1",
    title: "React Hooks Discussion",
    updatedAt: new Date(),
  },
  {
    id: "2",
    title: "TypeScript Best Practices",
    updatedAt: new Date(),
  },
];

const IndexPage = () => {
  const handleSubmit = (message: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
    console.log("Submitting message:", message);
  };

  const handleSuggestionClick = (suggestion: SuggestionData) => {
    console.log("Suggestion clicked:", suggestion);
  };

  const handleShare = () => {
    console.log("Share button clicked");
  };

  return (
    <AskAssistantProvider
      initialMessages={messages}
      models={models}
      initialSelectedModelId={models[0].id}
      initialThreads={threads}
      initialSuggestions={suggestions}
      onSubmit={handleSubmit}
      onSuggestionClick={handleSuggestionClick}
    >
      <main className="flex h-dvh w-full">
        <ThreadList />
        <Thread title="AI 助手对话" onShare={handleShare} />
      </main>
    </AskAssistantProvider>
  );
};

export default IndexPage;
