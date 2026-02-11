import { definePageMeta } from "@buildingai/hooks";
import { useDatasetTags, useSquareDatasetsInfiniteQuery } from "@buildingai/services/web";
import { InfiniteScroll } from "@buildingai/ui/components/infinite-scroll";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@buildingai/ui/components/ui/item";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { SidebarTrigger } from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const PAGE_SIZE = 20;

export const meta = definePageMeta({
  title: "知识库广场",
  description: "选择你想要的知识库",
  icon: "book-search",
});

const KnowledgeIndexPage = () => {
  const [keyword, setKeyword] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const { data: tagsData } = useDatasetTags();
  const tags = tagsData ?? [];

  const squareQuery = useSquareDatasetsInfiniteQuery(
    {
      pageSize: PAGE_SIZE,
      keyword: keyword.trim() || undefined,
      tagIds: selectedTagId ? [selectedTagId] : undefined,
    },
    { enabled: true },
  );

  const items = useMemo(
    () => squareQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [squareQuery.data?.pages],
  );
  const hasNextPage = squareQuery.hasNextPage ?? false;
  const isFetchingNextPage = squareQuery.isFetchingNextPage;

  const selectTag = (tagId: string) => {
    setSelectedTagId((prev) => (prev === tagId ? null : tagId));
  };

  const isTagSelected = (tagId: string) => selectedTagId === tagId;
  const badgeClass = (selected: boolean) =>
    cn(
      "h-9 cursor-pointer px-4 font-medium text-nowrap sm:font-normal",
      selected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
    );

  return (
    <ScrollArea className="h-dvh" viewportClassName="[&_>div]:block!">
      <div className="flex w-full flex-col items-center">
        <div className="flex h-13 w-full items-center px-2">
          <SidebarTrigger className="md:hidden" />
        </div>

        <div className="w-full max-w-4xl px-4 py-8 pt-12 sm:pt-20 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 max-sm:items-start sm:flex-row sm:px-3">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl">知识库广场</h1>
              <p className="text-muted-foreground text-sm">加入你喜爱的知识库进行交互</p>
            </div>
            <div className="max-sm:w-full">
              <InputGroup className="rounded-full">
                <InputGroupInput
                  placeholder="搜索知识库"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <div className="no-scrollbar mt-8 flex flex-nowrap gap-2 overflow-x-auto sm:px-3">
            <Badge
              className={badgeClass(selectedTagId === null)}
              onClick={() => setSelectedTagId(null)}
            >
              精选
            </Badge>
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                className={badgeClass(isTagSelected(tag.id))}
                onClick={() => selectTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>

          <div className="mt-6 sm:px-3">
            {squareQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">暂无知识库</p>
            ) : (
              <InfiniteScroll
                loading={isFetchingNextPage}
                hasMore={hasNextPage}
                onLoadMore={() => squareQuery.fetchNextPage()}
                emptyText=""
                showEmptyText={!hasNextPage}
              >
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {items.map((dataset) => {
                    const creator = (
                      dataset as {
                        creator?: {
                          id: string;
                          nickname: string | null;
                          avatar: string | null;
                        } | null;
                      }
                    )?.creator;
                    const displayName = creator?.nickname ?? "未知用户";
                    const initial = displayName.slice(0, 1).toUpperCase();
                    return (
                      <Item
                        key={dataset.id}
                        asChild
                        className="group/apps-item hover:bg-accent cursor-pointer px-0 transition-[padding] hover:px-4"
                      >
                        <Link to={`/datasets/${dataset.id}`}>
                          <ItemMedia>
                            <Avatar className="size-10">
                              <AvatarImage src={dataset.coverUrl ?? creator?.avatar ?? undefined} />
                              <AvatarFallback>{initial}</AvatarFallback>
                            </Avatar>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{dataset.name}</ItemTitle>
                            <ItemDescription>
                              {dataset.description?.trim() ?? displayName}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions className="opacity-0 group-hover/apps-item:opacity-100">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="rounded-full"
                              aria-label="进入"
                            >
                              <ChevronRight />
                            </Button>
                          </ItemActions>
                        </Link>
                      </Item>
                    );
                  })}
                </div>
              </InfiniteScroll>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default KnowledgeIndexPage;
