import { Button } from "@buildingai/ui/components/ui/button";
import { cn } from "@buildingai/ui/lib/utils";
import { CheckCircle2, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const InitialSuccess = ({ step }: { step: number }) => {
  return (
    <div className={cn("flex flex-col items-center justify-center", { hidden: step !== 3 })}>
      <CheckCircle2 className="size-22 text-green-500" />
      <h1 className="mt-4 text-2xl">系统初始化完成</h1>
      <p className="text-muted-foreground mt-2">您现在可以开始使用 BuildingAI 了</p>
      <div className="mt-4 flex items-center gap-4">
        <Button variant="outline">
          <Link to="/">
            访问前台
            <ExternalLink />
          </Link>
        </Button>
        <Button>
          <Link to="/console/dashboard">
            前往工作台
            <ChevronRight />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default InitialSuccess;
