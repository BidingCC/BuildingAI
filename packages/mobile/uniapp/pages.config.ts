// import { loadExtensionSubPackages } from "@buildingai/vite-plugins";
import { defineUniPages } from "@uni-helper/vite-plugin-uni-pages";

export default defineUniPages({
    middleware: ["global"],
    pages: [],
    easycom: {
        custom: {
            "^(?!z-paging-refresh|z-paging-load-more)z-paging(.*)":
                "z-paging/components/z-paging$1/z-paging$1.vue",
        },
    },
    globalStyle: {
        backgroundColor: "@bgColor",
        backgroundColorBottom: "@bgColorBottom",
        backgroundColorTop: "@bgColorTop",
        backgroundTextStyle: "@bgTxtStyle",
        navigationBarBackgroundColor: "@navBgColor",
        navigationBarTextStyle: "@navTxtStyle",
        navigationBarTitleText: "BuildingAI",
        navigationStyle: "custom",
    },
    tabBar: {
        custom: true,
        customize: true,
        backgroundColor: "@tabBgColor",
        borderStyle: "@tabBorderStyle",
        color: "@tabFontColor",
        selectedColor: "@tabSelectedColor",
        list: [
            {
                pagePath: "pages/chat/index",
                iconPath: "static/icons/tabbar/home.png",
                selectedIconPath: "static/icons/tabbar/home-active.png",
                text: "Home",
                // text: "‎",
            },
            {
                pagePath: "pages/apps/index",
                iconPath: "static/icons/tabbar/apps.png",
                selectedIconPath: "static/icons/tabbar/apps-active.png",
                text: "Apps",
            },
            {
                pagePath: "pages/user/index",
                iconPath: "static/icons/tabbar/user.png",
                selectedIconPath: "static/icons/tabbar/user-active.png",
                text: "User",
            },
        ],
    },
    // 动态加载扩展分包
    subPackages: [
        {
            root: "async-components/",
            pages: [{ path: "index" }],
        },
        // ...(await loadExtensionSubPackages("../../../extensions")),
    ],
    preloadRule: {
        "async-components/index": {
            network: "all",
            packages: ["async-components"],
        },
    },
});
