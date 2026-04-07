import { useI18n } from "@buildingai/i18n";
import { useChatConfigQuery, useUpdateChatConfigMutation } from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import {
  Editor,
  EditorContainer,
  EditorKit,
  Plate,
  usePlateEditor,
} from "@buildingai/ui/components/editor";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Loader2, PlusIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ModelSelector as AIModelSelector } from "@/components/ask-assistant-ui/components/model-selector";
import { PageContainer } from "@/layouts/console/_components/page-container";

const suggestionSchema = z.object({
  icon: z.string(),
  text: z.string(),
});

const chatConfigFormSchema = z.object({
  welcomeTitle: z.string().min(1, "Welcome title is required").trim(),
  welcomeDescription: z.string(),
  footerInfo: z.string().optional(),
  attachmentSizeLimit: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? (v === "" ? 0 : Number(v)) : v))
    .pipe(z.number().min(1, "Attachment size limit must be a positive number (unit: MB)")),
  suggestionsEnabled: z.boolean(),
  suggestions: z.array(suggestionSchema),
  memoryModelId: z.string().optional(),
  titleModelId: z.string().optional(),
});

type FormValues = z.infer<typeof chatConfigFormSchema>;

interface ApiChatConfig {
  welcomeInfo?: { title?: string; description?: string; footer?: string };
  attachmentSizeLimit?: number;
  suggestionsEnabled?: boolean;
  suggestions?: Array<{ icon: string; text: string }>;
  memoryModelId?: string;
  titleModelId?: string;
}

const defaultFormValues: FormValues = {
  welcomeTitle: "",
  welcomeDescription: "",
  footerInfo: "",
  attachmentSizeLimit: 10,
  suggestionsEnabled: true,
  suggestions: [
    { icon: "🎮", text: "写一个像宝可梦方式的小游戏" },
    { icon: "📅", text: "2025年节日安排出来了吗?" },
    { icon: "😊", text: "AI时代，什么能力不可被替代?" },
    { icon: "📝", text: "一篇生成爆款小红书笔记" },
    { icon: "🔍", text: "AI能成为全球人类产生威胁吗?" },
  ],
  memoryModelId: "",
  titleModelId: "",
};

const EMPTY_EDITOR_VALUE = [{ type: "p", children: [{ text: "" }] }];

function parseEditorValue(raw: unknown): any[] {
  if (Array.isArray(raw) && raw.length > 0) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      return [{ type: "p", children: [{ text: raw }] }];
    }
  }
  return EMPTY_EDITOR_VALUE;
}

interface ChatConfigFormProps {
  apiData: ApiChatConfig;
}

