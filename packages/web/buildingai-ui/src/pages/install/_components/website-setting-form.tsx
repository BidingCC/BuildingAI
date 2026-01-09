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
import { cn } from "@buildingai/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  websiteName: z.string().min(1, {
    message: "请输入网站名称",
  }),
  websiteDescription: z.string().optional(),
  websiteLogo: z.string().optional(),
  websiteIcon: z.string().optional(),
});

export type WebsiteSettingFormValues = z.infer<typeof formSchema>;

interface WebsiteSettingFormProps {
  step: number;
  defaultValues?: Partial<WebsiteSettingFormValues>;
  onChange?: (values: WebsiteSettingFormValues, isValid: boolean) => void;
}

const WebsiteSettingForm = ({ step, defaultValues, onChange }: WebsiteSettingFormProps) => {
  const form = useForm<WebsiteSettingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      websiteName: "",
      websiteDescription: "",
      websiteLogo: "",
      websiteIcon: "",
      ...defaultValues,
    },
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch(async () => {
      const isValid = await form.trigger();
      const values = form.getValues();
      onChange?.(values, isValid);
    });
    return () => subscription.unsubscribe();
  }, [form, onChange]);

  return (
    <div className={cn("flex justify-center", { hidden: step !== 2 })}>
      <Form {...form}>
        <form className="w-xs space-y-6">
          <h1 className="text-xl font-bold">网站基本信息</h1>
          <FormField
            control={form.control}
            name="websiteName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>网站名称</FormLabel>
                <FormControl>
                  <Input required placeholder="BuildingAI" {...field} />
                </FormControl>
                <FormDescription>您的网站显示名称</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="websiteDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>网站描述</FormLabel>
                <FormControl>
                  <Input placeholder="强大的开源企业智能体搭建平台" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="websiteLogo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>网站 Logo</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/logo.png" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="websiteIcon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>网站图标</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/favicon.ico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
};

export default WebsiteSettingForm;
