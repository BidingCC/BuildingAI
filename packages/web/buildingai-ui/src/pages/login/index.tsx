import { useAuthStore } from "@buildingai/stores";
import { GalleryVerticalEnd } from "lucide-react";
import { Navigate } from "react-router-dom";

import { LoginForm } from "./_components/login-form";

const LoginPage = () => {
  const { isLogin } = useAuthStore((state) => state.authActions);

  if (isLogin()) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          BuildingAI
        </a>
        <LoginForm />
      </div>
    </div>
  );
};

export { LoginPage };
