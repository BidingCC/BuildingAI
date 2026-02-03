import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { SORT_OPTIONS } from "../../constants";
import type { DocumentSortBy } from "../../types";

export interface DocumentToolbarProps {
  contentCount?: number;
  totalSize?: string;
  sortBy?: DocumentSortBy;
  onSortChange?: (value: DocumentSortBy) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  searchExpanded?: boolean;
  onSearchExpandedChange?: (expanded: boolean) => void;
  /** 右侧插槽（用于批量操作按钮） */
  rightSlot?: ReactNode;
}

export function DocumentToolbar({
  contentCount = 0,
  totalSize = "0KB",
  sortBy = "name",
  onSortChange,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  searchExpanded: searchExpandedProp,
  onSearchExpandedChange,
  rightSlot,
}: DocumentToolbarProps) {
  const [searchExpandedInternal, setSearchExpandedInternal] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchValue);

  const searchExpanded = searchExpandedProp ?? searchExpandedInternal;

  const setSearchExpanded = (v: boolean) => {
    onSearchExpandedChange?.(v);
    if (searchExpandedProp === undefined) setSearchExpandedInternal(v);
  };

  const handleSearchClick = () => setSearchExpanded(true);

  const handleSearchClose = () => {
    setSearchExpanded(false);
    setLocalSearch("");
    onSearchChange?.("");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearchSubmit?.(localSearch);
      onSearchChange?.(localSearch);
    }
  };

  if (searchExpanded) {
    return (
      <header className="flex h-16 shrink-0 items-center gap-2 px-4">
        <div className="flex w-full items-center gap-2">
          <InputGroup className="flex-1 px-0 shadow-none! ring-0 focus-within:ring-0! focus-visible:ring-0!">
            <InputGroupInput
              placeholder="搜索"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
            <InputGroupAddon>
              <Search className="size-3" />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Button
                onClick={handleSearchClose}
                variant="ghost"
                size="icon-xs"
                aria-label="关闭搜索"
              >
                <X className="size-4" />
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <div className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
        {contentCount}个内容 / {totalSize}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {rightSlot ?? (
          <>
            <SortDropdown sortBy={sortBy} onSortChange={onSortChange} />
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleSearchClick}
              aria-label="搜索"
            >
              <Search className="size-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

// 排序下拉菜单子组件
function SortDropdown({
  sortBy,
  onSortChange,
}: {
  sortBy: DocumentSortBy;
  onSortChange?: (value: DocumentSortBy) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 border-0 text-xs font-normal shadow-none">
          排序
          <ChevronDown className="size-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SORT_OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt.value} onClick={() => onSortChange?.(opt.value)}>
            {opt.label}
            {sortBy === opt.value && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
