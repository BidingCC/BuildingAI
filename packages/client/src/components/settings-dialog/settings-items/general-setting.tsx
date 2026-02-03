import { type FontSize, useUserConfigStore } from "@buildingai/stores";
import { THEME_COLORS, useTheme } from "@buildingai/ui/components/theme-provider";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { cn } from "@buildingai/ui/lib/utils";
import { Check, ChevronsUpDown, Laptop, Moon, Sun } from "lucide-react";
import { useCallback } from "react";

import { SettingItem, SettingItemGroup } from "../setting-item";

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "xs", label: "小号" },
  { value: "sm", label: "较小" },
  { value: "md", label: "默认" },
  { value: "lg", label: "较大" },
  { value: "xl", label: "特大" },
];

const THEME_MODE_OPTIONS = [
  { value: "light", label: "浅色模式", icon: Sun },
  { value: "dark", label: "深色模式", icon: Moon },
  { value: "system", label: "跟随系统", icon: Laptop },
] as const;

const GeneralSetting = () => {
  const { setFontSize } = useUserConfigStore((s) => s.userConfigActions);
  const fontSize =
    useUserConfigStore((s) => s.userConfig.configs?.appearance?.fontSize as FontSize) ?? "md";

  const { theme, setTheme, themeColor, setThemeColor } = useTheme();

  const handleFontSizeChange = useCallback(
    (size: FontSize) => {
      setFontSize(size);
    },
    [setFontSize],
  );

  const fontSizeLabel = FONT_SIZE_OPTIONS.find((opt) => opt.value === fontSize)?.label ?? "默认";
  const themeModeLabel = THEME_MODE_OPTIONS.find((opt) => opt.value === theme)?.label ?? "跟随系统";
  const themeColorLabel = THEME_COLORS.find((t) => t.value === themeColor)?.label ?? "默认";

  return (
    <div className="flex flex-col gap-4">
      <SettingItemGroup label="外观">
        <SettingItem title="主题配色" description="选择界面的主题配色方案">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`theme-${themeColor}`}>
                <div className="bg-primary size-3 rounded-full" />
                {themeColorLabel}
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>选择配色 ({THEME_COLORS.length})</DropdownMenuLabel>
              <ScrollArea className="h-72">
                {THEME_COLORS.map((t) => (
                  <DropdownMenuItem
                    key={t.value}
                    onClick={() => setThemeColor(t.value)}
                    className={cn(
                      "flex items-center gap-2",
                      t.value === themeColor && "font-medium",
                      `theme-${t.value}`,
                    )}
                  >
                    <div
                      className={cn(
                        "bg-primary flex size-3 items-center justify-center rounded-full",
                        themeColor === t.value && "ring-primary/15 ring-2",
                      )}
                    >
                      {themeColor === t.value && (
                        <Check className="text-primary-foreground size-2" />
                      )}
                    </div>
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingItem>

        <SettingItem title="主题模式" description="选择浅色、深色或跟随系统">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {themeModeLabel}
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {THEME_MODE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className="flex items-center gap-2"
                >
                  <option.icon className="size-4" />
                  {option.label}
                  {theme === option.value && (
                    <DropdownMenuShortcut>
                      <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingItem>

        <SettingItem title="字体大小" description="调整界面整体字体大小">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {fontSizeLabel}
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {FONT_SIZE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleFontSizeChange(option.value)}
                  className="flex items-center gap-2"
                >
                  {option.label}
                  {fontSize === option.value && (
                    <DropdownMenuShortcut>
                      <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingItem>
      </SettingItemGroup>

      <SettingItemGroup label="语言和区域">
        <SettingItem title="语言" description="选择界面显示语言">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                简体中文
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="flex items-center gap-2">
                简体中文
                <DropdownMenuShortcut>
                  <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingItem>
      </SettingItemGroup>
    </div>
  );
};

export { GeneralSetting };
