import { useI18n } from "@buildingai/i18n";
import {
  type InitializeStatusRequest,
  useCheckInitializeStatus,
  useInitializeMutation,
} from "@buildingai/services/shared";
import { useAuthStore, useConfigStore } from "@buildingai/stores";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { cn } from "@buildingai/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ChevronsUpDown, Languages } from "lucide-react";
import { useCallback, useState } from "react";
import { Navigate } from "react-router-dom";

import AppLogo from "@/components/app-logo";

import AdminAccountForm, { type AdminAccountFormValues } from "./_components/admiin-account-form";
import InitialSuccess from "./_components/initial-success";
import WebsiteSettingForm, {
  type WebsiteSettingFormValues,
} from "./_components/website-setting-form";
import WelcomeAnimate from "./_components/welcome-animate";

const LOCALE_LABELS: Record<string, string> = {
  "en-US": "English",
  "zh-CN": "简体中文",
};

const InstallPage = () => {
  const queryClient = useQueryClient();
  const { data: initStatus } = useCheckInitializeStatus();
  const { setToken } = useAuthStore((state) => state.authActions);
  const { websiteConfig } = useConfigStore((state) => state.config);
  const { setIsInitialized } = useConfigStore((state) => state.configActions);
  const { locale, setLocale, availableLocales, t } = useI18n();

  const currentLocaleLabel = LOCALE_LABELS[locale] ?? locale;

  const [step, setStep] = useState(0);
  const [adminFormData, setAdminFormData] = useState<AdminAccountFormValues>();
  const [adminFormValid, setAdminFormValid] = useState(false);
  const [websiteFormData, setWebsiteFormData] = useState<WebsiteSettingFormValues>();
  const [websiteFormValid, setWebsiteFormValid] = useState(false);

  const initializeRequest: InitializeStatusRequest = {
    username: adminFormData?.username ?? "",
    password: adminFormData?.password ?? "",
    confirmPassword: adminFormData?.confirmPassword ?? "",
    email: adminFormData?.email,
    websiteName: websiteFormData?.websiteName,
    websiteDescription: websiteFormData?.websiteDescription,
    websiteLogo: websiteFormData?.websiteLogo,
    websiteIcon: websiteFormData?.websiteIcon,
    websiteTheme: websiteFormData?.theme,
  };

  const { mutate: initialize, isPending } = useInitializeMutation(initializeRequest, {
    onSuccess: (data) => {
      setToken(data.token);
      setIsInitialized(data?.isInitialized || false);
      setStep(3);
      queryClient.setQueryData(["initialize-status"], { isInitialized: true });
    },
  });

  const handleAdminFormChange = useCallback((values: AdminAccountFormValues, isValid: boolean) => {
    setAdminFormData(values);
    setAdminFormValid(isValid);
  }, []);

  const handleWebsiteFormChange = useCallback(
    (values: WebsiteSettingFormValues, isValid: boolean) => {
      setWebsiteFormData(values);
      setWebsiteFormValid(isValid);
    },
    [],
  );

  const handleNextStep = () => {
    if (step === 2) {
      initialize(initializeRequest);
    } else {
      setStep(step + 1);
    }
  };

  const canProceed = () => {
    if (step === 1) return adminFormValid;
    if (step === 2) return websiteFormValid;
    return true;
  };

  if (initStatus?.isInitialized && step !== 3) {
    return <Navigate to="/" />;
  }

  return (
    <div className="bg-muted relative flex h-dvh w-full items-center justify-center p-0 md:p-6">
      <div
        className={cn(
          "dark:bg-accent bg-background relative flex flex-col transition-[width,height] duration-500 md:rounded-xl",
          {
            "size-full": step === 0,
            "h-full w-full md:h-[85vh] md:w-6xl": step !== 0,
          },
        )}
      >
        <div className="flex w-full items-center justify-between p-4 md:p-6">
          <AppLogo desc={`version：${websiteConfig?.webinfo.version || "26.0.0"}`} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Languages />
                {currentLocaleLabel}
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableLocales.map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className="flex items-center gap-2"
                >
                  {LOCALE_LABELS[loc] ?? loc}
                  {locale === loc && (
                    <DropdownMenuShortcut>
                      <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <ScrollArea
            className="h-full"
            viewportClassName="[&>div]:block! [&>div]:h-full flex flex-col justify-center"
          >
            <WelcomeAnimate step={step} setStep={setStep} />
            <AdminAccountForm step={step} onChange={handleAdminFormChange} />
            <WebsiteSettingForm step={step} onChange={handleWebsiteFormChange} />
            <InitialSuccess step={step} />
          </ScrollArea>
        </div>

        {step !== 0 && step !== 3 && (
          <div className="flex w-full items-center justify-between p-4 md:p-6">
            <div>{t("install.navigation.stepProgress", { current: step, total: 2 })}</div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isPending}>
                <ArrowLeft />
                {t("install.navigation.previousStep")}
              </Button>
              <Button
                loading={isPending}
                onClick={handleNextStep}
                disabled={!canProceed() || isPending}
              >
                {step === 2
                  ? t("install.navigation.completeSetup")
                  : t("install.navigation.nextStep")}
                {!isPending && <ArrowRight />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallPage;
