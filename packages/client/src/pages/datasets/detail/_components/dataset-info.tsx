import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Separator } from "@buildingai/ui/components/ui/separator";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";

import { useDatasetDetailContext } from "../context";

function DatasetInfoSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-16 rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Separator orientation="vertical" className="h-3" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function DatasetInfo() {
  const { dataset } = useDatasetDetailContext();

  if (!dataset) {
    return <DatasetInfoSkeleton />;
  }

  const title = dataset.name ?? "";
  const avatar = dataset.coverUrl ?? undefined;

  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-16 rounded-xl after:rounded-xl">
        <AvatarImage src={avatar} />
        <AvatarFallback className="rounded-xl text-lg">
          {(title || "库").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          {dataset.creator && (
            <div className="flex items-center gap-2">
              <Avatar className="size-4 rounded-xs after:rounded-xl">
                <AvatarImage className="rounded-xs" src={dataset.creator.avatar ?? ""} />
                <AvatarFallback className="rounded-xl text-sm">
                  {dataset.creator.nickname?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-muted-foreground text-sm">{dataset.creator.nickname} 创建</p>
            </div>
          )}
          <Separator orientation="vertical" className="h-3" />
          {dataset.memberCount != null && (
            <p className="text-muted-foreground text-sm">{dataset.memberCount} 人加入</p>
          )}
        </div>
      </div>
    </div>
  );
}
