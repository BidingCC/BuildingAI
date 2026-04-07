import type { TagTypeType } from "@buildingai/constants";
import { useConsoleTagsQuery } from "@buildingai/services/console";
import { useTagsQuery } from "@buildingai/services/web";
import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Check, ChevronDown, Tag, Tags, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ManageTagsDialog } from "./manage-tags-dialog";

export interface TagSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  type?: TagTypeType;
  onClose?: () => void;
  placeholder?: string;
  showManage?: boolean;
  tagsSource?: "web" | "console";
  "data-testid"?: string;
}

export function TagSelect({
  value,
  onChange,
  type = "app",
  onClose,
  showManage: showManageProp,
  tagsSource = "console",
  "data-testid": dataTestId,
}: TagSelectProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const popoverContainerRef = useRef<HTMLDivElement>(null);

  const isWeb = tagsSource === "web";
  const showManage = showManageProp ?? !isWeb;

  const consoleTags = useConsoleTagsQuery(type, { enabled: open && !isWeb });
  const webTags = useTagsQuery(type);
  const tags = isWeb ? (webTags.data ?? []) : (consoleTags.data ?? []);
  const refetch = isWeb ? webTags.refetch : consoleTags.refetch;

  useEffect(() => {
    if (!open) onClose?.();
  }, [open, onClose]);

  const handleSelect = useCallback(
    (tag: { id: string; name: string }) => {
      const next = value.includes(tag.id)
        ? value.filter((id) => id !== tag.id)
        : [...value, tag.id];
      onChange(next);
    },
    [value, onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      onChange([]);
    },
    [onChange],
  );

  const handleManageClose = useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredTags = useMemo(() => {
    if (!inputValue.trim()) return tags;
    const q = inputValue.trim().toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, inputValue]);

  const tagsLoading = isWeb ? webTags.isLoading : consoleTags.isLoading;

  return (
    <>
      <div ref={popoverContainerRef}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between gap-2 sm:w-auto"
              data-testid={dataTestId}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Tag className="size-4 shrink-0" />
                {value.length > 0 ? (
                  <span className="truncate text-sm">{t("common.tags.selectedCount", { count: value.length })}</span>
                ) : (
                  <span className="text-muted-foreground truncate text-sm">{t("common.tags.noTags")}</span>
                )}
                {value.length > 0 && (
                  <Button asChild variant="ghost" size="xs" className="size-5 shrink-0 p-0">
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={t("common.tags.clearSelected")}
                      onClick={handleClear}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onChange([]);
                        }
                      }}
                    >
                      <X className="size-3.5" />
                    </span>
                  </Button>
                )}
              </span>
              <ChevronDown className="text-muted-foreground size-4 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            side="bottom"
            sideOffset={8}
            container={popoverContainerRef.current}
            className="w-64 p-2"
          >
            <div className="flex flex-col gap-2">
              <Input
                placeholder={t("common.tags.searchPlaceholder")}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="h-8 shadow-none focus-visible:ring-0"
              />
              <ScrollArea className="max-h-72" viewportClassName="max-h-72">
                <div className="flex flex-col gap-0.5">
                  {tagsLoading ? (
                    <p className="text-muted-foreground py-4 text-center text-sm">{t("loading")}</p>
                  ) : filteredTags.length > 0 ? (
                    filteredTags.map((tag) => (
                      <Button
                        key={tag.id}
                        type="button"
                        variant="ghost"
                        className="justify-between"
                        onClick={() => handleSelect(tag)}
                      >
                        <span>{tag.name}</span>
                        {value.includes(tag.id) && <Check className="size-4" />}
                      </Button>
                    ))
                  ) : (
                    <div className="text-muted-foreground flex h-20 flex-col items-center justify-center gap-2 text-sm">
                      <Tags className="size-5" />
                      <span>{t("common.tags.noTags")}</span>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {showManage && (
                <>
                  <Separator className="border-border h-0! border-t border-dashed bg-transparent" />
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setOpen(false);
                      setManageOpen(true);
                    }}
                  >
                    <Tags className="size-4" />
                    {t("common.tags.manageTags")}
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {showManage && (
        <ManageTagsDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          type={type}
          onClose={handleManageClose}
        />
      )}
    </>
  );
}
