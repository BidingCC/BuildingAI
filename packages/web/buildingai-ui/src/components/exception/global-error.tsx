import { Button } from "@buildingai/ui/components/ui/button";
import { ArrowLeft, Home, RotateCcw } from "lucide-react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import Error401 from "./errors/401";
import Error403 from "./errors/403";
import Error404 from "./errors/404";
import Error500 from "./errors/500";
import Error502 from "./errors/502";
import Error504 from "./errors/504";

const GlobalError = () => {
  const navigate = useNavigate();
  const error = useRouteError();

  console.log("进来了", error, isRouteErrorResponse(error));

  const handleGoHome = () => {
    if (location.pathname.includes("/console")) {
      navigate("/console/dashboard");
    } else {
      navigate("/");
    }
  };

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <div className="in-[.bd-console-layout]:h-inset flex h-screen flex-1 flex-col items-center justify-center p-4">
          <h1 className="text-8xl font-bold">{error.status}</h1>
          <p className="mt-4 mb-6">{error.data}</p>
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
      </div>
    );
  }

  if (error instanceof Response) {
    console.log("进来2了", JSON.stringify(error));
    switch (error.status) {
      case 401:
        console.info("123");

        return <Error401 statusText={error.statusText} />;
      case 403:
        return <Error403 statusText={error.statusText} />;
      case 404:
        return <Error404 statusText={error.statusText} />;
      case 500:
        return <Error500 statusText={error.statusText} />;
      case 502:
        return <Error502 statusText={error.statusText} />;
      case 504:
        return <Error504 statusText={error.statusText} />;
      default:
        return (
          <div>
            <div className="in-[.bd-console-layout]:h-inset flex h-screen flex-1 flex-col items-center justify-center p-4">
              <h1 className="text-8xl font-bold">{error.status}</h1>
              <p className="mt-4 mb-6">{error.statusText}</p>
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
          </div>
        );
    }
  }

  if (error instanceof Error) {
    return (
      <div>
        <div className="in-[.bd-console-layout]:h-inset flex h-screen flex-1 flex-col items-center justify-center p-4">
          <h1 className="text-4xl font-bold">{error.name || "出了一点小问题~"}</h1>
          <p className="mt-4 mb-6">{error.message || "请尝试重新操作，或者联系网站管理员处理"}</p>
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
      </div>
    );
  }

  return (
    <div>
      <div className="in-[.bd-console-layout]:h-inset flex h-screen flex-1 flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold">未知错误</h1>
        <p className="mt-4 mb-6">
          {JSON.stringify(error || {}) || "请尝试重新操作，或者联系网站管理员处理"}
        </p>
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
    </div>
  );
};

export default GlobalError;
