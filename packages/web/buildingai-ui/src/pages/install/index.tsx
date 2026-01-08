import { useInitializeStatus } from "@buildingai/services/shared";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { cn } from "@buildingai/ui/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Languages,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import AppLogo from "@/components/app-logo";
import SplitText from "@/components/effects/split-text";

import AdminAccountForm from "./_components/admiin-account-form";
import InitialSuccess from "./_components/initial-success";
import WebsiteSettingForm from "./_components/website-setting-form";
import WelcomeAnimate from "./_components/welcome-animate";

const InstallPage = () => {
  const { confirm } = useAlertDialog();
  // const { data } = useInitializeStatus();
  const [step, setStep] = useState(3);

  // if (data?.isInitialized) {
  //   return <Navigate to="/" />;
  // }

  return (
    <div className="bg-muted relative flex h-screen w-full items-center justify-center p-0 md:p-6">
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
          <AdminAccountForm step={step} />
          <WebsiteSettingForm step={step} />
          <InitialSuccess step={step} />
        </div>

        {step !== 0 && step !== 3 && (
          <div className="flex w-full items-center justify-between p-4 md:p-6">
            <div>{step}/5</div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft />
                上一步
              </Button>
              <Button onClick={() => setStep(step + 1)}>
                下一步
                <ArrowRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallPage;
