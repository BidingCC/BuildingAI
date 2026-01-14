import { Button } from "@buildingai/ui/components/ui/button";
import { Home, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Error504 = ({ statusText }: { statusText: string }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (location.pathname.includes("/console")) {
      navigate("/console/dashboard");
    } else {
      navigate("/");
    }
  };
  return (
    <div className="in-[.bd-console-layout]:h-inset flex h-dvh flex-1 flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold">Gateway Timeout</h1>
      <p className="mt-4 mb-6">{statusText}</p>
      <div className="flex gap-4">
        <Button onClick={() => location.reload()}>
          <RotateCcw />
          重新加载
        </Button>
        <Button onClick={() => handleGoHome()}>
          <Home />
          返回首页
        </Button>
      </div>
    </div>
  );
};

export default Error504;
