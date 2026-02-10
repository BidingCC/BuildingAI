import { Button } from "@buildingai/ui/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFoundPage = () => {
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
      <h1 className="text-8xl font-bold">404</h1>
      <p className="mt-4 mb-6">页面走丢了～请检查路径是否拼写正确或联系站点管理员处理</p>
      <div className="flex gap-4">
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft />
          上一页
        </Button>
        <Button onClick={() => handleGoHome()}>
          <Home />
          返回首页
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
