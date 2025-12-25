import { useAuthStore } from "@buildingai/stores";
import { ModeToggle } from "@buildingai/ui/components/mode-toggle";
import { ThemeToggle } from "@buildingai/ui/components/theme-toggle";
import { Button } from "@buildingai/ui/components/ui/button";
import { Link } from "react-router-dom";

const IndexPage = () => {
  const { logout } = useAuthStore((state) => state.authActions);
  return (
    <div className="flex">
      <ModeToggle />
      <ThemeToggle />
      <Button asChild>
        <Link to={"/console"}>Go to Console</Link>
      </Button>
      <Button onClick={() => logout()}>Logout</Button>
    </div>
  );
};

export default IndexPage;
