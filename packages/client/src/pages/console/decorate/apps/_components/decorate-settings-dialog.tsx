"use client";

import { type PagePathInfo, parsePageModules } from "@buildingai/hooks";
import { useI18n } from "@buildingai/i18n";
import { useAppsDecorateQuery, useSetAppsDecorateMutation } from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@buildingai/ui/components/ui/carousel";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@buildingai/ui/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type BannerItem = {
  imageUrl: string;
  linkUrl: string;
  linkType: "system" | "custom";
  linkComponent?: string | null;
};

const pageModules = import.meta.glob("/src/pages/**/index.tsx", { eager: true });
const pagePaths = parsePageModules(pageModules, {
  exclude: ["/console/", "/_", "/install"],
});

type DecorateSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function DecorateSettingsDialog({
  open,
  onOpenChange,
  onSuccess,
}: DecorateSettingsDialogProps) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [banners, setBanners] = useState<BannerItem[]>([
    { imageUrl: "", linkUrl: "", linkType: "custom", linkComponent: null },
  ]);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const count = banners.length;

  const { data: config, isLoading } = useAppsDecorateQuery({ enabled: open });
  const setMutation = useSetAppsDecorateMutation({
    onSuccess: () => {
      toast.success(t("decorate.apps.saveSuccess"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => {
      toast.error(t("decorate.apps.saveFailed", { message: e.message }));
    },
  });

  useEffect(() => {
    if (!open || !config) return;
    setEnabled(config.enabled);

    // 优先使用 banners 字段，如果没有则使用 heroImageUrl（向后兼容）
    if (config.banners && config.banners.length > 0) {
      setBanners(
        config.banners.map((banner) => {
          const linkUrl = banner.linkUrl || "";
          const matched = pagePaths.find((p) => p.path === linkUrl);
          return {
            imageUrl: banner.imageUrl || "",
            linkUrl,
            linkType: (matched ? "system" : "custom") as "system" | "custom",
            linkComponent: matched?.component ?? null,
          };
        }),
      );
    } else if (config.heroImageUrl || config.link?.path) {
      const linkUrl = config.link?.path ?? "";
      const matched = pagePaths.find((p) => p.path === linkUrl);
      setBanners([
        {
          imageUrl: config.heroImageUrl ?? "",
          linkUrl,
          linkType: (matched ? "system" : "custom") as "system" | "custom",
          linkComponent: matched?.component ?? null,
        },
      ]);
    } else {
      setBanners([{ imageUrl: "", linkUrl: "", linkType: "custom", linkComponent: null }]);
    }
  }, [open, config]);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => setCurrent(api.selectedScrollSnap() + 1));
    api.on("reInit", () => setCurrent(api.selectedScrollSnap() + 1));
  }, [api]);

  const handleAddBanner = () => {
    setBanners((prev) => [
      ...prev,
      { imageUrl: "", linkUrl: "", linkType: "custom", linkComponent: null },
    ]);
  };

  const handleRemoveBanner = (index: number) => {
    if (banners.length <= 1) return;
    setBanners((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBannerChange = (
    index: number,
    updates: Partial<Pick<BannerItem, "imageUrl" | "linkUrl" | "linkType" | "linkComponent">>,
  ) => {
    setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const handleSave = () => {
    // 过滤出有效的 banner（有图片URL的）
    const validBanners = banners
      .filter((banner) => banner.imageUrl.trim())
      .map((banner) => ({
        imageUrl: banner.imageUrl.trim(),
        linkUrl: banner.linkUrl.trim() || undefined,
        linkType: banner.linkType,
      }));

    if (validBanners.length === 0) {
      toast.error(t("decorate.apps.addBannerError"));
      return;
    }

    // 构建提交数据，保留现有 title 和 description
    const dto = {
      enabled,
      title: config?.title ?? "",
      description: config?.description ?? "",
      banners: validBanners,
    };

    setMutation.mutate(dto);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-xl flex-col">
        <DialogHeader>
          <DialogTitle>{t("decorate.apps.bannerSettings")}</DialogTitle>
        </DialogHeader>
        <div ref={setContainer} className="flex min-h-0 flex-1 flex-col gap-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="ad-enabled" className="flex-1">
              {t("decorate.apps.enableAd")}
            </Label>
            <Switch
              id="ad-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>{t("decorate.apps.bannerSettings")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBanner}
                disabled={isLoading || count >= 5}
              >
                <Plus className="size-4" />
                {t("decorate.apps.addBanner")}
              </Button>
            </div>
            <Carousel setApi={setApi} opts={{ align: "start" }} className="mx-auto w-[74%]">
              <CarouselContent>
                {banners.map((banner, index) => (
                  <CarouselItem key={index} className="basis-full">
                    <div className="border-border flex min-w-0 flex-col gap-3 rounded-lg border p-3">
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveBanner(index)}
                          disabled={banners.length <= 1 || isLoading}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <ImageUpload
                        className="aspect-4/1 w-full!"
                        value={banner.imageUrl || undefined}
                        onChange={(url) => handleBannerChange(index, { imageUrl: url ?? "" })}
                        disabled={isLoading}
                      />
                      <div className="grid min-w-0 gap-2">
                        <Label className="text-xs">{t("decorate.apps.linkType")}</Label>
                        <Select
                          value={banner.linkType}
                          onValueChange={(v) => {
                            handleBannerChange(index, {
                              linkType: v as "system" | "custom",
                              linkComponent: v === "system" ? null : undefined,
                              linkUrl: v === "system" ? "" : banner.linkUrl,
                            });
                          }}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("decorate.apps.linkType")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system">{t("decorate.apps.systemPage")}</SelectItem>
                            <SelectItem value="custom">{t("decorate.apps.customLink")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {banner.linkType === "system" && (
                        <div className="grid min-w-0 gap-2">
                          <Label className="text-xs">{t("decorate.apps.componentPath")}</Label>
                          <Combobox<PagePathInfo>
                            value={
                              pagePaths.find((p) => p.component === banner.linkComponent) ?? null
                            }
                            onValueChange={(item) => {
                              handleBannerChange(index, {
                                linkComponent: item?.component ?? null,
                                linkUrl: item?.path ?? "",
                              });
                            }}
                            items={pagePaths}
                            itemToStringValue={(item) => item.label}
                          >
                            <ComboboxInput
                              placeholder={t("decorate.apps.searchPath")}
                              className="w-full min-w-0"
                              disabled={isLoading}
                            />
                            <ComboboxContent container={container}>
                              <ComboboxEmpty>{t("decorate.apps.noMatchPath")}</ComboboxEmpty>
                              <ComboboxList>
                                {(item) => (
                                  <ComboboxItem key={item.component} value={item}>
                                    {item.label}
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        </div>
                      )}
                      {banner.linkType === "custom" && (
                        <div className="grid min-w-0 gap-2">
                          <Label className="text-xs">{t("decorate.apps.path")}</Label>
                          <Input
                            placeholder={t("decorate.apps.pathPlaceholder")}
                            value={banner.linkUrl}
                            onChange={(e) => handleBannerChange(index, { linkUrl: e.target.value })}
                            disabled={isLoading}
                            className="min-w-0"
                          />
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
            <div className="text-muted-foreground py-2 text-center text-sm">
              {current}/{count}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("decorate.apps.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={setMutation.isPending || isLoading}>
              {setMutation.isPending ? t("decorate.apps.saving") : t("decorate.apps.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
