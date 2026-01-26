import { ROUTES } from "@buildingai/constants/web";

import type { NavigationMenuItem } from "#ui/types";

import type { NavigationConfig } from "../../../../../buildingai-ui/app/components/console/page-link-picker/layout";

export function useNavigationMenu(navigationConfig?: Ref<NavigationConfig>) {
    const { t } = useI18n();

    const navigationItems = computed((): NavigationMenuItem[][] => {
        if (!navigationConfig?.value) return [[]];
        const items = navigationConfig.value.items.map((item) => ({
            label: item.title,
            icon: item.icon,
            // to: toAbsolutePath(item.link?.path || "/"),
            to: item.link?.path || "/",
            active:
                item.link?.path === useRoute().path ||
                item.link?.path === useRoute().meta.activePath,
            // target: item.link?.path?.startsWith("http") ? "_blank" : undefined,
            children: item.children?.map((child) => ({
                label: child.title,
                icon: child.icon,
                // to: toAbsolutePath(child.link?.path || "/"),
                to: child.link?.path || "/",
                // target: child.link?.path?.startsWith("http") ? "_blank" : undefined,
            })),
        }));

        return [
            [
                {
                    label: "导航菜单",
                    type: "label",
                },
                ...items,
            ],
        ];
    });

    const linkItems = computed((): NavigationMenuItem[] => [
        {
            label: t("layouts.menu.workspace"),
            icon: "i-lucide-layout-dashboard",
            target: "_self",
            // to: toAbsolutePath(ROUTES.CONSOLE),
            to: ROUTES.CONSOLE,
        },
    ]);

    const getNavigationMenuUI = (collapsed: boolean) => ({
        list: "navbar-menu",
        link: collapsed
            ? "justify-center py-3 hover:bg-secondary dark:hover:bg-surface-800 rounded-lg"
            : "justify-start hover:bg-secondary dark:hover:bg-surface-800 p-2 px-3 leading-6 rounded-lg",
        linkLeadingIcon: collapsed ? "size-5" : "size-4",
    });

    const getLinkMenuUI = (collapsed: boolean) => ({
        list: "navbar-other",
        link: collapsed
            ? "justify-center py-3 hover:bg-secondary dark:hover:bg-surface-800 rounded-lg"
            : "justify-start hover:bg-secondary dark:hover:bg-surface-800 p-2 px-3 leading-6 rounded-lg",
        linkLeadingIcon: collapsed ? "size-5" : "size-4",
    });

    return {
        navigationItems,
        linkItems,
        getNavigationMenuUI,
        getLinkMenuUI,
    };
}
