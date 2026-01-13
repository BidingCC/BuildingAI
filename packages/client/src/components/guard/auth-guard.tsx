import { useAuthStore } from "@buildingai/stores";
import { Navigate, Outlet } from "react-router-dom";

const AuthGuard = () => {
  const { isLogin } = useAuthStore((state) => state.authActions);
  if (isLogin()) {
    return <Outlet />;
  }

  return <Navigate to="/login" replace state={{ redirect: location.pathname }} />;
};

export default AuthGuard;
