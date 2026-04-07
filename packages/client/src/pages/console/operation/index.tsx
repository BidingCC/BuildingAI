import { useI18n } from "@buildingai/i18n";
import { useAuthStore } from "@buildingai/stores";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Card, CardContent, CardDescription, CardTitle } from "@buildingai/ui/components/ui/card";
import { useNavigate } from "react-router-dom";

import { PageContainer } from "@/layouts/console/_components/page-container";

import type { SidebarConfig } from "./_config/sidebar-config";
import { sidebarConfigMap } from "./_config/sidebar-config";

/**
 * 营销工具页面
 * 动态展示所有配置的营销工具
 */
export default function Operation() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { userInfo } = useAuthStore((state) => state.auth);

  const handleCardClick = (toolKey: string, config: SidebarConfig) => {
    const userPermissions = userInfo?.permissionsCodes ?? [];
    const isRoot = !!userInfo?.isRoot;

    const firstAccessibleMenuItem = config.menuItems.find((item) => {
      if (isRoot) {
        return true;
      }

      const permissions = Array.isArray(item.permissions) ? item.permissions : [item.permissions];
      return permissions.some((permission) => userPermissions.includes(permission));
    });

    if (firstAccessibleMenuItem) {
      navigate(`/console/operation/${toolKey}/${firstAccessibleMenuItem.path}`);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-4 px-4">
        <h1 className="text-lg font-semibold">{t("operation.title")}</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Object.entries(sidebarConfigMap).map(([toolKey, config]) => {
            const permissions = config.menuItems.flatMap((item) =>
              Array.isArray(item.permissions) ? item.permissions : [item.permissions],
            );

            return (
              <PermissionGuard key={toolKey} permissions={permissions} any>
                <Card
                  onClick={() => handleCardClick(toolKey, config)}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex items-center gap-4">
                    <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-lg">
                      <config.icon className="text-primary size-8" />
                    </div>
                    <div>
                      <CardTitle>{t(config.title)}</CardTitle>
                      <CardDescription>{t(config.description)}</CardDescription>
                    </div>
                  </CardContent>
                </Card>
              </PermissionGuard>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
