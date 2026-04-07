import { definePageMeta, useDocumentHead } from "@buildingai/hooks";
import { useI18n } from "@buildingai/i18n";
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
import { cn } from "@buildingai/ui/lib/utils";
import { ChevronLeft, ChevronRight, FileText, Loader2, Search, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDebounceValue } from "usehooks-ts";

const PAGE_SIZE = 20;

export const meta = definePageMeta({
  title: "Knowledge Square",
  description: "Choose the knowledge base you want",
  icon: "book-search",
});

const KnowledgeIndexPage = () => {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const tagScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollTagsLeft, setCanScrollTagsLeft] = useState(false);
  const [canScrollTagsRight, setCanScrollTagsRight] = useState(false);

  useDocumentHead({
    title: t("dataset.list.knowledgeSquare"),
  });

  const { data: tagsData } = useDatasetTags();
  const tags = tagsData ?? [];

  const squareQuery = useSquareDatasetsInfiniteQuery(
    {
      pageSize: PAGE_SIZE,
      keyword: debouncedKeyword || undefined,
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

  const updateTagScrollState = useCallback(() => {
    const container = tagScrollRef.current;
    if (!container) {
      setCanScrollTagsLeft(false);
      setCanScrollTagsRight(false);
      return;
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setCanScrollTagsLeft(container.scrollLeft > 4);
    setCanScrollTagsRight(maxScrollLeft - container.scrollLeft > 4);
  }, []);

  const scrollTagsBy = useCallback((direction: "left" | "right") => {
    const container = tagScrollRef.current;
    if (!container) return;

    const offset = Math.max(container.clientWidth * 0.75, 160);
    container.scrollBy({
      left: direction === "left" ? -offset : offset,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const container = tagScrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateTagScrollState();
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(container);
    if (container.firstElementChild instanceof HTMLElement) {
      resizeObserver.observe(container.firstElementChild);
    }

    window.addEventListener("resize", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateTagScrollState, tags.length]);

  useEffect(() => {
    updateTagScrollState();
  }, [tags, updateTagScrollState]);

  const isTagSelected = (tagId: string) => selectedTagId === tagId;
  const badgeClass = (selected: boolean) =>
    cn(
      "h-9 cursor-pointer px-4 font-medium text-nowrap sm:font-normal",
      selected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
    );

  return (
    <ScrollArea className="h-dvh" viewportClassName="[&_>div]:block!">
      <div className="flex w-full flex-col items-center">
        <div className="w-full max-w-4xl px-4 py-8 pt-12 sm:pt-20 md:px-6">
          <div className="bg-background sticky top-0 z-20 py-4">
            <div className="flex flex-col items-center justify-between gap-4 max-sm:items-start sm:flex-row sm:px-3">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl">{t("dataset.list.knowledgeSquare")}</h1>
                <p className="text-muted-foreground text-sm">{t("dataset.list.joinTip")}</p>
              </div>
              <div className="max-sm:w-full">
                <InputGroup className="rounded-full">
                  <InputGroupInput
                    placeholder={t("dataset.list.searchDatasets")}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>

            <div className="group relative mt-8 sm:px-3">
              <div
                className={cn(
                  "from-background via-background/80 pointer-events-none absolute inset-y-0 left-0 z-10 flex w-24 items-center bg-linear-to-r to-transparent transition-opacity duration-300",
                  canScrollTagsLeft ? "opacity-100" : "opacity-0",
                )}
              >
                <Button
                  type="button"
                  size="icon-xs"
                  className="border-border bg-background text-muted-foreground hover:bg-background hover:text-primary pointer-events-auto ml-2 flex size-8 items-center justify-center rounded-full border shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.05)] transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => scrollTagsBy("left")}
                >
                  <ChevronLeft className="size-3.5 stroke-3" />
                </Button>
              </div>

              <div
                className={cn(
                  "from-background via-background/80 pointer-events-none absolute inset-y-0 right-0 z-10 flex w-24 items-center justify-end bg-linear-to-l to-transparent transition-opacity duration-300",
                  canScrollTagsRight ? "opacity-100" : "opacity-0",
                )}
              >
                <Button
                  type="button"
                  size="icon-xs"
                  className="border-border bg-background text-muted-foreground hover:bg-background hover:text-primary pointer-events-auto mr-2 flex size-8 items-center justify-center rounded-full border shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.05)] transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => scrollTagsBy("right")}
                >
                  <ChevronRight className="size-3.5 stroke-3" />
                </Button>
              </div>

              <div ref={tagScrollRef} className="no-scrollbar overflow-x-auto scroll-smooth py-2">
                <div className="flex min-w-max flex-nowrap gap-2">
                  <Badge
                    className={badgeClass(selectedTagId === null)}
                    onClick={() => setSelectedTagId(null)}
                  >
                    {t("dataset.list.all")}
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
              </div>
            </div>
          </div>

          <div className="mt-6 sm:px-3">
            {squareQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">
                {t("dataset.list.noDatasets")}
              </p>
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
                    const displayName =
                      dataset.name ?? creator?.nickname ?? t("common.unknownUser");
                    const initial = displayName.slice(0, 1).toUpperCase();
                    const creatorLabel = creator?.nickname ?? t("common.anonymous");
                    const creatorInitial = creatorLabel.slice(0, 1).toUpperCase();
                    return (
                      <Item
                        key={dataset.id}
                        asChild
                        className="group/apps-item hover:bg-accent cursor-pointer px-0 transition-[padding]! hover:px-4"
                      >
                        <Link to={`/datasets/${dataset.id}`}>
                          <ItemMedia>
                            <Avatar className="size-10 rounded-lg after:rounded-lg">
                              <AvatarImage
                                className="rounded-lg"
                                src={dataset.coverUrl ?? creator?.avatar ?? undefined}
                              />
                              <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
                            </Avatar>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{dataset.name}</ItemTitle>
                            <ItemDescription className="line-clamp-1">
                              {dataset.description?.trim() || t("common.noDescription")}
                            </ItemDescription>
                            <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-1">
                                  <FileText className="size-3.5 shrink-0 opacity-70" />
                                  {dataset.documentCount ?? 0}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Users className="size-3.5 shrink-0 opacity-70" />
                                  {dataset.memberCount ?? 0}
                                </span>
                              </div>
                              <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
                                <Avatar className="size-4 shrink-0">
                                  <AvatarImage src={creator?.avatar ?? undefined} />
                                  <AvatarFallback className="text-[9px]">
                                    {creatorInitial || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{creatorLabel}</span>
                              </div>
                            </div>
                          </ItemContent>
                          <ItemActions className="opacity-0 group-hover/apps-item:opacity-100">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="rounded-full"
                              aria-label={t("dataset.list.enter")}
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
