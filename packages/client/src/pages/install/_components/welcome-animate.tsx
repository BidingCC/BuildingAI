import { useI18n } from "@buildingai/i18n";
import SplitText from "@buildingai/ui/components/effects/split-text";
import { Button } from "@buildingai/ui/components/ui/button";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { cn } from "@buildingai/ui/lib/utils";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const WelcomeAnimate = ({ step, setStep }: { step: number; setStep: (step: number) => void }) => {
  const { confirm } = useAlertDialog();
  const { t } = useI18n();

  return (
    <div
      className={cn("flex h-full flex-col items-center justify-center gap-8", {
        hidden: step !== 0,
      })}
    >
      <div className="flex w-fit flex-col items-start lg:gap-4 xl:flex-row">
        <SplitText
          text="Hello,"
          className="h-10 text-center text-2xl font-bold sm:h-14 sm:text-5xl md:h-17 md:text-6xl lg:h-20 lg:text-7xl"
          delay={100}
          duration={0.6}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="center"
        />
        <div className="flex w-fit items-center gap-4">
          <SplitText
            text="Welcome to"
            className="h-10 text-2xl font-bold whitespace-nowrap sm:h-14 sm:text-5xl md:h-17 md:text-6xl lg:h-20 lg:text-7xl"
            delay={100}
            duration={0.6}
            ease="power3.out"
            startDelay={0.9}
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"
          />
          <SplitText
            text="BuildingAI!"
            className="text-primary h-10 text-2xl font-bold sm:h-14 sm:text-5xl md:h-17 md:text-6xl lg:h-20 lg:text-7xl"
            delay={100}
            duration={0.6}
            ease="bounce.out"
            startDelay={2.0}
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"
          />
        </div>
      </div>

      <div className="text-muted-foreground px-4 text-center">{t("install.welcome.tagline")}</div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" asChild>
          <Link to="https://doc.buildingai.cc/" target="_blank">
            {t("install.welcome.visitDocs")}
            <ExternalLink />
          </Link>
        </Button>
        <Button
          onClick={async () => {
            await confirm({
              title: t("install.welcome.policyTitle"),
              description: (
                <span>
                  {t("install.welcome.privacyPolicy")}
                  <a
                    className="text-primary hover:underline"
                    href="https://github.com/BidingCC/BuildingAI/blob/master/PRIVACY_NOTICE.md"
                    target="_blank"
                  >
                    {t("install.welcome.privacyPolicy")}
                  </a>
                  {" " + t("install.welcome.openSourceLicense") + " "}
                  <a
                    className="text-primary hover:underline"
                    href="https://github.com/BidingCC/BuildingAI/blob/master/LICENSE"
                    target="_blank"
                  >
                    {t("install.welcome.openSourceLicense")}
                  </a>
                </span>
              ),
            });
            setStep(1);
          }}
        >
          {t("install.welcome.startInstall")}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
};

export default WelcomeAnimate;
