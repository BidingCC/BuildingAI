import { useI18n } from "@buildingai/i18n";
import { THEME_COLORS, useTheme } from "@buildingai/ui/components/theme-provider";
import { ScrollThemeItems } from "@buildingai/ui/components/theme-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@buildingai/ui/components/ui/accordion";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@buildingai/ui/components/ui/form";
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { cn } from "@buildingai/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronsUpDown, Settings2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  websiteName: z.string().min(1, {
    message: "install.website.form.websiteNameRequired",
  }),
  websiteDescription: z.string().optional(),
  websiteLogo: z.string().optional(),
  websiteIcon: z.string().optional(),
  theme: z.string().optional(),
});

export type WebsiteSettingFormValues = z.infer<typeof formSchema>;

interface WebsiteSettingFormProps {
  step: number;
  defaultValues?: Partial<WebsiteSettingFormValues>;
  onChange?: (values: WebsiteSettingFormValues, isValid: boolean) => void;
}

const WebsiteSettingForm = ({ step, defaultValues, onChange }: WebsiteSettingFormProps) => {
  const { t } = useI18n();
  const { themeColor, setThemeColor } = useTheme();

  const form = useForm<WebsiteSettingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      websiteName: "",
      websiteDescription: "",
      websiteLogo: "",
      websiteIcon: "",
      theme: "indigo",
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
          <h1 className="text-xl font-bold">{t("install.websiteSettings.basicInfo")}</h1>
          <FormField
            control={form.control}
            name="websiteName"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("install.websiteSettings.websiteName")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("install.websiteSettings.websiteNamePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="websiteDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("install.websiteSettings.websiteDescription")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("install.websiteSettings.websiteDescriptionPlaceholder")}
                    {...field}
                  />
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
                <FormLabel>{t("install.websiteSettings.websiteLogo")}</FormLabel>
                <FormControl>
                  <ImageUpload value={field.value} onChange={field.onChange} />
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
                <FormLabel>{t("install.websiteSettings.websiteIcon")}</FormLabel>
                <FormControl>
                  <ImageUpload value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger className="items-center hover:no-underline">
                  <Settings2 className="mr-1 size-4" />
                  {t("install.websiteSettings.moreSettings")}
                </AccordionTrigger>
                <AccordionContent className="h-fit space-y-6">
                  <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => {
                      const currentTheme = THEME_COLORS.find((t) => t.value === field.value);
                      const currentThemeLabel = currentTheme?.label || "Indigo";

                      return (
                        <FormItem>
                          <FormLabel>{t("install.websiteSettings.themeColor")}</FormLabel>
                          <FormControl>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button className="justify-between" variant="outline">
                                  <span className="flex items-center gap-2">
                                    <DropdownMenuShortcut>
                                      <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
                                    </DropdownMenuShortcut>
                                    {currentThemeLabel}
                                  </span>
                                  <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="flex w-fit flex-col">
                                <DropdownMenuLabel>
                                  {t("install.websiteSettings.currentTheme")}
                                </DropdownMenuLabel>
                                <ScrollThemeItems
                                  themeColor={themeColor}
                                  onSelect={(t) => {
                                    field.onChange(t);
                                    setThemeColor(t);
                                  }}
                                />
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default WebsiteSettingForm;
