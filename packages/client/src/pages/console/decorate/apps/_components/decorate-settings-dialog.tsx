"use client";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type BannerItem = { imageUrl: string; linkUrl: string };

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
  const [enabled, setEnabled] = useState(false);
  const [banners, setBanners] = useState<BannerItem[]>([{ imageUrl: "", linkUrl: "" }]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const count = banners.length;

  const { data: config, isLoading } = useAppsDecorateQuery({ enabled: open });
  const setMutation = useSetAppsDecorateMutation({
    onSuccess: () => {
      toast.success("保存成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => {
      toast.error(`保存失败: ${e.message}`);
    },
  });

  useEffect(() => {
    if (!open || !config) return;
    setEnabled(config.enabled);

    // 优先使用 banners 字段，如果没有则使用 heroImageUrl（向后兼容）
    if (config.banners && config.banners.length > 0) {
      setBanners(
        config.banners.map((banner) => ({
          imageUrl: banner.imageUrl || "",
          linkUrl: banner.linkUrl || "",
        })),
      );
    } else if (config.heroImageUrl || config.link?.path) {
      // 向后兼容：从 heroImageUrl 和 link 转换
      setBanners([
        {
          imageUrl: config.heroImageUrl ?? "",
          linkUrl: config.link?.path ?? "",
        },
      ]);
    } else {
      setBanners([{ imageUrl: "", linkUrl: "" }]);
    }
  }, [open, config]);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => setCurrent(api.selectedScrollSnap() + 1));
    api.on("reInit", () => setCurrent(api.selectedScrollSnap() + 1));
  }, [api]);

  const handleAddBanner = () => {
    setBanners((prev) => [...prev, { imageUrl: "", linkUrl: "" }]);
  };

  const handleRemoveBanner = (index: number) => {
    if (banners.length <= 1) return;
    setBanners((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBannerChange = (index: number, field: keyof BannerItem, value: string) => {
    setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSave = () => {
    // 过滤出有效的 banner（有图片URL的）
    const validBanners = banners
      .filter((banner) => banner.imageUrl.trim())
      .map((banner) => ({
        imageUrl: banner.imageUrl.trim(),
        linkUrl: banner.linkUrl.trim() || undefined,
      }));

    if (validBanners.length === 0) {
      toast.error("请至少添加一张有效的 Banner 图片");
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
          <DialogTitle>设置装修位</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="ad-enabled" className="flex-1">
              启用广告位
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
              <Label>轮播图 Banner 设置</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBanner}
                disabled={isLoading || count >= 5}
              >
                <Plus className="size-4" />
                添加
              </Button>
            </div>
            <Carousel setApi={setApi} opts={{ align: "start" }} className="mx-auto w-[79%]">
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
                      <div className="bg-muted/50 relative aspect-20/8 w-full overflow-hidden rounded-lg">
                        <div className="text-muted-foreground absolute inset-0 z-0 flex h-full w-full items-center justify-center">
                          <ImagePlus className="size-10" />
                        </div>
                        {banner.imageUrl ? (
                          <img
                            src={banner.imageUrl}
                            alt=""
                            className="absolute inset-0 z-10 h-full w-full object-cover object-center"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="grid min-w-0 gap-2">
                        <Label className="text-xs">图片地址</Label>
                        <Input
                          placeholder="请输入图片 URL"
                          value={banner.imageUrl}
                          onChange={(e) => handleBannerChange(index, "imageUrl", e.target.value)}
                          disabled={isLoading}
                          className="min-w-0"
                        />
                      </div>
                      <div className="grid min-w-0 gap-2">
                        <Label className="text-xs">跳转链接</Label>
                        <Input
                          placeholder="如 /apps/xxx 或 https://..."
                          value={banner.linkUrl}
                          onChange={(e) => handleBannerChange(index, "linkUrl", e.target.value)}
                          disabled={isLoading}
                          className="min-w-0"
                        />
                      </div>
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
              取消
            </Button>
            <Button onClick={handleSave} disabled={setMutation.isPending || isLoading}>
              {setMutation.isPending ? "保存中…" : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
