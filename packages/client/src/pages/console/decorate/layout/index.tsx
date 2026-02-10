import { IconLockFilled } from "@tabler/icons-react";
import { Copy, Plus, RotateCw, Share } from "lucide-react";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { DecorateLayoutSidebar } from "./_components/decorate-layout-sidebar";

const DecorateLayoutIndexPage = () => {
  return (
    <PageContainer className="h-inset relative flex flex-col rounded-lg border">
      <div className="flex items-center gap-4 border-b px-4 py-2">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full border border-red-500/10 bg-red-400"></div>
          <div className="size-2.5 rounded-full border border-yellow-400/20 bg-yellow-300"></div>
          <div className="size-2.5 rounded-full border border-gray-600/10 bg-green-500"></div>
        </div>

        <div className="flex flex-1 justify-center">
          <div className="bg-muted text-muted-foreground flex w-full max-w-xl items-center justify-between gap-1 rounded-md px-4 py-2 text-xs">
            <IconLockFilled className="size-4" />
            <span>https://www.buildingai.cc</span>
            <RotateCw className="size-4" />
          </div>
        </div>

        <div className="text-muted-foreground flex w-10.5 gap-3 md:w-fit">
          <Share className="hidden size-4 md:block" />
          <Plus className="hidden size-4 md:block" />
          <Copy className="hidden size-4 md:block" />
        </div>
      </div>

      <div className="relative h-full flex-1 overflow-hidden pl-64">
        <DecorateLayoutSidebar />
        <div className="flex h-full flex-col gap-4 p-4 max-sm:hidden">
          <div className="grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 hidden aspect-video rounded-xl sm:block" />
            <div className="bg-muted/50 hidden aspect-video rounded-xl xl:block" />
          </div>
          <div className="bg-muted/50 flex-1 rounded-xl" />
        </div>
      </div>
    </PageContainer>
  );
};

export default DecorateLayoutIndexPage;
