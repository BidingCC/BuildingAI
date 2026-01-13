import { useAuthStore, useConfigStore } from "@buildingai/stores";
import { Navigate } from "react-router-dom";

import SvgIcons from "../../components/svg-icons";
import { LoginForm } from "./_components/login-form";

const LoginPage = () => {
  const { isLogin } = useAuthStore((state) => state.authActions);
  const { websiteConfig } = useConfigStore((state) => state.config);

  if (isLogin()) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          {websiteConfig?.webinfo.logo ? (
            <div className="flex items-center gap-2">
              <img className="h-8" src={websiteConfig?.webinfo.logo} alt="logo" />
              <span className="text-xl font-bold">{websiteConfig?.webinfo.name}</span>
            </div>
          ) : (
            <SvgIcons.buildingaiFull className="h-8" />
          )}
        </a>
        <LoginForm />
      </div>
    </div>
  );
};

export { LoginPage };