const ChatConfigForm = ({ apiData }: ChatConfigFormProps) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateChatConfigMutation({
    onSuccess: () => {
      toast.success(t("chat.config.actions.saveSettings"));
      queryClient.invalidateQueries({ queryKey: ["console", "chat-config"] });
    },
  });

  const [resetKey, setResetKey] = useState(0);

  const editorInitialValue = useMemo(
    () => parseEditorValue(apiData.welcomeInfo?.description),
    [apiData],
  );

  const initialValues = useMemo<FormValues>(
    () => ({
      welcomeTitle: apiData.welcomeInfo?.title ?? "",
      welcomeDescription: JSON.stringify(editorInitialValue),
      footerInfo: apiData.welcomeInfo?.footer ?? "",
      attachmentSizeLimit:
        typeof apiData.attachmentSizeLimit === "number" ? apiData.attachmentSizeLimit : 10,
      suggestionsEnabled:
        typeof apiData.suggestionsEnabled === "boolean" ? apiData.suggestionsEnabled : true,
      suggestions: Array.isArray(apiData.suggestions)
        ? apiData.suggestions
        : defaultFormValues.suggestions,
      memoryModelId: apiData.memoryModelId ?? "",
      titleModelId: apiData.titleModelId ?? "",
    }),
    [apiData, editorInitialValue],
  );

  const descriptionEditor = usePlateEditor({
    plugins: EditorKit,
    id: `welcome-description-${resetKey}`,
    value: editorInitialValue,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(chatConfigFormSchema) as Resolver<FormValues>,
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.reset(initialValues);
    if (apiData.welcomeInfo) setResetKey((k) => k + 1);
  }, [initialValues, apiData.welcomeInfo]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "suggestions",
  });

  const [newSuggestionText, setNewSuggestionText] = useState("");

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({
      welcomeInfo: {
        title: values.welcomeTitle,
        description: values.welcomeDescription,
        footer: values.footerInfo?.trim() || undefined,
      },
      attachmentSizeLimit: values.attachmentSizeLimit,
      suggestionsEnabled: values.suggestionsEnabled,
      suggestions: values.suggestions,
      memoryModelId: values.memoryModelId?.trim() || undefined,
      titleModelId: values.titleModelId?.trim() || undefined,
    });
  };

  const handleReset = () => {
    form.reset(initialValues);
    setNewSuggestionText("");
    setResetKey((k) => k + 1);
    toast.success(t("chat.config.actions.resetSuccess"));
  };

  const handleAddSuggestion = () => {
    const text = newSuggestionText.trim();
    if (!text) return;
    append({ icon: "💬", text });
    setNewSuggestionText("");
  };

  return (
    <PageContainer>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <Tabs defaultValue="welcome" className="w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-6">
                <TabsList>
                  <TabsTrigger value="welcome" className="px-3">
                    {t("chat.config.tabs.welcome")}
                  </TabsTrigger>
                  <TabsTrigger value="suggestions" className="px-3">
                    {t("chat.config.tabs.suggestions")}
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="px-3">
                    {t("chat.config.tabs.chat")}
                  </TabsTrigger>
                  <TabsTrigger value="model" className="px-3">
                    {t("chat.config.tabs.model")}
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="flex shrink-0 gap-2">
                <PermissionGuard permissions="ai-conversations:update-config">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {t("chat.config.actions.saveSettings")}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleReset}>
                    {t("chat.config.actions.resetSettings")}
                  </Button>
                </PermissionGuard>
              </div>
            </div>
            <TabsContent value="welcome" className="mt-4">
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-medium">{t("chat.config.welcomeTab.title")}</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("chat.config.welcomeTab.description")}
                  </p>
                </div>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="welcomeTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("chat.config.welcomeTab.form.welcomeTitle")}</FormLabel>
                        <FormControl>
                          <Input
                            required
                            placeholder={t("chat.config.welcomeTab.placeholder.welcomeTitle")}
                            className="w-full max-w-2xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="welcomeDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("chat.config.welcomeTab.form.welcomeDescription")}</FormLabel>
                        <FormControl>
                          <Plate
                            editor={descriptionEditor}
                            onValueChange={({ value }) => {
                              field.onChange(JSON.stringify(value));
                            }}
                          >
                            <EditorContainer className="h-80 w-full max-w-2xl rounded-lg border">
                              <Editor required variant="default" />
                            </EditorContainer>
                          </Plate>
                        </FormControl>
                        <FormDescription>{t("chat.config.welcomeTab.description")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="footerInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("chat.config.welcomeTab.form.footerInfo")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("chat.config.welcomeTab.placeholder.footerInfo")}
                            className="min-h-[60px] max-w-2xl resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("chat.config.welcomeTab.form.footerDescription")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="suggestions" className="mt-4">
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-medium">{t("chat.config.tabs.suggestions")}</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("chat.config.suggestionsTab.description")}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="suggestionsEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <FormLabel>
                            {t("chat.config.suggestionsTab.form.enableSuggestions")}
                          </FormLabel>
                          <FormDescription>
                            {t("chat.config.suggestionsTab.form.enableDescription")}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <FormLabel className="text-sm">
                      {t("chat.config.suggestionsTab.form.addNew")}
                    </FormLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("chat.config.suggestionsTab.form.inputPlaceholder")}
                        value={newSuggestionText}
                        onChange={(e) => setNewSuggestionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSuggestion();
                          }
                        }}
                        className="w-full"
                      />
                      <Button
                        type="button"
                        onClick={handleAddSuggestion}
                        disabled={!newSuggestionText.trim()}
                      >
                        <PlusIcon className="size-4" />
                        {t("common.action.add")}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FormLabel className="text-sm">
                      {t("chat.config.suggestionsTab.form.addedItems")}
                    </FormLabel>
                    {fields.length === 0 ? (
                      <p className="text-muted-foreground py-6 text-center text-sm">
                        {t("chat.config.suggestionsTab.form.empty")}
                      </p>
                    ) : (
                      <ul className="border-border divide-y rounded-md border">
                        {fields.map((field, index) => (
                          <li
                            key={field.id}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {form.watch(`suggestions.${index}.text`) || t("chat.config.suggestionsTab.form.notFilled")}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                              onClick={() => remove(index)}
                              aria-label={t("chat.config.suggestionsTab.form.remove")}
                            >
                              <X className="size-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="mt-4">
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-medium">{t("chat.config.chatTab.title")}</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("chat.config.chatTab.description")}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="attachmentSizeLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="text-destructive">*</span> {t("chat.config.chatTab.form.attachmentSizeLimit")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="10"
                          className="max-w-40"
                          {...field}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t("chat.config.chatTab.form.attachmentSizeDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            <TabsContent value="model" className="mt-4">
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-medium">{t("chat.config.modelTab.title")}</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("chat.config.modelTab.description")}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-lg px-0 py-2">
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-sm font-medium">
                          {t("chat.config.modelTab.form.memoryModel")}
                        </FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                              aria-label={t("chat.config.modelTab.tooltip.help")}
                            >
                              <HelpCircle className="text-muted-foreground h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {t("chat.config.modelTab.tooltip.memoryModel")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {t("chat.config.modelTab.tooltip.memoryModelHint")}
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="memoryModelId"
                      render={({ field }) => (
                        <FormItem className="mb-0 ml-4 w-56 shrink-0">
                          <FormControl>
                            <AIModelSelector
                              modelType="llm"
                              value={field.value ?? ""}
                              onSelect={field.onChange}
                              triggerVariant="button"
                              placeholder={t("chat.config.modelTab.placeholder.notEnabled")}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg px-0 py-2">
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-sm font-medium">
                          {t("chat.config.modelTab.form.titleModel")}
                        </FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                              aria-label={t("chat.config.modelTab.tooltip.help")}
                            >
                              <HelpCircle className="text-muted-foreground h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {t("chat.config.modelTab.tooltip.titleModel")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {t("chat.config.modelTab.tooltip.titleModelHint")}
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="titleModelId"
                      render={({ field }) => (
                        <FormItem className="mb-0 ml-4 w-56 shrink-0">
                          <FormControl>
                            <AIModelSelector
                              modelType="llm"
                              value={field.value ?? ""}
                              onSelect={field.onChange}
                              triggerVariant="button"
                              placeholder={t("chat.config.modelTab.placeholder.notEnabled")}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </PageContainer>
  );
};

const emptyChatConfig: ApiChatConfig = {};

const ChatConfigIndexPage = () => {
  const { data } = useChatConfigQuery();
  return <ChatConfigForm apiData={(data as ApiChatConfig) ?? emptyChatConfig} />;
};

export default ChatConfigIndexPage;
