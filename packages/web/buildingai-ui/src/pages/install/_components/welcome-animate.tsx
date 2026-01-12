import SplitText from "@buildingai/ui/components/effects/split-text";
import { Button } from "@buildingai/ui/components/ui/button";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { cn } from "@buildingai/ui/lib/utils";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const WelcomeAnimate = ({ step, setStep }: { step: number; setStep: (step: number) => void }) => {
  const { confirm } = useAlertDialog();

  return (
    <div className={cn("flex flex-col items-center gap-8", { hidden: step !== 0 })}>
      <div className="flex w-fit flex-col items-start lg:flex-row lg:gap-4">
        <SplitText
          text="Hello,"
          className="h-10 text-center text-3xl font-bold sm:h-14 sm:text-5xl md:h-17 md:text-6xl lg:h-20 lg:text-7xl"
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
            className="h-10 text-3xl font-bold sm:h-14 sm:text-5xl md:h-17 md:text-6xl lg:h-20 lg:text-7xl"
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
            text="BuildingAI !"
            className="text-primary h-10 text-3xl font-bold sm:h-14 sm:text-5xl md:h-17 md:text-6xl lg:h-20 lg:text-7xl"
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

      <div className="text-muted-foreground px-4 text-center">
        强大的开源企业智能体搭建平台，点击下方开始安装，快速开始您的智能体之旅
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" asChild>
          <Link to="https://doc.buildingai.cc/">
            访问文档
            <ExternalLink />
          </Link>
        </Button>
        <Button
          onClick={async () => {
            await confirm({
              title: "政策协议",
              description: (
                <span>
                  我已认真阅读并同意{" "}
                  <a
                    className="text-primary hover:underline"
                    href="https://github.com/BidingCC/BuildingAI/blob/master/PRIVACY_NOTICE.md"
                    target="_blank"
                  >
                    《隐私协议》
                  </a>
                  和
                  <a
                    className="text-primary hover:underline"
                    href="https://github.com/BidingCC/BuildingAI/blob/master/LICENSE"
                    target="_blank"
                  >
                    《开源协议》
                  </a>
                </span>
              ),
            });
            setStep(1);
          }}
        >
          开始安装
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
};

export default WelcomeAnimate;
