import { THEME_COLORS, ThemeColor, useTheme } from "@buildingai/ui/components/theme-provider";
import { Button } from "@buildingai/ui/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";
import { ScrollArea } from "./ui/scroll-area";

export function ThemeToggle() {
    const { themeColor, setThemeColor } = useTheme();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const timer = setTimeout(() => {
            const selectedItem = container.querySelector("[data-selected=true]");

            if (selectedItem) {
                selectedItem.scrollIntoView({ block: "center" });
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [open]);

    return (
        <DropdownMenu onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <Palette className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Toggle theme color</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="flex w-fit flex-col">
                <DropdownMenuLabel>当前主题</DropdownMenuLabel>
                <ScrollThemeItems themeColor={themeColor} onSelect={setThemeColor} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const ScrollThemeItems = ({
    onSelect,
    themeColor,
}: {
    onSelect: (value: ThemeColor) => void;
    themeColor: ThemeColor;
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const timer = setTimeout(() => {
            const selectedItem = container.querySelector("[data-selected=true]");
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: "center" });
            }
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    return (
        <ScrollArea className="h-96" ref={scrollRef}>
            {THEME_COLORS.map((t) => (
                <DropdownMenuItem
                    key={t.value}
                    onClick={() => onSelect(t.value)}
                    className={cn(
                        t.value === themeColor ? "font-medium" : undefined,
                        `theme-${t.value}`,
                    )}
                    data-selected={t.value === themeColor}
                >
                    <div
                        className={cn(
                            "flex size-3 items-center justify-center rounded-full",
                            themeColor === t.value && "ring-primary/15 ring-2",
                            "bg-primary",
                        )}
                    >
                        {themeColor === t.value && <Check className="size-2 text-white" />}
                    </div>
                    {t.label}
                </DropdownMenuItem>
            ))}
        </ScrollArea>
    );
};
