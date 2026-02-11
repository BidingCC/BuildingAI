import { useAuthStore } from "@buildingai/stores";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const AuthGuard = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const { isLogin } = useAuthStore((state) => state.authActions);
  if (isLogin()) {
    return children || <Outlet />;
  }
  return (
    <Navigate
      to={{ pathname: "/login", search: `?redirect=${encodeURIComponent(location.pathname)}` }}
      replace
      state={{ redirect: location.pathname }}
    />
  );
};

export default AuthGuard;
