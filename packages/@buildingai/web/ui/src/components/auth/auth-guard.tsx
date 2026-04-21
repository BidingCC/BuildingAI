import { useAuthStore } from "@buildingai/stores";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const isDev = import.meta.env.DEV;
const devBase = import.meta.env.VITE_DEVELOP_APP_BASE_URL;

const isPluginPath = window.location.pathname.includes("/extension/");

const AuthGuard = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const { isLogin } = useAuthStore((state) => state.authActions);
  const redirect = `${location.pathname}${location.search}${location.hash}`;

  if (isLogin()) {
    return children || <Outlet />;
  }

  if (isPluginPath && isDev) {
    window.location.replace(
      `${devBase}/login?redirect=${encodeURIComponent(window.location.href)}`,
    );
    return null;
  }

  return (
    <Navigate
      to={{ pathname: "/login", search: `?redirect=${encodeURIComponent(redirect)}` }}
      replace
      state={{ redirect }}
    />
  );
};

export default AuthGuard;
