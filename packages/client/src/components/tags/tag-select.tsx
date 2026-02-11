import type { TagTypeType } from "@buildingai/constants";
import { useConsoleTagsQuery } from "@buildingai/services/console";
import { useDatasetTags } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Check, ChevronDown, Tag, Tags, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  placeholder = "搜索",
  showManage: showManageProp,
  tagsSource = "console",
  "data-testid": dataTestId,
}: TagSelectProps) {
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const isWeb = tagsSource === "web";
  const showManage = showManageProp ?? !isWeb;

  const consoleTags = useConsoleTagsQuery(type, { enabled: open && !isWeb });
  const webTags = useDatasetTags();
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
    (e: React.MouseEvent) => {
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
                <span className="truncate text-sm">{value.length} 个标签</span>
              ) : (
                <span className="text-muted-foreground truncate text-sm">全部标签</span>
              )}
              {value.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="size-5 shrink-0 p-0"
                  onClick={handleClear}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </span>
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" side="bottom" sideOffset={8} className="w-64 p-2">
          <div className="flex flex-col gap-2">
            <Input
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-8 shadow-none focus-visible:ring-0"
            />
            <div className="flex flex-col gap-0.5">
              {tagsLoading ? (
                <p className="text-muted-foreground py-4 text-center text-sm">加载中…</p>
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
                  <span>暂无标签</span>
                </div>
              )}
            </div>
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
                  管理标签
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
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
