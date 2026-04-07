import { useI18n } from "@buildingai/i18n";
import SvgIcons from "@buildingai/ui/components/svg-icons";
import { Button } from "@buildingai/ui/components/ui/button";
import { cn } from "@buildingai/ui/lib/utils";
import { ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const InitialSuccess = ({ step }: { step: number }) => {
  const { t } = useI18n();
  return (
    <div className={cn("flex h-full flex-col items-center justify-center", { hidden: step !== 3 })}>
      <SvgIcons.circleCheckFilled className="size-22 fill-green-500" />
      <h1 className="mt-4 text-2xl">{t("install.success.title")}</h1>
      <p className="text-muted-foreground mt-2">{t("install.success.subtitle")}</p>

      <div className="mt-6 flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link to="/">
            {t("install.success.visit")}
            <ExternalLink />
          </Link>
        </Button>
        <Button asChild>
          <Link to="/console/dashboard">
            {t("install.success.goToConsole")}
            <ChevronRight />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default InitialSuccess;
