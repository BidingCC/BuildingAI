import { ModeToggle } from "@buildingai/ui/components/mode-toggle";
import { ThemeToggle } from "@buildingai/ui/components/theme-toggle";
import { GalleryVerticalEnd } from "lucide-react";

import { LoginForm } from "./_components/LoginForm";

const LoginPage = () => {
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
        <ModeToggle />
        <ThemeToggle />
      </div>
    </div>
  );
};

export { LoginPage };
