"use client";

import { useAppsDecorateQuery, useSetAppsDecorateMutation } from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
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
};

export function DecorateSettingsDialog({ open, onOpenChange }: DecorateSettingsDialogProps) {
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
    },
    onError: (e) => {
      toast.error(`保存失败: ${e.message}`);
    },
  });

  useEffect(() => {
    if (!open || !config) return;
    setEnabled(config.enabled);
    if (config.heroImageUrl || config.link?.path) {
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
    const first = banners[0];
    if (!first) return;
    setMutation.mutate({
      enabled,
      title: "",
      link: { path: first.linkUrl || undefined },
      heroImageUrl: first.imageUrl,
    });
    if (banners.length > 1) {
      toast.info("当前仅保存第一条 Banner，多轮播需后端支持后可扩展");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>设置装修位</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
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
                disabled={isLoading}
              >
                <Plus className="size-4" />
                添加
              </Button>
            </div>
            <Carousel setApi={setApi} opts={{ align: "start" }} className="w-full">
              <CarouselContent className="-ml-2">
                {banners.map((banner, index) => (
                  <CarouselItem key={index} className="basis-full pl-2">
                    <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
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
                      <div className="grid gap-2">
                        <Label className="text-xs">图片地址</Label>
                        <Input
                          placeholder="请输入图片 URL"
                          value={banner.imageUrl}
                          onChange={(e) => handleBannerChange(index, "imageUrl", e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs">跳转链接</Label>
                        <Input
                          placeholder="如 /apps/xxx 或 https://..."
                          value={banner.linkUrl}
                          onChange={(e) => handleBannerChange(index, "linkUrl", e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
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
