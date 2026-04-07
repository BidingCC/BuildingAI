import { useI18n } from "@buildingai/i18n";
import {
  useSetWebsiteConfigMutation,
  useWebsiteConfigQuery,
  type WebsiteConfigResponse,
} from "@buildingai/services/console";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { Input } from "@buildingai/ui/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageContainer } from "@/layouts/console/_components/page-container";

/** 协议 Tab 配置（value 与表单字段前缀对齐） */
const AGREEMENT_TABS = [
  {
    value: "privacy",
    label: "privacy",
    titleField: "privacyTitle",
    contentField: "privacyContent",
  },
  {
    value: "service",
    label: "service",
    titleField: "serviceTitle",
    contentField: "serviceContent",
  },
  {
    value: "payment",
    label: "payment",
    titleField: "paymentTitle",
    contentField: "paymentContent",
  },
] as const;

const formSchema = z.object({
  privacyTitle: z.string().optional(),
  privacyContent: z.string().optional(),
  serviceTitle: z.string().optional(),
  serviceContent: z.string().optional(),
  paymentTitle: z.string().optional(),
  paymentContent: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

/** Plate.js 要求的最小有效值：至少包含一个空段落节点 */
const EMPTY_EDITOR_VALUE = [{ type: "p", children: [{ text: "" }] }];

/**
 * 将接口返回的内容解析为 Plate.js 节点数组，用于编辑器初始化
 * @param raw 接口返回的协议内容
 */
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

/**
 * 将接口返回的内容序列化为字符串，用于存入表单字段
 * @param raw 接口返回的协议内容
 */
function serializeContent(raw: unknown): string {
  return JSON.stringify(parseEditorValue(raw));
}

interface AgreementFormProps {
  /** 接口返回的 agreement 配置对象 */
  agreement: Record<string, unknown>;
}

const AgreementForm = ({ agreement }: AgreementFormProps) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const setMutation = useSetWebsiteConfigMutation({
    onSuccess: () => {
      toast.success(t("system.agreement.saveSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["system-website", "config"] });
    },
    onError: (e) => {
      toast.error(t("system.agreement.saveFailed", { message: e.message }));
    },
  });

  const privacyInitialValue = useMemo(
    () => parseEditorValue(agreement.privacyContent),
    [agreement.privacyContent],
  );
  const serviceInitialValue = useMemo(
    () => parseEditorValue(agreement.serviceContent),
    [agreement.serviceContent],
  );
  const paymentInitialValue = useMemo(
    () => parseEditorValue(agreement.paymentContent),
    [agreement.paymentContent],
  );

  // 编辑器在此组件首次挂载时创建，agreement 已就绪，value 使用解析后的节点数组
  const privacyEditor = usePlateEditor({
    plugins: EditorKit,
    id: "agreement-privacy",
    value: privacyInitialValue,
  });
  const serviceEditor = usePlateEditor({
    plugins: EditorKit,
    id: "agreement-service",
    value: serviceInitialValue,
  });
  const paymentEditor = usePlateEditor({
    plugins: EditorKit,
    id: "agreement-payment",
    value: paymentInitialValue,
  });

  /** 编辑器实例映射，方便在 Tab 配置中按 key 获取 */
  const editors = useMemo(
    () => ({ privacy: privacyEditor, service: serviceEditor, payment: paymentEditor }),
    [privacyEditor, serviceEditor, paymentEditor],
  );

  // 表单初始值直接从 agreement 取，无需 useEffect 延迟回填
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      privacyTitle: (agreement.privacyTitle as string) ?? "",
      privacyContent: serializeContent(agreement.privacyContent),
      serviceTitle: (agreement.serviceTitle as string) ?? "",
      serviceContent: serializeContent(agreement.serviceContent),
      paymentTitle: (agreement.paymentTitle as string) ?? "",
      paymentContent: serializeContent(agreement.paymentContent),
    },
  });

  /** 提交协议配置 */
  const onSubmit = (values: FormValues) => {
    setMutation.mutate({
      agreement: {
        privacyTitle: values.privacyTitle,
        privacyContent: values.privacyContent,
        serviceTitle: values.serviceTitle,
        serviceContent: values.serviceContent,
        paymentTitle: values.paymentTitle,
        paymentContent: values.paymentContent,
      },
    });
  };

  return (
    <Tabs defaultValue="privacy" className="flex h-full flex-col">
      <TabsList className="mx-4">
        {AGREEMENT_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {t(`system.agreement.tabs.${tab.label}`)}
          </TabsTrigger>
        ))}
      </TabsList>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex h-full flex-1 flex-col space-y-4 overflow-hidden"
        >
          {AGREEMENT_TABS.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="mt-2 flex h-full flex-1 flex-col space-y-4 overflow-hidden"
            >
              <FormField
                control={form.control}
                name={tab.titleField}
                render={({ field }) => (
                  <FormItem className="mx-4">
                    <FormLabel>{t("system.agreement.title")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("system.agreement.titlePlaceholder")}
                        className="w-full md:w-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={tab.contentField}
                render={({ field }) => (
                  <FormItem className="mx-4 flex h-full flex-1 flex-col overflow-hidden">
                    <FormLabel>{t("system.agreement.content")}</FormLabel>
                    <FormControl>
                      <Plate
                        editor={editors[tab.value]!}
                        onValueChange={({ value }) => {
                          field.onChange(JSON.stringify(value));
                        }}
                      >
                        <EditorContainer className="h-full rounded-lg border">
                          <Editor variant="default" className="" />
                        </EditorContainer>
                      </Plate>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          ))}
          <div className="flex gap-2 px-4">
            <PermissionGuard permissions="system-website:setConfig">
              <Button type="submit" loading={setMutation.isPending}>
                {t("system.agreement.save")}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  form.reset({
                    privacyTitle: "",
                    privacyContent: JSON.stringify(EMPTY_EDITOR_VALUE),
                    serviceTitle: "",
                    serviceContent: JSON.stringify(EMPTY_EDITOR_VALUE),
                    paymentTitle: "",
                    paymentContent: JSON.stringify(EMPTY_EDITOR_VALUE),
                  })
                }
              >
                {t("system.agreement.reset")}
              </Button>
            </PermissionGuard>
          </div>
        </form>
      </Form>
    </Tabs>
  );
};

const SystemAgreementIndexPage = () => {
  const { data, isLoading } = useWebsiteConfigQuery();

  const config = data as unknown as WebsiteConfigResponse;
  if (isLoading || !config) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="h-inset mx-0">
      <PermissionGuard permissions="system-website:getConfig">
        <AgreementForm agreement={config.agreement ?? {}} />
      </PermissionGuard>
    </PageContainer>
  );
};

export default SystemAgreementIndexPage;
