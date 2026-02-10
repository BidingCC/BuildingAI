import {
  type InitializeStatusRequest,
  useCheckInitializeStatus,
  useInitializeMutation,
} from "@buildingai/services/shared";
import { useAuthStore } from "@buildingai/stores";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { cn } from "@buildingai/ui/lib/utils";
import { ArrowLeft, ArrowRight, ChevronDown, Languages } from "lucide-react";
import { useCallback, useState } from "react";
import { Navigate } from "react-router-dom";

import AppLogo from "@/components/app-logo";

import AdminAccountForm, { type AdminAccountFormValues } from "./_components/admiin-account-form";
import InitialSuccess from "./_components/initial-success";
import WebsiteSettingForm, {
  type WebsiteSettingFormValues,
} from "./_components/website-setting-form";
import WelcomeAnimate from "./_components/welcome-animate";

const InstallPage = () => {
  const { data: initStatus } = useCheckInitializeStatus();
  const { setToken } = useAuthStore((state) => state.authActions);

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
  };

  const { mutate: initialize, isPending } = useInitializeMutation(initializeRequest, {
    onSuccess: (data) => {
      setToken(data.token);
      setStep(3);
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

  if (initStatus?.isInitialized) {
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
          <AppLogo desc={"version：25.0.1"} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Languages />
                中文
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>选择语言</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>中文</DropdownMenuItem>
              <DropdownMenuItem>English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <WelcomeAnimate step={step} setStep={setStep} />
          <AdminAccountForm step={step} onChange={handleAdminFormChange} />
          <WebsiteSettingForm step={step} onChange={handleWebsiteFormChange} />
          <InitialSuccess step={step} />
        </div>

        {step !== 0 && step !== 3 && (
          <div className="flex w-full items-center justify-between p-4 md:p-6">
            <div>{step}/2</div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isPending}>
                <ArrowLeft />
                上一步
              </Button>
              <Button
                loading={isPending}
                onClick={handleNextStep}
                disabled={!canProceed() || isPending}
              >
                {step === 2 ? "完成安装" : "下一步"}
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
