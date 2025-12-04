import { getPageTitle, tabBarList } from "virtual:pages-meta";

export function updateTabBarTitles(t: (key: string) => string) {
    tabBarList.forEach((item: { pagePath: string; index: number }) => {
        try {
            const pageTitle = getPageTitle(item.pagePath);
            if (pageTitle) {
                uni.setTabBarItem({
                    index: item.index,
                    text: t(pageTitle),
                });
            }
        } catch {
            // ignore
        }
    });
}

export function setTabBarTitle() {
    // TODO: set tab bar
}
