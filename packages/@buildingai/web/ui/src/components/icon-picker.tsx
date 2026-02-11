import { Button } from "@buildingai/ui/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowUp, Check, ChevronsUpDown, Search, X } from "lucide-react";
import { type IconName, iconNames } from "lucide-react/dynamic";
import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";

import { LucideIcon } from "./lucide-icon";

const GRID_COLS = 8;
const ROW_HEIGHT = 36;
const allIconNames = iconNames as string[];

/**
 * Virtualized icon grid, mounted only when popover is open
 * to guarantee the scroll container ref is available on init.
 */
function IconGrid({ value, onSelect }: { value?: string; onSelect: (name: string) => void }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredIcons = useMemo(() => {
    if (!deferredSearch) return allIconNames;
    const keyword = deferredSearch.toLowerCase();
    return allIconNames.filter((name) => name.includes(keyword));
  }, [deferredSearch]);

  const rowCount = Math.ceil(filteredIcons.length / GRID_COLS);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  });

  return (
    <>
      <div className="p-2 pb-1">
        <InputGroup className="bg-muted h-8 border-transparent">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="搜索图标..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs"
            autoFocus
          />
        </InputGroup>
      </div>

      <ScrollArea viewportClassName="p-2 pt-1" viewportRef={scrollRef} className="h-64">
        {filteredIcons.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            未找到匹配的图标
          </div>
        ) : (
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const startIdx = virtualRow.index * GRID_COLS;
              const rowIcons = filteredIcons.slice(startIdx, startIdx + GRID_COLS);

              return (
                <div
                  key={virtualRow.index}
                  className="absolute left-0 grid w-full grid-cols-8 gap-0.5"
                  style={{
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {rowIcons.map((iconName) => {
                    const isSelected = value === iconName;
                    return (
                      <Tooltip delayDuration={300} key={iconName}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title={iconName}
                            className={cn(
                              "hover:bg-accent flex items-center justify-center rounded-md transition-colors",
                              isSelected && "bg-accent ring-ring ring-1",
                            )}
                            style={{ height: ROW_HEIGHT - 4 }}
                            onClick={() => onSelect(iconName)}
                          >
                            {isSelected ? (
                              <Check className="size-4" />
                            ) : (
                              <LucideIcon name={iconName as IconName} className="size-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{iconName}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {filteredIcons.length > 0 && (
        <div className="text-muted-foreground border-muted flex items-center justify-between border-t p-1.5">
          <span className="text-[10px]">Total {filteredIcons.length} icons</span>
          <Button
            asChild
            variant="ghost"
            size="xs"
            className="text-[10px]"
            onClick={() => {
              scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span>
              <ArrowUp className="size-3" />
              Back to top
            </span>
          </Button>
        </div>
      )}
    </>
  );
}

interface IconPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  container?: HTMLElement | null;
}

/**
 * Icon picker with virtualized grid and search.
 * Compatible with react-hook-form via value/onChange.
 */
export function IconPicker({
  value,
  onChange,
  placeholder = "选择图标",
  disabled = false,
  className,
  container,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (iconName: string) => {
      onChange?.(iconName);
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.("");
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "group/icon-picker-trigger",
            "h-9 w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
          disabled={disabled}
        >
          {value ? (
            <span className="flex items-center gap-2 truncate">
              <LucideIcon name={value as IconName} className="size-4 shrink-0" />
              <span className="truncate">{value}</span>
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
          <span className="flex items-center gap-1">
            {value && (
              <span
                role="button"
                tabIndex={-1}
                className="text-muted-foreground hover:text-foreground rounded-sm p-0.5 group-hover/icon-picker-trigger:opacity-100 group-focus-visible/icon-picker-trigger:opacity-100 md:opacity-0"
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e as any)}
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 gap-0 p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        {...(container ? { container } : {})}
      >
        <IconGrid value={value} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
