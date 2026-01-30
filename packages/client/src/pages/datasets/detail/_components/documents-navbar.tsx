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
import { useState } from "react";

export type DocumentsSortBy = "name" | "size" | "uploadTime";

const SORT_OPTIONS: { value: DocumentsSortBy; label: string }[] = [
  { value: "name", label: "文件名称" },
  { value: "size", label: "文件大小" },
  { value: "uploadTime", label: "上传时间" },
];

export interface DocumentsNavbarProps {
  contentCount?: number;
  totalSize?: string;
  sortBy?: DocumentsSortBy;
  onSortChange?: (value: DocumentsSortBy) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  /** 搜索展开时由父组件控制，用于隐藏上传区 */
  searchExpanded?: boolean;
  onSearchExpandedChange?: (expanded: boolean) => void;
  /** 未搜索时右侧插槽，用于多选时的批量操作按钮（移动、删除、复制） */
  rightSlot?: React.ReactNode;
}

export function DocumentsNavbar({
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
}: DocumentsNavbarProps) {
  const [searchExpandedInternal, setSearchExpandedInternal] = useState(false);
  const searchExpanded = searchExpandedProp ?? searchExpandedInternal;
  const setSearchExpanded = (v: boolean) => {
    onSearchExpandedChange?.(v);
    if (searchExpandedProp === undefined) setSearchExpandedInternal(v);
  };
  const [localSearch, setLocalSearch] = useState(searchValue);

  const handleSearchClick = () => {
    setSearchExpanded(true);
  };

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

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      {searchExpanded ? (
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
      ) : (
        <>
          <div className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
            {contentCount}个内容 / {totalSize}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {rightSlot != null ? (
              rightSlot
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 border-0 text-xs font-normal shadow-none"
                    >
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
        </>
      )}
    </header>
  );
}
