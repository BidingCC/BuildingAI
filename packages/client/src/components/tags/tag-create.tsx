import type { TagTypeType } from "@buildingai/constants";
import {
  type ConsoleTag,
  useConsoleTagsQuery,
  useCreateConsoleTagMutation,
} from "@buildingai/services/console";
import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Check, ChevronDown, Plus, Tag, Tags } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ManageTagsDialog } from "./manage-tags-dialog";

export interface TagCreateProps {
  value: string[];
  onChange: (value: string[]) => void;
  type?: TagTypeType;
  onClose?: () => void;
  searchOrCreatePlaceholder?: string;
  "data-testid"?: string;
}

export function TagCreate({
  value,
  onChange,
  type = "app",
  onClose,
  searchOrCreatePlaceholder = "搜索或创建",
  "data-testid": dataTestId,
}: TagCreateProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const { data: tags = [], refetch } = useConsoleTagsQuery(type, { enabled: open });
  const createMutation = useCreateConsoleTagMutation(type);

  useEffect(() => {
    if (!open) onClose?.();
  }, [open, onClose]);

  const handleSelect = useCallback(
    (tag: ConsoleTag) => {
      const next = value.includes(tag.id)
        ? value.filter((id) => id !== tag.id)
        : [...value, tag.id];
      onChange(next);
    },
    [value, onChange],
  );

  const canCreate = useMemo(() => {
    const name = inputValue.trim();
    if (!name) return false;
    return !tags.some((t) => t.name.toLowerCase() === name.toLowerCase());
  }, [inputValue, tags]);

  const handleCreate = useCallback(() => {
    const name = inputValue.trim();
    if (!name || !canCreate) return;
    createMutation.mutate(
      { name },
      {
        onSuccess: (created) => {
          onChange([...value, created.id]);
          setInputValue("");
          refetch();
        },
      },
    );
  }, [inputValue, canCreate, createMutation, value, onChange, refetch]);

  const handleManageClose = useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredTags = useMemo(() => {
    if (!inputValue.trim()) return tags;
    const q = inputValue.trim().toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, inputValue]);

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
                <span className="truncate text-sm">{t("common.tags.selectedCount", { count: value.length })}</span>
              ) : (
                <span className="text-muted-foreground truncate text-sm">{t("common.tags.noTags")}</span>
              )}
            </span>
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" side="bottom" sideOffset={8} className="w-64 p-2">
          <div className="flex flex-col gap-2">
            <Input
              placeholder={searchOrCreatePlaceholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-8"
            />
            <div className="flex flex-col gap-0.5 pt-1">
              {canCreate && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start gap-2"
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    <Plus className="size-4" />
                    {t("common.tags.createTag", { name: inputValue.trim() })}
                  </Button>
                  {filteredTags.length > 0 && (
                    <Separator className="border-border my-1 h-0! border-t border-dashed bg-transparent" />
                  )}
                </>
              )}
              {filteredTags.length > 0 ? (
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
              ) : !canCreate && !inputValue ? (
                <div className="text-muted-foreground flex h-20 flex-col items-center justify-center gap-2 text-sm">
                  <Tags className="size-5" />
                  <span>{t("common.tags.noTags")}</span>
                </div>
              ) : null}
            </div>
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
          </div>
        </PopoverContent>
      </Popover>
      <ManageTagsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        type={type}
        onClose={handleManageClose}
      />
    </>
  );
}
