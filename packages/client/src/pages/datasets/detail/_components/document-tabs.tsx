import { Button } from "@buildingai/ui/components/ui/button";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { Upload, Users } from "lucide-react";

import type { DocumentTab } from "../context";
import { useDatasetDetailContext } from "../context";

function DocumentTabsActionsSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-9 w-16" />
    </div>
  );
}

export function DocumentTabs() {
  const { dataset, activeTab, setActiveTab, canManageDocuments, dialog } =
    useDatasetDetailContext();

  return (
    <div className="flex items-center justify-between pb-3">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentTab)}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="text">文本</TabsTrigger>
          <TabsTrigger value="table">表格</TabsTrigger>
        </TabsList>
      </Tabs>

      {!dataset ? (
        <DocumentTabsActionsSkeleton />
      ) : (
        <div className="flex items-center gap-2">
          {canManageDocuments && (
            <Button variant="outline" size="sm" onClick={() => dialog.open({ type: "upload" })}>
              <Upload className="size-4" />
              上传文件
            </Button>
          )}
          {(dataset.isOwner || dataset.canManageDocuments) && (
            <Button variant="outline" size="sm" onClick={() => dialog.open({ type: "member" })}>
              <Users className="size-4" />
              成员
              {dataset.memberCount != null && (
                <span className="text-muted-foreground ml-1">{dataset.memberCount}</span>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
