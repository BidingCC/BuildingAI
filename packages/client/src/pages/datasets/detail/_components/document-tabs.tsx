import { useI18n } from "@buildingai/i18n";
import { useDatasetsApplicationsQuery } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { cn } from "@buildingai/ui/lib/utils";
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
  const { t } = useI18n();
  const { dataset, activeTab, setActiveTab, canManageDocuments, dialog } =
    useDatasetDetailContext();

  const canManageMembers = Boolean(dataset && (dataset.isOwner || dataset.canManageDocuments));
  const { data: applicationsData } = useDatasetsApplicationsQuery(dataset?.id ?? "", undefined, {
    enabled: canManageMembers && !!dataset?.id,
  });
  const hasPendingApplications = Boolean(
    applicationsData?.items?.some((application) => application.status === "pending"),
  );

  return (
    <div className="flex items-center justify-between pb-3">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentTab)}>
        <TabsList>
          <TabsTrigger value="all">{t("dataset.document.all")}</TabsTrigger>
          <TabsTrigger value="text">{t("dataset.document.text")}</TabsTrigger>
          <TabsTrigger value="table">{t("dataset.document.table")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {!dataset ? (
        <DocumentTabsActionsSkeleton />
      ) : (
        <div className="flex items-center gap-2">
          {canManageDocuments && (
            <Button variant="outline" size="sm" onClick={() => dialog.open({ type: "upload" })}>
              <Upload className="size-4" />
              {t("dataset.document.uploadFile")}
            </Button>
          )}
          {canManageMembers && (
            <Button
              variant="outline"
              className="relative"
              size="sm"
              onClick={() => dialog.open({ type: "member" })}
            >
              <Users className="size-4" />
              {t("dataset.document.members")}
              {dataset.memberCount != null && (
                <span
                  className={cn("text-muted-foreground ml-1", hasPendingApplications && "mr-1")}
                >
                  {dataset.memberCount}
                </span>
              )}
              {hasPendingApplications && (
                <span
                  className="bg-destructive absolute top-1 right-1 ml-1 size-1.5 rounded-full"
                  aria-label={t("dataset.document.hasPendingApplication")}
                />
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
