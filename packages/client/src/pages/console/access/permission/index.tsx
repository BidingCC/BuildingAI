import {
  type GroupedPermissions,
  type Permission,
  type QueryPermissionListParams,
  usePermissionListQuery,
} from "@buildingai/services/console";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import { Input } from "@buildingai/ui/components/ui/input";
import { ChevronRightIcon, FolderIcon, Info, ShieldIcon } from "lucide-react";
import { useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

import { PageContainer } from "@/layouts/console/_components/page-container";

type PermissionGroupItemProps = {
  group: GroupedPermissions;
};

const PermissionGroupItem = ({ group }: PermissionGroupItemProps) => {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="group hover:bg-accent hover:text-accent-foreground h-9 w-full justify-start px-0 transition-[padding] hover:px-2 aria-expanded:px-2"
        >
          <ChevronRightIcon className="transition-transform group-data-[state=open]:rotate-90" />
          <FolderIcon />
          <span>{group.name}</span>
          <Badge variant="secondary" className="ml-auto">
            {group.permissions.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-8">
        {group.permissions.map((permission) => (
          <PermissionItem key={permission.id} permission={permission} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

type PermissionItemProps = {
  permission: Permission;
};

const PermissionItem = ({ permission }: PermissionItemProps) => {
  return (
    <div className="hover:bg-muted/50 group/permission-item flex h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm">
      <ShieldIcon className="text-muted-foreground size-4" />
      <span className="flex-1">{permission.name}</span>
      <code className="text-muted-foreground text-xs">{permission.code}</code>
      {permission.isDeprecated && (
        <Badge variant="destructive" className="text-xs">
          已废弃
        </Badge>
      )}
      <Button variant="ghost" size="icon-sm" className="size-6">
        <Info />
      </Button>
    </div>
  );
};

const AccessPermissionIndexPage = () => {
  const [params, setParams] = useState<QueryPermissionListParams>({
    isGrouped: true,
  });

  const { data } = usePermissionListQuery(params);

  const handleKeywordChange = useDebounceCallback((value: string) => {
    setParams((prev) => ({ ...prev, keyword: value || undefined }));
  }, 300);

  const handleGroupChange = useDebounceCallback((value: string) => {
    setParams((prev) => ({ ...prev, group: value || undefined }));
  }, 300);

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col gap-4">
        <div className="bg-background sticky top-0 z-2 grid grid-cols-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <Input
            placeholder="搜索权限名称"
            className="text-sm"
            onChange={(e) => handleKeywordChange(e.target.value)}
          />
          <Input
            placeholder="搜索权限分组"
            className="text-sm"
            onChange={(e) => handleGroupChange(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          {(data as GroupedPermissions[] | undefined)?.map((group) => (
            <PermissionGroupItem group={group} key={group.code} />
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default AccessPermissionIndexPage;
