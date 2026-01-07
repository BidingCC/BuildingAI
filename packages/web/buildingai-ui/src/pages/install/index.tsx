import { useInitializeStatus } from "@buildingai/services/shared";
import { Navigate } from "react-router-dom";

const InstallPage = () => {
  const { data } = useInitializeStatus();

  if (data?.isInitialized) {
    return <Navigate to="/" />;
  }

  return <div>InstallPage</div>;
};

export default InstallPage;
