import { definePageMeta, useDocumentHead } from "@buildingai/hooks";
import { useI18n } from "@buildingai/i18n";
import {
  type AgentDecorateBannerItem,
  useAgentTags,
  useWebAgentDecorateItemsInfiniteQuery,
  useWebAgentDecorateQuery,
} from "@buildingai/services/web";
import { InfiniteScroll } from "@buildingai/ui/components/infinite-scroll";
import { AspectRatio } from "@buildingai/ui/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Carousel, CarouselContent, CarouselItem } from "@buildingai/ui/components/ui/carousel";
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
// import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import Autoplay from "embla-carousel-autoplay";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Search,
  User,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDebounceValue } from "usehooks-ts";

// import { ProviderIcon } from "../../components/provider-icons";

const PAGE_SIZE = 20;

export const meta = definePageMeta({
  title: "agent.square.title",
  description: "agent.square.description",
  icon: "bot",
});

const AgentsIndexPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const tagScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollTagsLeft, setCanScrollTagsLeft] = useState(false);
  const [canScrollTagsRight, setCanScrollTagsRight] = useState(false);

  useDocumentHead({
    title: t("agent.square.title"),
  });

  const { data: decorateConfig } = useWebAgentDecorateQuery();
  const { data: tagsData } = useAgentTags();
  const tags = tagsData ?? [];

  const squareQuery = useWebAgentDecorateItemsInfiniteQuery(
    {
      pageSize: PAGE_SIZE,
      keyword: debouncedKeyword || undefined,
      tagId: selectedTagId || undefined,
    },
    { enabled: true },
  );

  const items = useMemo(
    () => squareQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [squareQuery.data?.pages],
  );
  const hasNextPage = squareQuery.hasNextPage ?? false;
  const isFetchingNextPage = squareQuery.isFetchingNextPage;

  const banners = useMemo(() => {
    if (!decorateConfig?.enabled) return [];

    if (decorateConfig.banners && decorateConfig.banners.length > 0) {
      return decorateConfig.banners.filter((banner) => banner.imageUrl);
    }

    if (decorateConfig.heroImageUrl) {
      return [
        {
          imageUrl: decorateConfig.heroImageUrl,
          linkUrl: decorateConfig.link?.path,
          linkType: "system" as const,
        },
      ];
    }

    return [];
  }, [decorateConfig]);

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

  const openAgentChat = (agent: { id: string }) => {
    window.location.assign(`/agents/${agent.id}/chat`);
  };

  const handleBannerClick = (banner: AgentDecorateBannerItem) => {
    const path = banner.linkUrl?.trim();
    if (!path) return;
    if (banner.linkType === "custom") {
      window.open(path, "_blank");
      return;
    }
    navigate(path);
  };

  return (
    <ScrollArea className="h-dvh" viewportClassName="[&_>div]:block!">
      <div className="flex w-full flex-col items-center">
        <div className="bg-background sticky top-0 z-20 flex h-13 w-full items-center px-2">
          <SidebarTrigger className="md:hidden" />
          <div className="ml-auto">
            <Button variant="ghost" size="sm" className="ml-auto" asChild>
              <Link to="/agents/workspace">
                <User />
                {t("agent.workspace.title")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="w-full max-w-4xl px-4 py-8 pt-12 sm:pt-20 md:px-6">
          <div className="bg-background sticky top-12 z-20 pb-4">
            <div className="flex flex-col items-center justify-between gap-4 max-sm:items-start sm:flex-row sm:px-3">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl">{decorateConfig?.title || t("agent.square.title")}</h1>
                <p className="text-muted-foreground text-sm">
                  {decorateConfig?.description || t("agent.square.description")}
                </p>
              </div>
              <div className="max-sm:w-full">
                <InputGroup className="rounded-full">
                  <InputGroupInput
                    placeholder={t("agent.square.searchPlaceholder")}
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
                    {t("agent.square.all")}
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

          {banners.length > 0 ? (
            <Carousel
              className="mt-8 w-full rounded-2xl sm:rounded-4xl"
              plugins={[
                Autoplay({
                  delay: 3000,
                }),
              ]}
            >
              <CarouselContent>
                {banners.map((banner, index) => (
                  <CarouselItem key={`${banner.imageUrl}-${index}`}>
                    <div
                      className={cn(
                        "block w-full text-left",
                        banner.linkUrl ? "cursor-pointer" : "cursor-default",
                      )}
                      onClick={() => handleBannerClick(banner)}
                    >
                      <AspectRatio ratio={4 / 1}>
                        <img
                          src={banner.imageUrl}
                          alt={`agent-square-banner-${index + 1}`}
                          className="h-full w-full rounded-2xl object-cover"
                        />
                      </AspectRatio>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : null}

          <div className="mt-6 sm:px-3">
            {squareQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">
                {t("agent.square.noAgents")}
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
                  {items.map((agent) => {
                    const creator = agent.creator;
                    const displayName = creator?.nickname ?? t("agent.type.unknown");
                    const initial = displayName.slice(0, 1).toUpperCase();
                    const creatorLabel = creator?.nickname ?? t("agent.square.anonymous");
                    const creatorInitial = creatorLabel.slice(0, 1).toUpperCase();
                    return (
                      <Item
                        key={agent.id}
                        className="group/apps-item hover:bg-accent cursor-pointer px-0 transition-[padding] hover:px-4"
                        onClick={() => openAgentChat(agent)}
                      >
                        <ItemMedia>
                          <Avatar className="size-10">
                            <AvatarImage src={agent.avatar ?? creator?.avatar ?? undefined} />
                            <AvatarFallback>{initial || <Bot />}</AvatarFallback>
                          </Avatar>
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{agent.name}</ItemTitle>
                          {/* <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
                            <Avatar className="size-4 shrink-0">
                              <AvatarImage src={creator?.avatar ?? undefined} />
                              <AvatarFallback className="text-[9px]">
                                {creatorInitial || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{creatorLabel}</span>
                          </div> */}
                          <ItemDescription className="line-clamp-1">
                            {agent.description?.toString().trim() ||
                              t("agent.square.noDescription")}
                          </ItemDescription>
                          <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="inline-flex items-center gap-1">
                                <MessageSquare className="size-3.5 shrink-0 opacity-70" />
                                {agent.messageCount}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Users className="size-3.5 shrink-0 opacity-70" />
                                {agent.userCount}
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
                            {/* {agent.primaryModel ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="border-border bg-background shrink-0 rounded-full border p-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ProviderIcon
                                      provider={agent.primaryModel.provider ?? undefined}
                                      iconUrl={agent.primaryModel.iconUrl ?? undefined}
                                      className="size-4 rounded-full object-cover [&_svg]:size-4"
                                      fallback={
                                        <span className="bg-primary/10 flex size-4 items-center justify-center rounded-full">
                                          <Bot className="text-primary size-3.5" />
                                        </span>
                                      }
                                    />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>{agent.primaryModel.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : null} */}
                          </div>
                        </ItemContent>
                        <ItemActions className="opacity-0 group-hover/apps-item:opacity-100">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="rounded-full"
                            aria-label={t("agent.square.enter")}
                            onClick={(e) => {
                              e.stopPropagation();
                              openAgentChat(agent);
                            }}
                          >
                            <ChevronRight />
                          </Button>
                        </ItemActions>
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

export default AgentsIndexPage;
