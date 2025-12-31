import { useTheme } from "@buildingai/ui/components/theme-provider";
import { Button } from "@buildingai/ui/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Laptop, Moon, Sun } from "lucide-react";

export function ModeToggle({
    children,
    align = "end",
    side = "bottom",
}: {
    children?: React.ReactNode;
    align?: "center" | "end" | "start" | undefined;
    side?: "top" | "bottom" | "left" | "right";
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {children ? (
                    children
                ) : (
                    <Button variant="outline" size="icon">
                        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} side={side}>
                <ModeItems />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export const ModeItems = () => {
    const { setTheme, theme } = useTheme();

    return (
        <>
            <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun />
                Light
                {theme === "light" ? (
                    <DropdownMenuShortcut>
                        <div className="bg-primary ring-primary/15 size-1 rounded-full ring-2" />
                    </DropdownMenuShortcut>
                ) : null}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon />
                Dark
                {theme === "dark" ? (
                    <DropdownMenuShortcut>
                        <div className="bg-primary ring-primary/15 size-1 rounded-full ring-2" />
                    </DropdownMenuShortcut>
                ) : null}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
                <Laptop />
                System
                {theme === "system" ? (
                    <DropdownMenuShortcut>
                        <div className="bg-primary ring-primary/15 size-1 rounded-full ring-2" />
                    </DropdownMenuShortcut>
                ) : null}
            </DropdownMenuItem>
        </>
    );
};
